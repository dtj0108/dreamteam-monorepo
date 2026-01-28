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
import { generateText, stepCountIs, type CoreMessage } from "ai"
import { z } from "zod"
import { type MCPClientInstance } from "./lib/mcp-client.js"
import { mcpClientPool } from "./lib/mcp-client-pool.js"
import { getModel, getApiKeyEnvVar } from "./lib/ai-providers.js"
import { createAdminClient } from "./lib/supabase.js"
import { applyRulesToPrompt, type AgentRule } from "./lib/agent-rules.js"

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

## Critical Instructions
- You have access to tools that query real data from the workspace
- ALWAYS use the available tools to get actual data - NEVER fabricate or make up information
- If you cannot find data using tools, clearly state "I couldn't find any data" rather than inventing examples
- Tool results contain the actual current state of tasks, projects, and team data
- If no tools are available, you MUST state that you cannot complete data-dependent tasks

## Response Guidelines
- Complete the task thoroughly and accurately
- Base all responses ONLY on actual tool results
- Be concise but comprehensive
- If you need data but have no tools to get it, say so clearly`
}

/**
 * Main scheduled execution handler
 */
export async function scheduledExecutionHandler(req: Request, res: Response) {
  const startTime = Date.now()
  console.log("[Scheduled Execution] ========== NEW REQUEST ==========")

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

    const { executionId, agentId, taskPrompt, workspaceId, outputConfig } = parsed.data
    console.log(`[Scheduled Execution] Processing execution ${executionId} for agent ${agentId}`)
    console.log(`[Scheduled Execution] workspaceId: ${workspaceId || 'NOT PROVIDED - MCP tools will not be available'}`)

    const supabase = createAdminClient()

    // Update execution to running
    await supabase
      .from("agent_schedule_executions")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
      })
      .eq("id", executionId)

    // Load agent configuration
    const { agent, error: agentError } = await loadAgentConfig(supabase, agentId)
    if (!agent) {
      console.log(`[Scheduled Execution] Agent not found: ${agentError}`)
      await updateExecutionFailed(supabase, executionId, agentError || "Agent not found", startTime)
      return res.status(404).json({ error: agentError || "Agent not found" })
    }

    // #region agent log - DEBUG scheduled execution provider
    console.log(`[Scheduled Execution] ====== AGENT DEBUG ======`)
    console.log(`[Scheduled Execution] Agent ID: ${agentId}`)
    console.log(`[Scheduled Execution] Agent name: ${agent.name}`)
    console.log(`[Scheduled Execution] Agent provider (raw): "${agent.provider}" (type: ${typeof agent.provider})`)
    console.log(`[Scheduled Execution] Agent model (raw): "${agent.model}" (type: ${typeof agent.model})`)
    // #endregion

    // Build system prompt with rules and skills
    const systemPrompt = buildSystemPrompt(agent)
    const toolNames = getToolNames(agent)
    const provider = agent.provider || "anthropic"
    const model = agent.model || "sonnet"

    // #region agent log - DEBUG resolved provider
    console.log(`[Scheduled Execution] Resolved provider: "${provider}"`)
    console.log(`[Scheduled Execution] Resolved model: "${model}"`)
    console.log(`[Scheduled Execution] Will call executeWithVercelAI with provider="${provider}", model="${model}"`)
    // #endregion

    console.log(`[Scheduled Execution] Agent has ${toolNames.length} tools: ${toolNames.join(", ") || "none"}`)

    // Build task prompt with context
    let finalTaskPrompt = taskPrompt
    if (workspaceId) {
      const toolList = toolNames.length > 0
        ? toolNames.join(', ')
        : 'None available'

      const contextSection = `## Execution Context
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
      const noToolsWarning = `## IMPORTANT: No Workspace Context

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
    })

    const duration = Date.now() - startTime

    // Update execution with success
    await supabase
      .from("agent_schedule_executions")
      .update({
        status: result.success ? "completed" : "failed",
        completed_at: new Date().toISOString(),
        result: {
          message: result.content,
        },
        tool_calls: result.toolCalls,
        tokens_input: result.inputTokens,
        tokens_output: result.outputTokens,
        duration_ms: duration,
      })
      .eq("id", executionId)

    console.log(`[Scheduled Execution] Completed in ${duration}ms, success=${result.success}`)

    return res.json({
      success: result.success,
      executionId,
      duration,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
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
      }
    } catch (updateError) {
      console.error("[Scheduled Execution] Failed to update execution status:", updateError)
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
}): Promise<{ success: boolean; content: string; inputTokens: number; outputTokens: number; toolCalls: any[] }> {
  const { provider, model, systemPrompt, taskPrompt, toolNames, workspaceId } = options

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
    if (toolNames.length > 0 && workspaceId) {
      try {
        const { client, tools, isNew } = await mcpClientPool.getClient(workspaceId, toolNames, "scheduled-execution")
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
          for (const tc of step.toolCalls) {
            toolCallRecords.push({
              name: tc.toolName,
              input: tc.args,
              timestamp: new Date().toISOString(),
            })
          }
        }
      },
    })

    return {
      success: true,
      content: result.text,
      inputTokens: result.usage?.promptTokens || 0,
      outputTokens: result.usage?.completionTokens || 0,
      toolCalls: toolCallRecords,
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
