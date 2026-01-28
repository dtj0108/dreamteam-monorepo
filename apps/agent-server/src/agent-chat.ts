/**
 * Agent Chat Handler for Express
 *
 * Uses Vercel AI SDK for all AI providers (Anthropic, OpenAI, xAI, Google, etc.)
 * with MCP tools via stdio transport.
 * Streams responses via Server-Sent Events (SSE).
 *
 * Migrated from Next.js API route to work in Express for Railway deployment.
 */

import type { Request, Response } from "express"
import { streamText, stepCountIs, type CoreMessage } from "ai"
import { z } from "zod"
import { createMCPClient, type MCPClientInstance } from "./lib/mcp-client.js"
import { getModel } from "./lib/ai-providers.js"
import {
  createAdminClient,
  authenticateRequest,
} from "./lib/supabase.js"
import {
  loadSession,
  updateSessionUsage,
  createConversation,
} from "./lib/agent-session.js"
import { applyRulesToPrompt, type AgentRule } from "./lib/agent-rules.js"
import { buildBusinessContextInstructions, parseBusinessContext } from "./lib/business-context.js"
import type {
  ServerMessage,
  TextMessage,
  ToolStartMessage,
  ToolResultMessage,
  DoneMessage,
  ErrorMessage,
} from "./lib/agent-ws-types.js"
import type { SupabaseClient } from "@supabase/supabase-js"
// Team delegation imports
import type { DeployedTeamConfig } from "./types/team.js"
import { loadDeployedTeamConfig, getHeadAgent } from "./lib/team-config.js"
import { buildDelegationTool, type DelegationTool } from "./lib/delegation-tool.js"
// Note: handleDelegation is available for future MCP integration
// import { handleDelegation } from "./lib/delegation-handler.js"

// Request body schema
// agentId is optional - if not provided, we use the deployed team's head agent
const requestSchema = z.object({
  message: z.string(),
  agentId: z.string().optional(),
  workspaceId: z.string(),
  conversationId: z.string().optional(),
})

/**
 * Load conversation history from the database.
 * Returns the last N messages in chronological order for AI context.
 *
 * @param supabase - Supabase client instance
 * @param conversationId - The conversation to load history from
 * @param limit - Maximum number of messages to load (default: 5)
 * @returns Array of messages in chronological order (oldest first)
 */
async function loadConversationHistory(
  supabase: SupabaseClient,
  conversationId: string,
  limit: number = 5
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const { data: messages, error } = await supabase
    .from("agent_messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error || !messages) {
    console.log("[Agent Chat] Failed to load conversation history:", error?.message)
    return []
  }

  // Reverse to chronological order (oldest first) and filter to user/assistant roles only
  return messages
    .reverse()
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))
}

/**
 * Main agent chat handler for Express
 */
export async function agentChatHandler(req: Request, res: Response) {
  try {
    // DEBUG: Log request origin
    const origin = req.headers.origin || req.headers.referer || "unknown"
    console.log("[Agent Chat DEBUG] ========== NEW REQUEST ==========")
    console.log("[Agent Chat DEBUG] Origin:", origin)
    console.log(
      "[Agent Chat DEBUG] User-Agent:",
      (req.headers["user-agent"] || "").slice(0, 100)
    )

    // Log auth info for debugging
    const authHeader = req.headers.authorization
    const cookieHeader = req.headers.cookie
    console.log(
      "[Agent Chat DEBUG] Auth header:",
      authHeader ? `Bearer ${authHeader.slice(7, 20)}...` : "MISSING"
    )
    console.log(
      "[Agent Chat DEBUG] Cookie header:",
      cookieHeader ? `${cookieHeader.slice(0, 50)}...` : "MISSING"
    )

    // Authenticate request (cookies for web, Bearer token for mobile)
    const session = await authenticateRequest(req)
    console.log(
      "[Agent Chat DEBUG] Session:",
      session ? `user=${session.id}` : "NULL - will 401"
    )

    if (!session) {
      console.log("[Agent Chat DEBUG] Returning 401 Unauthorized")
      return res.status(401).json({ error: "Unauthorized" })
    }

    // Parse and validate request body
    const parsed = requestSchema.safeParse(req.body)

    if (!parsed.success) {
      console.log("[Agent Chat DEBUG] Invalid request:", parsed.error.message)
      return res.status(400).json({ error: `Invalid request: ${parsed.error.message}` })
    }

    const {
      message,
      agentId,
      workspaceId,
      conversationId: existingConversationId,
    } = parsed.data
    const supabase = createAdminClient()

    // ========================================
    // AGENT/TEAM MODE DETECTION
    // ========================================
    // Priority:
    // 1. Check for deployed team (team mode)
    // 2. Fall back to single agent mode (legacy)
    // ========================================

    let systemPrompt: string
    let toolNames: string[] = []
    let delegationTool: DelegationTool | null = null
    let deployedConfig: DeployedTeamConfig | null = null
    let headAgentSlug: string | null = null
    let effectiveAgentId: string | undefined = agentId
    // Debug tracking for token analysis
    let debugInfo = {
      agentName: '',
      hasRules: false,
      hasMind: false,
      hasSkills: false,
      hasAdminLink: false,
    }

    // Try to load deployed team config first
    deployedConfig = await loadDeployedTeamConfig(supabase, workspaceId)

    if (deployedConfig) {
      // ========================================
      // TEAM MODE
      // ========================================
      console.log(`[Agent Chat] Team mode: ${deployedConfig.team.name}`)

      // Determine which agent to use
      let targetAgent: typeof deployedConfig.agents[0] | null = null

      // If user specified an agentId, try to find that agent in the deployed config
      if (agentId) {
        // First try direct ID match (if agentId is from ai_agents table)
        targetAgent = deployedConfig.agents.find(a => a.id === agentId && a.is_enabled) || null
        
        // If not found, the agentId might be from the workspace 'agents' table
        // In that case, we need to look up the ai_agent_id mapping
        if (!targetAgent) {
          const { data: workspaceAgent } = await supabase
            .from("agents")
            .select("ai_agent_id")
            .eq("id", agentId)
            .single()
          
          if (workspaceAgent?.ai_agent_id) {
            targetAgent = deployedConfig.agents.find(
              a => a.id === workspaceAgent.ai_agent_id && a.is_enabled
            ) || null
          }
        }
        
        if (targetAgent) {
          console.log(`[Agent Chat] Using requested agent: ${targetAgent.name} (${targetAgent.slug})`)
        } else {
          console.log(`[Agent Chat] Requested agent ${agentId} not found or disabled, falling back to head agent`)
        }
      }

      // Fall back to head agent if no specific agent requested or not found
      if (!targetAgent) {
        targetAgent = getHeadAgent(deployedConfig)
        if (!targetAgent) {
          console.log("[Agent Chat] No head agent configured for team")
          return res.status(400).json({ error: "No head agent configured for team" })
        }
        console.log(`[Agent Chat] Using head agent: ${targetAgent.name} (${targetAgent.slug})`)
      }

      headAgentSlug = targetAgent.slug
      effectiveAgentId = targetAgent.id

      // Build system prompt from target agent
      systemPrompt = targetAgent.system_prompt || getDefaultSystemPrompt()

      // Apply rules
      if (targetAgent.rules && targetAgent.rules.length > 0) {
        const rules: AgentRule[] = targetAgent.rules.map((r) => ({
          id: r.id,
          agent_id: targetAgent.id,
          rule_type: r.rule_type as "always" | "never" | "when",
          rule_content: r.content,
          priority: r.priority,
          is_enabled: true,
        }))
        systemPrompt = applyRulesToPrompt(systemPrompt, rules)
      }

      // Add mind files (agent-specific + team-level)
      const allMind = [...(targetAgent.mind || []), ...(deployedConfig.team_mind || [])]
      if (allMind.length > 0) {
        const mindContent = allMind
          .map((m) => `## ${m.category}: ${m.name}\n\n${m.content}`)
          .join("\n\n---\n\n")

        systemPrompt = `${systemPrompt}

---

# Knowledge Base

${mindContent}`
      }

      // Add skills
      if (targetAgent.skills && targetAgent.skills.length > 0) {
        const skillsContent = targetAgent.skills
          .map((s) => `## Skill: ${s.name}\n\n${s.content}`)
          .join("\n\n---\n\n")

        systemPrompt = `${systemPrompt}

---

# Available Skills

The following skills provide detailed guidance for specific tasks. Use them when appropriate.

${skillsContent}`
      }

      // Get tool names from target agent
      toolNames = targetAgent.tools?.map((t) => t.name) || []
      console.log(`[Token Debug] Agent "${targetAgent.name}" has ${toolNames.length} tools assigned:`, toolNames)

      // Populate debug info for token analysis
      debugInfo = {
        agentName: targetAgent.name,
        hasRules: !!(targetAgent.rules && targetAgent.rules.length > 0),
        hasMind: !!((targetAgent.mind && targetAgent.mind.length > 0) || (deployedConfig.team_mind && deployedConfig.team_mind.length > 0)),
        hasSkills: !!(targetAgent.skills && targetAgent.skills.length > 0),
        hasAdminLink: false,
      }

      // Build delegation tool (only for head agent or agents with delegations)
      delegationTool = buildDelegationTool(deployedConfig, targetAgent.slug)
      if (delegationTool) {
        console.log(`[Agent Chat] Delegation tool enabled with ${deployedConfig.delegations.filter(d => d.from_agent_slug === targetAgent.slug && d.is_enabled).length} target(s)`)
      }

    } else if (agentId) {
      // ========================================
      // SINGLE AGENT MODE (Legacy)
      // ========================================
      console.log(`[Agent Chat] Single agent mode: ${agentId}`)

      // Load agent configuration
      const { data: agent, error: agentError } = await supabase
        .from("agents")
        .select("*, workspace_id, ai_agent_id")
        .eq("id", agentId)
        .eq("is_active", true)
        .single()

      if (agentError || !agent) {
        console.log(
          "[Agent Chat DEBUG] Agent not found:",
          agentId,
          agentError?.message
        )
        return res.status(404).json({ error: "Agent not found" })
      }

      // Load system prompt - start with local agent config
      systemPrompt = agent.system_prompt || getDefaultSystemPrompt()

      // If agent is linked to admin's ai_agents, load config from admin tables
      if (agent.ai_agent_id) {
        // Load tools from ai_agent_tools junction table
        const { data: toolAssignments } = await supabase
          .from("ai_agent_tools")
          .select(
            `
            tool:tool_id(
              id,
              name,
              description,
              is_enabled
            )
          `
          )
          .eq("agent_id", agent.ai_agent_id)

        if (toolAssignments && toolAssignments.length > 0) {
          toolNames = toolAssignments
            .filter((t: any) => t.tool?.is_enabled !== false)
            .map((t: any) => t.tool?.name)
            .filter(Boolean)
        }

        // Load rules from agent_rules and apply to system prompt
        const { data: rules } = await supabase
          .from("agent_rules")
          .select("*")
          .eq("agent_id", agent.ai_agent_id)
          .eq("is_enabled", true)

        if (rules && rules.length > 0) {
          systemPrompt = applyRulesToPrompt(systemPrompt, rules as AgentRule[])
        }

        // Load skills from ai_agent_skills junction table
        const { data: adminSkills } = await supabase
          .from("ai_agent_skills")
          .select(
            `
            skill:skill_id(
              id,
              name,
              description,
              skill_content,
              is_enabled
            )
          `
          )
          .eq("agent_id", agent.ai_agent_id)

        if (adminSkills && adminSkills.length > 0) {
          const activeSkills = adminSkills
            .filter((s: any) => s.skill?.is_enabled !== false)
            .map((s: any) => s.skill)
            .filter(Boolean)

          if (activeSkills.length > 0) {
            const skillsContent = activeSkills
              .map(
                (skill: any) => `## Skill: ${skill.name}\n\n${skill.skill_content}`
              )
              .join("\n\n---\n\n")

            systemPrompt = `${systemPrompt}

---

# Available Skills

The following skills provide detailed guidance for specific tasks. Use them when appropriate.

${skillsContent}`
          }
        }
      } else {
        // Fallback: Load skills from local agent_skill_assignments
        const { data: assignedSkills } = await supabase
          .from("agent_skill_assignments")
          .select(
            `
            skill:skill_id(
              id,
              name,
              display_name,
              content,
              is_active
            )
          `
          )
          .eq("agent_id", agentId)

        if (assignedSkills && assignedSkills.length > 0) {
          const activeSkills = assignedSkills
            .filter((s: any) => s.skill?.is_active !== false)
            .map((s: any) => s.skill)
            .filter(Boolean)

          if (activeSkills.length > 0) {
            const skillsContent = activeSkills
              .map(
                (skill: any) =>
                  `## Skill: ${skill.display_name}\n\n${skill.content}`
              )
              .join("\n\n---\n\n")

            systemPrompt = `${systemPrompt}

---

# Available Skills

The following skills provide detailed guidance for specific tasks. Use them when appropriate.

${skillsContent}`
          }
        }

        // Fallback: Use local tools array (legacy agents)
        toolNames = agent.tools || []
      }

      // Populate debug info for single agent mode
      debugInfo = {
        agentName: agent.name || 'Unknown Agent',
        hasRules: false, // Would need to check agent_rules table
        hasMind: false,
        hasSkills: false, // Skills were loaded above if any
        hasAdminLink: !!agent.ai_agent_id,
      }
      console.log(`[Token Debug] Single Agent "${debugInfo.agentName}" has ${toolNames.length} tools assigned:`, toolNames)
    } else {
      // No team deployed and no agentId provided
      console.log("[Agent Chat] No agent or team configured")
      return res.status(400).json({ error: "No agent or team configured for this workspace" })
    }

    // Create or get conversation
    let conversationId = existingConversationId

    if (conversationId) {
      // Load existing conversation
      await loadSession(supabase, conversationId)
    } else {
      // Create new conversation
      // In team mode, we need to find a valid agent_id from the agents table
      // (team agent IDs don't exist in the agents table, but agent_id has NOT NULL + FK constraint)
      let conversationAgentId: string | null = agentId || null
      
      if (deployedConfig) {
        // Team mode: Find any active agent for this workspace to satisfy FK constraint
        const { data: workspaceAgent } = await supabase
          .from("agents")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("is_active", true)
          .limit(1)
          .single()
        
        conversationAgentId = workspaceAgent?.id || null
      }
      
      conversationId = await createConversation(supabase, {
        workspaceId,
        agentId: conversationAgentId,
        userId: session.id,
        title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
      })
    }

    // Load conversation history for AI context (last 5 messages)
    // This provides context for multi-turn conversations while limiting token usage
    let conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = []
    if (conversationId) {
      conversationHistory = await loadConversationHistory(supabase, conversationId, 5)
      console.log(`[Agent Chat] Loaded ${conversationHistory.length} messages for context`)
    }

    // Save user message to database
    await supabase.from("agent_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: message,
    })

    // Set up SSE headers
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    res.flushHeaders()

    const sendEvent = (event: string, data: ServerMessage) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    }

    try {
      // Debug: Log session context
      console.log("[Agent Chat DEBUG] Team mode:", !!deployedConfig)
      console.log("[Agent Chat DEBUG] Delegation enabled:", !!delegationTool)

      // Build enhanced system prompt with delegation instructions if in team mode
      let enhancedSystemPrompt = systemPrompt
      if (delegationTool && deployedConfig && headAgentSlug) {
        const delegations = deployedConfig.delegations.filter(
          d => d.from_agent_slug === headAgentSlug && d.is_enabled
        )
        const agentDescriptions = delegations
          .map(d => {
            const agent = deployedConfig.agents.find(a => a.slug === d.to_agent_slug)
            const desc = d.condition || agent?.description || "handles general tasks"
            return `- **${d.to_agent_slug}**: ${desc}`
          })
          .join("\n")

        enhancedSystemPrompt = `${systemPrompt}

---

# Team Delegation

You are the head agent of a team. When a user's request is better handled by a specialist, you can delegate to them.

## Available Specialists:
${agentDescriptions}

## How to Delegate:
When you want to delegate a task, output a delegation block in this EXACT format:

\`\`\`delegation
AGENT: <agent_slug>
TASK: <what you need them to do>
CONTEXT: <relevant context from the conversation>
\`\`\`

After outputting a delegation block, WAIT for the specialist's response before continuing. The specialist's response will be provided to you, and you should incorporate it into your response to the user.`
      }

      // Inject user/workspace context so agent knows who it's talking to
      // This prevents agents from asking "what's your workspace ID?" when they already have it
      const contextSection = `## Current Context
- Workspace ID: ${workspaceId}
- User ID: ${session.id}${session.name ? `\n- User Name: ${session.name}` : ''}${session.email ? `\n- User Email: ${session.email}` : ''}

You have access to this user's data within this workspace.

**IMPORTANT: When calling ANY tool, ALWAYS include \`workspace_id: "${workspaceId}"\` in the tool input.** This is required for proper data access. Do NOT ask the user for their workspace ID or user ID - use the values provided above.

---

`
      enhancedSystemPrompt = contextSection + enhancedSystemPrompt

      // Add error handling instructions to help agent recover gracefully from tool failures
      const errorHandlingSection = `## Error Handling

When a tool call fails, DO NOT immediately give up. Instead:

1. **Analyze the error**: Understand what went wrong (permission denied, invalid input, resource not found, etc.)

2. **Try alternatives**: If one approach fails, consider:
   - Using different parameters
   - Trying a related tool that might work
   - Gathering more information first

3. **Provide partial results**: If some operations succeeded and others failed, share what worked and explain what didn't.

4. **Be transparent**: Tell the user what failed and why, but focus on what you CAN do to help.

5. **Only fail completely** if the core user request absolutely cannot be fulfilled.

Remember: A tool error is information, not a stop sign.

---

`
      enhancedSystemPrompt = errorHandlingSection + enhancedSystemPrompt

      // Load workspace-level business context (autonomy settings)
      // This applies to ALL agents in the workspace
      try {
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("business_context")
          .eq("id", workspaceId)
          .single()

        if (workspace?.business_context) {
          const businessContext = parseBusinessContext(workspace.business_context)
          if (businessContext) {
            const businessContextInstructions = buildBusinessContextInstructions(businessContext)
            if (businessContextInstructions) {
              enhancedSystemPrompt = `${businessContextInstructions}

---

${enhancedSystemPrompt}`
              console.log(`[Agent Chat] Added workspace business context (${businessContextInstructions.length} chars)`)
            }
          }
        }
      } catch (error) {
        console.error("[Agent Chat] Failed to load workspace business context:", error)
        // Continue without business context
      }

      // Debug: Token breakdown by component
      console.log('[Token Debug] System Prompt Breakdown:', {
        agentName: debugInfo.agentName,
        contextTokens: estimateTokens(contextSection),
        basePromptTokens: estimateTokens(systemPrompt),
        totalEnhancedTokens: estimateTokens(enhancedSystemPrompt),
        toolCount: toolNames.length,
        hasDelegation: !!delegationTool,
        hasRules: debugInfo.hasRules,
        hasMind: debugInfo.hasMind,
        hasSkills: debugInfo.hasSkills,
        hasAdminLink: debugInfo.hasAdminLink,
      })
      console.log(`[Token Debug] Final system prompt: ${enhancedSystemPrompt.length} chars (~${estimateTokens(enhancedSystemPrompt)} tokens)`)
      console.log(`[Token Debug] Tool schemas will add additional tokens for ${toolNames.length} MCP tools`)

      // Get target agent for provider check (in team mode)
      const targetAgentForProvider = deployedConfig?.agents.find(a => a.id === effectiveAgentId)

      // ========================================
      // VERCEL AI SDK PATH - All providers
      // ========================================
      // All AI providers use Vercel AI SDK: Anthropic, OpenAI, xAI (Grok), Google (Gemini), Groq, Mistral, etc.
      // This path supports MCP tools via our MCP client adapter.
      const provider = targetAgentForProvider?.provider || "anthropic"
      const model = targetAgentForProvider?.model || "sonnet"
        console.log(`[Agent Chat] Using Vercel AI SDK with provider: ${provider}, model: ${model}`)
        console.log(`[Agent Chat] xAI tools enabled: ${toolNames.length > 0 ? toolNames.join(', ') : 'none'}`)

        // Check API key for the provider
        const apiKeyEnvVars: Record<string, string> = {
          xai: "XAI_API_KEY",
          openai: "OPENAI_API_KEY",
          google: "GOOGLE_GENERATIVE_AI_API_KEY",
          groq: "GROQ_API_KEY",
        };
        const apiKeyEnvVar = apiKeyEnvVars[provider] || `${provider.toUpperCase()}_API_KEY`;
        const hasApiKey = !!process.env[apiKeyEnvVar];
        console.log(`[Agent Chat] ${apiKeyEnvVar} present: ${hasApiKey}, length: ${process.env[apiKeyEnvVar]?.length || 0}`);

        if (!hasApiKey) {
          console.error(`[Agent Chat] ERROR: ${apiKeyEnvVar} is not set! Cannot use ${provider} provider.`);
          sendEvent("error", {
            type: "error",
            message: `API key for ${provider} is not configured. Please set ${apiKeyEnvVar} environment variable.`,
            recoverable: false,
          } as ErrorMessage);
          res.end();
          return;
        }

        let mcpClient: MCPClientInstance | null = null

        // NOTE: Conversation creation, user message saving, and SSE headers are already
        // set up before this point (lines 489-522), so we don't duplicate them here.

        try {
          // Send session info
          sendEvent("session", {
            type: "session",
            sessionId: `xai-${Date.now()}`,
            conversationId: conversationId!,
            isResumed: !!existingConversationId,
          })

          // Create MCP client for tools (if tools are assigned)
          let aiTools: Record<string, ReturnType<typeof import("ai").tool>> = {}
          if (toolNames.length > 0) {
            try {
              mcpClient = await createMCPClient({
                workspaceId,
                userId: session.id,
                enabledTools: toolNames,
              })
              aiTools = mcpClient.tools
              console.log(`[Agent Chat] xAI MCP client connected with ${Object.keys(aiTools).length} tools`)
            } catch (mcpError) {
              console.error("[Agent Chat] Failed to create MCP client for xAI:", mcpError)
              // Continue without tools
            }
          }

          // Build messages array for Vercel AI SDK
          const aiMessages: CoreMessage[] = [
            ...conversationHistory.map(m => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
            { role: "user" as const, content: message }
          ]

          // Use Vercel AI SDK streamText with the configured provider
          console.log(`[Agent Chat] Starting streamText with ${Object.keys(aiTools).length} tools`);
          const result = streamText({
            model: getModel(provider, model),
            system: enhancedSystemPrompt,
            messages: aiMessages,
            tools: Object.keys(aiTools).length > 0 ? aiTools : undefined,
            stopWhen: stepCountIs(5), // AI SDK 6: stop after 5 steps (allows tool call rounds)
            onStepFinish: async (step) => {
              // Send tool events for each step
              if (step.toolCalls && step.toolCalls.length > 0) {
                for (const toolCall of step.toolCalls) {
                  sendEvent("tool_start", {
                    type: "tool_start",
                    toolName: toolCall.toolName,
                    toolCallId: toolCall.toolCallId,
                    args: toolCall.args,
                    displayName: toolCall.toolName
                      .replace(/([A-Z])/g, " $1")
                      .trim(),
                  } as ToolStartMessage)
                }
              }
              if (step.toolResults && step.toolResults.length > 0) {
                for (const toolResult of step.toolResults as Array<{ toolCallId: string; toolName: string; result: unknown }>) {
                  sendEvent("tool_result", {
                    type: "tool_result",
                    toolCallId: toolResult.toolCallId,
                    toolName: toolResult.toolName,
                    result: toolResult.result,
                    success: true,
                    durationMs: 0,
                  } as ToolResultMessage)
                }
              }
            },
          })

          let assistantContent = ""
          let totalInputTokens = 0
          let totalOutputTokens = 0

          // Stream the response
          console.log(`[Agent Chat] Starting to stream response from ${provider}/${model}`);
          try {
            for await (const textPart of result.textStream) {
              assistantContent += textPart
              sendEvent("text", {
                type: "text",
                content: textPart,
                isComplete: false,
              } as TextMessage)
            }
          } catch (streamError) {
            console.error(`[Agent Chat] Stream error from ${provider}:`, streamError);
            throw streamError;
          }
          const steps = await result.steps;
          console.log(`[Agent Chat] Stream completed, got ${assistantContent.length} chars, ${steps.length} steps`);

          // Get final usage stats
          const usage = await result.usage
          totalInputTokens = usage.promptTokens
          totalOutputTokens = usage.completionTokens

          // Get step count for reporting (steps already fetched above)
          const turnCount = steps.length

          // Mark text as complete
          sendEvent("text", {
            type: "text",
            content: "",
            isComplete: true,
          } as TextMessage)

          // Save assistant message
          if (assistantContent) {
            await supabase.from("agent_messages").insert({
              conversation_id: conversationId,
              role: "assistant",
              content: assistantContent,
            })
          }

          // Update session usage (estimate cost for xAI - similar to Anthropic pricing)
          const costUsd = (totalInputTokens * 0.003 + totalOutputTokens * 0.015) / 1000
          await updateSessionUsage(supabase, conversationId!, {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            costUsd,
          })

          // Send done event
          sendEvent("done", {
            type: "done",
            usage: {
              inputTokens: totalInputTokens,
              outputTokens: totalOutputTokens,
              costUsd,
            },
            turnCount,
          } as DoneMessage)

        } catch (error) {
          console.error(`[Agent Chat] ${provider} Error:`, error)
          sendEvent("error", {
            type: "error",
            message: error instanceof Error ? error.message : `An error occurred with ${provider}`,
            recoverable: false,
          } as ErrorMessage)
        } finally {
          // Clean up MCP client
          if (mcpClient) {
            try {
              await mcpClient.close()
            } catch (closeError) {
              console.error("[Agent Chat] Failed to close MCP client:", closeError)
            }
          }
          res.end()
        }
        return // Vercel AI SDK path complete
    } catch (error) {
      console.error("[Agent Chat] Error:", error)
      sendEvent("error", {
        type: "error",
        message: error instanceof Error ? error.message : "An error occurred",
        recoverable: false,
      } as ErrorMessage)
    } finally {
      res.end()
    }
  } catch (error) {
    console.error("[Agent Chat] Error:", error)
    // If headers haven't been sent yet, send JSON error
    if (!res.headersSent) {
      return res.status(500).json({
        error: `Internal server error: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
    // If streaming, try to send error event
    try {
      res.write(
        `event: error\ndata: ${JSON.stringify({
          type: "error",
          message: error instanceof Error ? error.message : "An error occurred",
          recoverable: false,
        })}\n\n`
      )
    } catch {
      // Ignore write errors
    }
    res.end()
  }
}

function getDefaultSystemPrompt(): string {
  return `You are a helpful AI assistant for a finance management application.
You help users with their financial questions and provide accurate, helpful information.
Be concise and friendly.`
}

/**
 * Estimate token count (rough: 1 token ≈ 4 chars)
 * For more accurate counts, use tiktoken library
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
