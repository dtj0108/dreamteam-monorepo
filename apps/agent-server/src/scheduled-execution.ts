/**
 * Scheduled Execution Handler for Express
 *
 * Handles scheduled task execution using Vercel AI SDK with MCP tools.
 * Supports all AI providers (Anthropic, OpenAI, xAI, Google, etc.).
 * This runs on Railway (persistent process) to avoid Vercel's serverless timeout limits.
 *
 * Called by admin cron endpoint when scheduled tasks are due.
 */

import type { Request, Response } from "express"
import { generateText, stepCountIs } from "ai"

// AI SDK 6 message type
type CoreMessage = { role: "user" | "assistant" | "system"; content: string }
import { z } from "zod"
import { type MCPClientInstance } from "./lib/mcp-client.js"
import { mcpClientPool } from "./lib/mcp-client-pool.js"
import { getModel, getApiKeyEnvVar, inferProviderFromModel } from "./lib/ai-providers.js"
import { createAdminClient } from "./lib/supabase.js"
import { applyRulesToPrompt, type AgentRule } from "./lib/agent-rules.js"
import { detectHallucination, formatHallucinationResult, type HallucinationCheckResult } from "./lib/hallucination-detection.js"
import { formatTimeContext } from "./lib/time-context.js"
import { sendAgentServerErrorEmail } from "./lib/error-email.js"

type AuditContext = {
  ipAddress?: string
  userAgent?: string
}

function getRequestAuditContext(req: Request): AuditContext {
  const forwardedFor = req.headers["x-forwarded-for"]
  const realIp = req.headers["x-real-ip"]
  const ipAddress = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(",")[0]?.trim() || (Array.isArray(realIp) ? realIp[0] : realIp)

  const userAgentHeader = req.headers["user-agent"]
  const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader

  return {
    ipAddress: ipAddress || undefined,
    userAgent: userAgent || undefined,
  }
}

async function logAuditEvent(
  supabase: ReturnType<typeof createAdminClient>,
  event: {
    action: string
    resourceType: string
    resourceId: string
    workspaceId?: string | null
    userId?: string | null
    details?: Record<string, unknown>
    context?: AuditContext
  }
): Promise<void> {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      action: event.action,
      resource_type: event.resourceType,
      resource_id: event.resourceId,
      workspace_id: event.workspaceId || null,
      user_id: event.userId || null,
      details: event.details || null,
      ip_address: event.context?.ipAddress || null,
      user_agent: event.context?.userAgent || null,
    })

    if (error) {
      console.error("[AuditLog] Failed to log audit event:", error)
    }
  } catch (error) {
    console.error("[AuditLog] Exception logging audit event:", error)
  }
}

type ScheduleContext = {
  scheduleId: string | null
  scheduleName: string | null
  scheduleTimezone: string
  scheduleWorkspaceId: string | null
}

function unwrapSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

async function loadScheduleContext(
  supabase: ReturnType<typeof createAdminClient>,
  executionId: string
): Promise<ScheduleContext> {
  try {
    const { data: execution } = await supabase
      .from("agent_schedule_executions")
      .select("schedule_id, schedule:agent_schedules(id, name, timezone, workspace_id)")
      .eq("id", executionId)
      .single()

    const schedule = unwrapSingle(execution?.schedule as {
      id?: string
      name?: string
      timezone?: string
      workspace_id?: string
    } | null)

    return {
      scheduleId: execution?.schedule_id || null,
      scheduleName: schedule?.name || null,
      scheduleTimezone: schedule?.timezone || "UTC",
      scheduleWorkspaceId: schedule?.workspace_id || null,
    }
  } catch (error) {
    console.warn("[Scheduled Execution] Failed to load schedule context:", error)
    return {
      scheduleId: null,
      scheduleName: null,
      scheduleTimezone: "UTC",
      scheduleWorkspaceId: null,
    }
  }
}

// Output config schema for controlling response style
const outputConfigSchema = z.object({
  tone: z.enum(['friendly', 'professional', 'concise']).optional(),
  format: z.enum(['conversational', 'bullet_points', 'structured']).optional(),
  custom_instructions: z.string().optional(),
}).optional()

// Request body schema
const requestSchema = z.object({
  executionId: z.string().uuid(),
  agentId: z.string().uuid(),
  taskPrompt: z.string(),
  workspaceId: z.string().uuid().optional(),
  outputConfig: outputConfigSchema,
  profileId: z.string().uuid().optional(), // Schedule creator's profile_id for MCP authorization
  simulatedTime: z.string().datetime().optional(), // For time-travel simulations: the scheduled run time
})

type OutputConfig = z.infer<typeof outputConfigSchema>

/**
 * Build output instructions based on output_config.
 * These instructions guide the AI on HOW to present its response.
 */
function buildOutputInstructions(outputConfig: OutputConfig): string {
  // Default human-like behavior when no config or empty config
  if (!outputConfig || Object.keys(outputConfig).length === 0) {
    return `
## Response Style
- Write naturally, as if messaging a colleague
- Don't start by restating the task you were asked to do
- Be conversational, not robotic or templated
- Focus on what matters most, then details if needed
- Skip unnecessary preamble like "Here is the report" or "I have completed the task"`
  }

  const parts: string[] = ['## Response Style']

  // Tone instruction
  if (outputConfig.tone) {
    switch (outputConfig.tone) {
      case 'friendly':
        parts.push('- Use a warm, friendly tone - like messaging a colleague')
        parts.push('- It\'s okay to be casual and personable')
        break
      case 'professional':
        parts.push('- Use a professional, polished tone')
        parts.push('- Keep language clear and business-appropriate')
        break
      case 'concise':
        parts.push('- Be extremely concise - get to the point immediately')
        parts.push('- Minimize extra words and explanations')
        break
    }
  }

  // Format instruction
  if (outputConfig.format) {
    switch (outputConfig.format) {
      case 'conversational':
        parts.push('- Write in natural paragraphs, like a message')
        parts.push('- Avoid rigid structure or templates')
        break
      case 'bullet_points':
        parts.push('- Use bullet points for easy scanning')
        parts.push('- Keep each point brief')
        break
      case 'structured':
        parts.push('- Use clear sections with headers')
        parts.push('- Organize information logically')
        break
    }
  }

  // Always add these defaults
  parts.push('- Don\'t start by restating the task you were asked to do')
  parts.push('- Skip unnecessary preamble like "Here is the report"')

  // Custom instructions override/add to the above
  if (outputConfig.custom_instructions) {
    parts.push('')
    parts.push('Additional instructions:')
    parts.push(outputConfig.custom_instructions)
  }

  return parts.join('\n')
}

/**
 * Load agent configuration from admin tables
 */
async function loadAgentConfig(supabase: ReturnType<typeof createAdminClient>, agentId: string) {
  // Load agent with all relations
  const { data: agent, error } = await supabase
    .from("ai_agents")
    .select(`
      *,
      tools:ai_agent_tools(
        tool_id,
        config,
        tool:agent_tools(id, name, description, is_enabled)
      ),
      skills:ai_agent_skills(
        skill_id,
        skill:agent_skills(id, name, description, skill_content, is_enabled)
      ),
      rules:agent_rules(*)
    `)
    .eq("id", agentId)
    .eq("is_enabled", true)
    .single()

  if (error || !agent) {
    return { agent: null, error: error?.message || "Agent not found" }
  }

  return { agent, error: null }
}

// NOTE: resolveAgentProfileId was removed because it queried a non-existent 'agents' table.
// MCP authorization now uses the profileId passed from the cron endpoint, which is the
// schedule creator's profile_id from agent_schedules.created_by.

/**
 * Build system prompt with rules and skills
 */
function buildSystemPrompt(agent: any): string {
  let systemPrompt = agent.system_prompt || getDefaultSystemPrompt()

  // Apply rules
  if (agent.rules && agent.rules.length > 0) {
    const enabledRules = agent.rules.filter((r: any) => r.is_enabled)
    if (enabledRules.length > 0) {
      systemPrompt = applyRulesToPrompt(systemPrompt, enabledRules as AgentRule[])
    }
  }

  // Add skills
  if (agent.skills && agent.skills.length > 0) {
    const activeSkills = agent.skills
      .filter((s: any) => s.skill?.is_enabled !== false)
      .map((s: any) => s.skill)
      .filter(Boolean)

    if (activeSkills.length > 0) {
      const skillsContent = activeSkills
        .map((skill: any) => `## Skill: ${skill.name}\n\n${skill.skill_content}`)
        .join("\n\n---\n\n")

      systemPrompt = `${systemPrompt}

---

# Available Skills

The following skills provide detailed guidance for specific tasks. Use them when appropriate.

${skillsContent}`
    }
  }

  // Add global model disclosure (only responds when asked)
  systemPrompt = systemPrompt + `
IMPORTANT: If a user asks what AI model, LLM, or technology powers you, respond that you are powered by state-of-the-art (SOTA) models from xAI and Anthropic. Do not mention specific model names or versions. Only provide this information when explicitly asked.`

  return systemPrompt
}

/**
 * Get tool names from agent config
 */
function getToolNames(agent: any): string[] {
  if (!agent.tools || agent.tools.length === 0) return []

  return agent.tools
    .filter((t: any) => t.tool?.is_enabled !== false)
    .map((t: any) => t.tool?.name)
    .filter(Boolean)
}

function getDefaultSystemPrompt(): string {
  return `You are an AI assistant executing a scheduled task.

## CRITICAL: Anti-Hallucination Rules

YOU MUST FOLLOW THESE RULES EXACTLY. VIOLATIONS ARE SERIOUS FAILURES.

1. **NO FABRICATION**: You MUST NEVER invent, fabricate, or make up ANY data including:
   - Team member names (e.g., Alice, Bob, Charlie - these are OBVIOUS hallucinations)
   - Task titles, project names, or workload numbers
   - Hours, percentages, or any metrics
   - Any specific data that should come from a database

2. **TOOL REQUIREMENT**: Every data point in your response MUST come from an actual tool call.
   - If you didn't call a tool, you don't have real data
   - If a tool returned empty results, report "No data found" - don't invent examples

3. **NO TOOLS = NO DATA RESPONSE**: If you have NO tools available:
   - Your ONLY valid response is: "I cannot complete this task because I don't have access to data tools. The schedule needs to be configured with workspace access."
   - Do NOT attempt to provide a "sample" or "example" report
   - Do NOT use placeholder names or made-up numbers

4. **VERIFICATION**: Before finishing your response, verify:
   - Did I call tools to get this data? (If not, I'm hallucinating)
   - Can I trace each fact to a tool result? (If not, delete it)
   - Am I using generic names like Alice/Bob/Charlie? (If so, I'm hallucinating)

## Response Guidelines
- Complete the task thoroughly using ONLY real tool results
- Be concise but comprehensive
- If a tool returns no data, clearly state "No data found for X"
- Never apologize for lack of data - just state the facts`
}

/**
 * Main scheduled execution handler
 */
export async function scheduledExecutionHandler(req: Request, res: Response) {
  const startTime = Date.now()
  console.log("[Scheduled Execution] ========== NEW REQUEST ==========")
  const auditContext = getRequestAuditContext(req)
  let scheduleContext: ScheduleContext = {
    scheduleId: null,
    scheduleName: null,
    scheduleTimezone: "UTC",
    scheduleWorkspaceId: null,
  }

  try {
    // Verify cron secret
    const cronSecret = process.env.CRON_SECRET
    const authHeader = req.headers.authorization

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log("[Scheduled Execution] Unauthorized - invalid cron secret")
      return res.status(401).json({ error: "Unauthorized" })
    }

    // Parse and validate request body
    const parsed = requestSchema.safeParse(req.body)
    if (!parsed.success) {
      console.log("[Scheduled Execution] Invalid request:", parsed.error.message)
      return res.status(400).json({ error: `Invalid request: ${parsed.error.message}` })
    }

    const { executionId, agentId, taskPrompt, workspaceId, outputConfig, profileId, simulatedTime } = parsed.data
    console.log(`[Scheduled Execution] Processing execution ${executionId} for agent ${agentId}`)
    console.log(`[Scheduled Execution] workspaceId: ${workspaceId || 'NOT PROVIDED - MCP tools will not be available'}`)
    console.log(`[Scheduled Execution] profileId: ${profileId || 'NOT PROVIDED - MCP authorization may fail'}`)

    const supabase = createAdminClient()
    scheduleContext = await loadScheduleContext(supabase, executionId)

    // Update execution to running
    await supabase
      .from("agent_schedule_executions")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
      })
      .eq("id", executionId)

    // Log execution start for audit trail
    await logAuditEvent(supabase, {
      action: "schedule_execution_started",
      resourceType: "agent_schedule_execution",
      resourceId: executionId,
      workspaceId: scheduleContext.scheduleWorkspaceId || workspaceId || null,
      details: {
        schedule_id: scheduleContext.scheduleId,
        schedule_name: scheduleContext.scheduleName,
        agent_id: agentId,
        actor_type: "cron",
        simulated_time: simulatedTime || null,
      },
      context: auditContext,
    })

    // Load agent configuration
    const { agent, error: agentError } = await loadAgentConfig(supabase, agentId)
    if (!agent) {
      console.log(`[Scheduled Execution] Agent not found: ${agentError}`)
      await updateExecutionFailed(supabase, executionId, agentError || "Agent not found", startTime)
      return res.status(404).json({ error: agentError || "Agent not found" })
    }

    // Get schedule timezone for time context
    const scheduleTimezone = scheduleContext.scheduleTimezone

    // #region agent log - DEBUG scheduled execution provider
    console.log(`[Scheduled Execution] ====== AGENT DEBUG ======`)
    console.log(`[Scheduled Execution] Agent ID: ${agentId}`)
    console.log(`[Scheduled Execution] Agent name: ${agent.name}`)
    console.log(`[Scheduled Execution] Agent provider (raw): "${agent.provider}" (type: ${typeof agent.provider})`)
    console.log(`[Scheduled Execution] Agent model (raw): "${agent.model}" (type: ${typeof agent.model})`)
    console.log(`[Scheduled Execution] Schedule timezone: ${scheduleTimezone}`)
    // #endregion

    // Build system prompt with rules and skills
    const systemPrompt = buildSystemPrompt(agent)
    const toolNames = getToolNames(agent)
    const model = agent.model || "sonnet"
    // ALWAYS infer provider from model name to ensure consistency
    const provider = inferProviderFromModel(model)

    // #region agent log - DEBUG resolved provider
    console.log(`[Scheduled Execution] Resolved provider: "${provider}"`)
    console.log(`[Scheduled Execution] Resolved model: "${model}"`)
    console.log(`[Scheduled Execution] Will call executeWithVercelAI with provider="${provider}", model="${model}"`)
    // #endregion

    console.log(`[Scheduled Execution] Agent has ${toolNames.length} tools: ${toolNames.join(", ") || "none"}`)

    // Use the schedule creator's profile_id for MCP authorization
    // This was passed from the cron endpoint and comes from agent_schedules.created_by
    const agentProfileId = profileId
    if (!agentProfileId && workspaceId) {
      console.log(`[Scheduled Execution] Warning: No profileId provided for MCP authorization in workspace ${workspaceId}`)
    } else if (agentProfileId) {
      console.log(`[Scheduled Execution] Using profile_id for MCP authorization: ${agentProfileId}`)
    }

    // Build task prompt with context
    let finalTaskPrompt = taskPrompt
    if (workspaceId) {
      const toolList = toolNames.length > 0
        ? toolNames.join(', ')
        : 'None available'

      const contextSection = `${formatTimeContext(scheduleTimezone, simulatedTime)}

## Execution Context
- Workspace ID: ${workspaceId}
- Execution Type: Scheduled Task
- Available Tools: ${toolList}

${toolNames.length > 0
  ? `IMPORTANT: You MUST use the tools listed above to query real data from the workspace. Do NOT fabricate, make up, or hallucinate any information. If a tool returns no data, report that clearly rather than inventing examples.`
  : `WARNING: No data tools are available for this execution. You cannot query real workspace data. If this task requires data, clearly state that you cannot complete it without tool access.`}

---

`
      finalTaskPrompt = contextSection + taskPrompt
    } else {
      // No workspaceId means no MCP tools can be created
      const noToolsWarning = `${formatTimeContext(scheduleTimezone, simulatedTime)}

## IMPORTANT: No Workspace Context

This scheduled execution has no workspace context, which means NO data tools are available.
You CANNOT query real workspace data (tasks, projects, team members, etc.).

If this task requires data about the workspace, you MUST clearly state:
"I cannot complete this task because I don't have access to workspace data tools. Please ensure the schedule is linked to a workspace."

Do NOT fabricate, make up, or hallucinate any data.

---

`
      finalTaskPrompt = noToolsWarning + taskPrompt
    }

    // Append output formatting instructions
    const outputInstructions = buildOutputInstructions(outputConfig)
    finalTaskPrompt = `${finalTaskPrompt}

---

${outputInstructions}`

    // Execute with Vercel AI SDK (unified path for all providers)
    const result = await executeWithVercelAI({
      provider,
      model: agent.model,
      systemPrompt,
      taskPrompt: finalTaskPrompt,
      toolNames,
      workspaceId: workspaceId || "",
      agentProfileId: agentProfileId || undefined,
    })

    const duration = Date.now() - startTime

    // Determine if this was a hallucinated response
    const wasHallucination = result.hallucinationCheck?.isLikelyHallucination || false
    const hallucinationConfidence = result.hallucinationCheck?.confidence || null

    // Update execution with success
    await supabase
      .from("agent_schedule_executions")
      .update({
        status: result.success ? "completed" : "failed",
        completed_at: new Date().toISOString(),
        result: {
          message: result.content,
          hallucination_warning: wasHallucination ? result.hallucinationCheck?.summary : undefined,
          hallucination_indicators: wasHallucination ? result.hallucinationCheck?.indicators : undefined,
        },
        tool_calls: result.toolCalls,
        tokens_input: result.inputTokens,
        tokens_output: result.outputTokens,
        duration_ms: duration,
      })
      .eq("id", executionId)

    // Log execution completion for audit trail
    await logAuditEvent(supabase, {
      action: "schedule_execution_completed",
      resourceType: "agent_schedule_execution",
      resourceId: executionId,
      workspaceId: scheduleContext.scheduleWorkspaceId || workspaceId || null,
      details: {
        schedule_id: scheduleContext.scheduleId,
        schedule_name: scheduleContext.scheduleName,
        agent_id: agentId,
        duration_ms: duration,
        tool_calls: result.toolCalls?.length || 0,
        hallucination: wasHallucination,
        hallucination_confidence: hallucinationConfidence,
        actor_type: "cron",
      },
      context: auditContext,
    })

    // Log additional warning for hallucination
    if (wasHallucination) {
      console.warn(`[Scheduled Execution] ⚠️ Execution ${executionId} completed but HALLUCINATION DETECTED (${hallucinationConfidence} confidence)`)
    }

    console.log(`[Scheduled Execution] Completed in ${duration}ms, success=${result.success}, hallucination=${wasHallucination}`)

    // Send DM notification via admin API
    try {
      const adminUrl = process.env.ADMIN_URL || 'http://localhost:3000'
      const notifyResponse = await fetch(`${adminUrl}/api/admin/scheduled-tasks/${executionId}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({
          status: result.success ? 'completed' : 'failed',
          resultText: result.content,
          durationMs: duration,
        }),
      })
      if (notifyResponse.ok) {
        const notifyResult = await notifyResponse.json() as { recipientCount?: number }
        console.log(`[Scheduled Execution] Notification sent for ${executionId}: ${notifyResult.recipientCount ?? 0} recipients`)
      } else {
        console.error(`[Scheduled Execution] Notification request failed: ${notifyResponse.status} ${notifyResponse.statusText}`)
      }
    } catch (notifyError) {
      console.error(`[Scheduled Execution] Failed to send notification:`, notifyError)
      // Don't fail execution if notification fails
    }

    return res.json({
      success: result.success,
      executionId,
      duration,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
      hallucinationWarning: wasHallucination ? result.hallucinationCheck?.summary : undefined,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error("[Scheduled Execution] Error:", error)

    // Try to update execution status
    try {
      const parsed = requestSchema.safeParse(req.body)
      if (parsed.success) {
        const supabase = createAdminClient()
        await updateExecutionFailed(
          supabase,
          parsed.data.executionId,
          error instanceof Error ? error.message : "Unknown error",
          startTime
        )
        let scheduleId: string | null = scheduleContext.scheduleId
        let scheduleName: string | null = scheduleContext.scheduleName
        try {
          const { data: scheduleInfo } = await supabase
            .from("agent_schedule_executions")
            .select("schedule_id, schedule:agent_schedules(id, name)")
            .eq("id", parsed.data.executionId)
            .single()
          scheduleId = scheduleInfo?.schedule_id || null
          const schedule = Array.isArray(scheduleInfo?.schedule) ? scheduleInfo?.schedule[0] : scheduleInfo?.schedule
          scheduleName = (schedule as { name?: string } | null)?.name || null
        } catch (scheduleError) {
          console.warn("[Scheduled Execution] Failed to load schedule context:", scheduleError)
        }

        const taskPrompt = parsed.data.taskPrompt || ""
        await sendAgentServerErrorEmail({
          source: "scheduled-execution",
          statusCode: 500,
          error,
          request: req,
          context: {
            executionId: parsed.data.executionId,
            scheduleId,
            scheduleName,
            agentId: parsed.data.agentId,
            workspaceId: parsed.data.workspaceId,
            taskPrompt: taskPrompt ? taskPrompt.slice(0, 800) : undefined,
            durationMs: duration,
          },
        })
        res.locals.errorReported = true

        await logAuditEvent(supabase, {
          action: "schedule_execution_failed",
          resourceType: "agent_schedule_execution",
          resourceId: parsed.data.executionId,
          workspaceId: scheduleContext.scheduleWorkspaceId || parsed.data.workspaceId || null,
          details: {
            schedule_id: scheduleId,
            schedule_name: scheduleName,
            agent_id: parsed.data.agentId,
            error: error instanceof Error ? error.message : "Unknown error",
            actor_type: "cron",
          },
          context: auditContext,
        })
      }
    } catch (updateError) {
      console.error("[Scheduled Execution] Failed to update execution status:", updateError)
    }

    if (!res.locals.errorReported) {
      await sendAgentServerErrorEmail({
        source: "scheduled-execution",
        statusCode: 500,
        error,
        request: req,
        context: {
          durationMs: duration,
        },
      })
      res.locals.errorReported = true
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Execution failed",
    })
  }
}

/**
 * Update execution to failed status
 */
async function updateExecutionFailed(
  supabase: ReturnType<typeof createAdminClient>,
  executionId: string,
  errorMessage: string,
  startTime: number
) {
  await supabase
    .from("agent_schedule_executions")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
      duration_ms: Date.now() - startTime,
    })
    .eq("id", executionId)
}

/**
 * Execute using Vercel AI SDK (for non-Anthropic providers)
 */
async function executeWithVercelAI(options: {
  provider: string
  model: string
  systemPrompt: string
  taskPrompt: string
  toolNames: string[]
  workspaceId: string
  agentProfileId?: string
}): Promise<{
  success: boolean
  content: string
  inputTokens: number
  outputTokens: number
  toolCalls: any[]
  hallucinationCheck: HallucinationCheckResult | null
}> {
  const { provider, model, systemPrompt, taskPrompt, toolNames, workspaceId, agentProfileId } = options

  // #region agent log - DEBUG executeWithVercelAI
  console.log(`[Scheduled Execution] ====== EXECUTE WITH VERCEL AI ======`)
  console.log(`[Scheduled Execution] Provider received: "${provider}"`)
  console.log(`[Scheduled Execution] Model received: "${model}"`)
  // #endregion

  // Check API key
  const apiKeyEnvVar = getApiKeyEnvVar(provider)
  console.log(`[Scheduled Execution] API key env var for "${provider}": ${apiKeyEnvVar}`)
  console.log(`[Scheduled Execution] API key present: ${!!process.env[apiKeyEnvVar]}`)
  
  if (!process.env[apiKeyEnvVar]) {
    throw new Error(`API key not configured: ${apiKeyEnvVar}`)
  }

  let mcpClient: MCPClientInstance | null = null
  const toolCallRecords: any[] = []

  // Use pooled MCP client
  let aiTools: Record<string, any> = {}

  try {
    if (toolNames.length > 0 && workspaceId && agentProfileId) {
      try {
        const { client, tools, isNew } = await mcpClientPool.getClient(
          workspaceId,
          toolNames,
          agentProfileId
        )
        mcpClient = client
        aiTools = tools
        console.log(`[Scheduled Execution] MCP client ${isNew ? 'created' : 'reused'} with ${Object.keys(aiTools).length} tools`)
      } catch (mcpError) {
        console.error("[Scheduled Execution] Failed to get MCP client from pool:", mcpError)
        // Continue without tools
      }
    } else {
      // Log why MCP client was not created
      if (toolNames.length === 0) {
        console.log(`[Scheduled Execution] No tools assigned to agent - MCP client not created`)
      } else if (!workspaceId) {
        console.log(`[Scheduled Execution] No workspaceId provided - MCP client not created (agent has ${toolNames.length} tools but cannot use them)`)
      } else if (!agentProfileId) {
        console.log(`[Scheduled Execution] No profileId provided - MCP client not created (cannot authorize without valid profile_id)`)
      }
    }

    // Final check: Log what tools will be available to the AI
    console.log(`[Scheduled Execution] AI will have access to ${Object.keys(aiTools).length} tools`)

    const messages: CoreMessage[] = [{ role: "user", content: taskPrompt }]

    // #region agent log - DEBUG getModel call
    console.log(`[Scheduled Execution] About to call getModel("${provider}", "${model}")`)
    let aiModel;
    try {
      aiModel = getModel(provider, model)
      console.log(`[Scheduled Execution] getModel succeeded, model object created`)
    } catch (modelError) {
      console.error(`[Scheduled Execution] getModel FAILED:`, modelError)
      throw modelError
    }
    // #endregion

    console.log(`[Scheduled Execution] About to call generateText with provider="${provider}"`)
    const result = await generateText({
      model: aiModel,
      system: systemPrompt,
      messages,
      tools: Object.keys(aiTools).length > 0 ? aiTools : undefined,
      stopWhen: stepCountIs(10), // AI SDK 6: stop after 10 steps
      onStepFinish: async (step) => {
        // Track tool calls
        if (step.toolCalls && step.toolCalls.length > 0) {
          for (const toolCall of step.toolCalls) {
            // AI SDK 6: use type assertion for tool call args
            const tc = toolCall as { toolName: string; input?: unknown }
            toolCallRecords.push({
              name: tc.toolName,
              input: tc.input,
              timestamp: new Date().toISOString(),
            })
          }
        }
      },
    })

    // Run hallucination detection
    const hallucinationCheck = detectHallucination(
      result.text,
      toolCallRecords,
      taskPrompt,
      Object.keys(aiTools).length
    )

    // Log hallucination check result
    console.log(`[Scheduled Execution] ${formatHallucinationResult(hallucinationCheck)}`)

    if (hallucinationCheck.isLikelyHallucination) {
      console.warn(`[Scheduled Execution] ⚠️ HALLUCINATION WARNING: ${hallucinationCheck.summary}`)
      for (const indicator of hallucinationCheck.indicators) {
        console.warn(`[Scheduled Execution]   - [${indicator.severity}] ${indicator.type}: ${indicator.evidence.join(", ")}`)
      }
    }

    return {
      success: true,
      content: result.text,
      inputTokens: result.usage?.inputTokens || 0,
      outputTokens: result.usage?.outputTokens || 0,
      toolCalls: toolCallRecords,
      hallucinationCheck,
    }
  } finally {
    // Client is returned to pool, no need to close here
    // The pool handles lifecycle management (cleanup, eviction, TTL)
  }
}

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('[Scheduled Execution] SIGTERM received, closing MCP pool...')
  await mcpClientPool.dispose()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('[Scheduled Execution] SIGINT received, closing MCP pool...')
  await mcpClientPool.dispose()
  process.exit(0)
})
