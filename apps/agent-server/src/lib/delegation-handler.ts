/**
 * Delegation Handler
 *
 * Executes delegated agent queries. When the head agent calls delegate_to_agent,
 * this handler runs the specialist agent and returns their response.
 *
 * Uses Vercel AI SDK with MCP tools for all AI providers.
 *
 * CRITICAL: Delegated agents cannot delegate further (allowDelegation: false)
 * to prevent infinite delegation chains.
 */

import { generateText, stepCountIs } from "ai"
import crypto from "crypto"
import type {
  DeployedTeamConfig,
  DeployedAgent,
  DeployedMind,
} from "../types/team.js"
import { getAgentBySlug } from "./team-config.js"
import { getDelegationRule, type DelegationInput } from "./delegation-tool.js"
import { applyRulesToPrompt, type AgentRule } from "./agent-rules.js"
import {
  getAgentChannel,
  postToAgentChannel,
  updateMessageStatus,
} from "./agent-channel.js"
import { getAgentProfile } from "./agent-profile.js"
import { waitForAgentResponse } from "./channel-subscription.js"
import { createMCPClient, type MCPClientInstance } from "./mcp-client.js"
import { getModel, getApiKeyEnvVar } from "./ai-providers.js"

/**
 * Result of a delegation execution
 */
export interface DelegationResult {
  success: boolean
  agentName: string
  agentSlug: string
  response: string
  error?: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

/**
 * Options for delegation execution
 */
export interface DelegationOptions {
  workspaceId: string
  userId: string
  conversationId: string
  headAgentSlug: string
}

/**
 * Build the system prompt for a delegated agent
 *
 * Combines the agent's base system prompt with:
 * - Agent-specific mind files
 * - Team-level mind files
 * - Agent rules
 * - Agent skills
 */
function buildDelegatedAgentPrompt(
  agent: DeployedAgent,
  teamMind: DeployedMind[],
  workspaceId: string
): string {
  let systemPrompt = agent.system_prompt

  // Apply rules
  if (agent.rules && agent.rules.length > 0) {
    const rules: AgentRule[] = agent.rules.map((r) => ({
      id: r.id,
      agent_id: agent.id,
      rule_type: r.rule_type as "always" | "never" | "when",
      rule_content: r.content,
      priority: r.priority,
      is_enabled: true,
    }))
    systemPrompt = applyRulesToPrompt(systemPrompt, rules)
  }

  // Add mind files (agent-specific + team-level)
  const allMind = [...(agent.mind || []), ...(teamMind || [])]
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
  if (agent.skills && agent.skills.length > 0) {
    const skillsContent = agent.skills
      .map((s) => `## Skill: ${s.name}\n\n${s.content}`)
      .join("\n\n---\n\n")

    systemPrompt = `${systemPrompt}

---

# Available Skills

${skillsContent}`
  }

  // Add delegation context with workspace_id instruction
  systemPrompt = `${systemPrompt}

---

# Delegation Context

You are responding to a delegated task from the team's head agent. Focus on your specialty and provide a thorough, helpful response. The head agent will incorporate your response into the conversation with the user.

## Current Context
- Workspace ID: ${workspaceId}

**IMPORTANT: When calling ANY tool, ALWAYS include \`workspace_id: "${workspaceId}"\` in the tool input.** This is required for proper data access.`

  return systemPrompt
}

/**
 * Build the message to send to the delegated agent
 *
 * Uses the delegation's context_template if available,
 * otherwise constructs a default format.
 */
function buildDelegatedMessage(
  input: DelegationInput,
  config: DeployedTeamConfig,
  headAgentSlug: string
): string {
  // Find the delegation rule for context template
  const delegation = getDelegationRule(config, headAgentSlug, input.agent_slug)

  // If there's a context template, use it
  if (delegation?.context_template) {
    return delegation.context_template
      .replace("{{task}}", input.task)
      .replace("{{context}}", input.context || "No additional context provided.")
  }

  // Default format
  if (input.context) {
    return `## Context from conversation:
${input.context}

## Task:
${input.task}`
  }

  return input.task
}

/**
 * Execute a delegation to a specialist agent
 *
 * Uses Vercel AI SDK with MCP tools.
 * The agent CANNOT delegate further (prevents infinite chains).
 *
 * @param input - The delegation input from the head agent
 * @param config - The deployed team configuration
 * @param options - Execution options (workspace, user, conversation IDs)
 * @returns The delegation result with the agent's response
 */
export async function handleDelegation(
  input: DelegationInput,
  config: DeployedTeamConfig,
  options: DelegationOptions
): Promise<DelegationResult> {
  const { workspaceId, userId, headAgentSlug } = options

  console.log(
    `[Delegation] Starting delegation from "${headAgentSlug}" to "${input.agent_slug}"`
  )
  console.log(`[Delegation] Task: ${input.task.slice(0, 100)}...`)

  // Find target agent
  const targetAgent = getAgentBySlug(config, input.agent_slug)

  if (!targetAgent) {
    console.error(`[Delegation] Agent not found: ${input.agent_slug}`)
    return {
      success: false,
      agentName: "",
      agentSlug: input.agent_slug,
      response: "",
      error: `Agent "${input.agent_slug}" not found or is disabled`,
    }
  }

  console.log(`[Delegation] Found target agent: ${targetAgent.name}`)

  // Build system prompt with mind, rules, skills
  const systemPrompt = buildDelegatedAgentPrompt(targetAgent, config.team_mind, workspaceId)

  // Build message with context template
  const message = buildDelegatedMessage(input, config, headAgentSlug)

  // Get tool names for this agent
  const toolNames = targetAgent.tools?.map((t) => t.name) || []
  const provider = targetAgent.provider || "anthropic"

  // Check API key
  const apiKeyEnvVar = getApiKeyEnvVar(provider)
  if (!process.env[apiKeyEnvVar]) {
    return {
      success: false,
      agentName: targetAgent.name,
      agentSlug: targetAgent.slug,
      response: "",
      error: `API key not configured: ${apiKeyEnvVar}`,
    }
  }

  console.log(`[Delegation] Using ${provider}/${targetAgent.model}`)

  let mcpClient: MCPClientInstance | null = null

  try {
    // Create MCP client for tools (if tools are assigned)
    let aiTools: Record<string, ReturnType<typeof import("ai").tool>> = {}
    if (toolNames.length > 0) {
      try {
        mcpClient = await createMCPClient({
          workspaceId,
          userId,
          enabledTools: toolNames,
        })
        aiTools = mcpClient.tools
        console.log(`[Delegation] MCP client connected with ${Object.keys(aiTools).length} tools`)
      } catch (mcpError) {
        console.error("[Delegation] Failed to create MCP client:", mcpError)
        // Continue without tools
      }
    }

    // Run the delegated agent query
    const result = await generateText({
      model: getModel(provider, targetAgent.model),
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
      tools: Object.keys(aiTools).length > 0 ? aiTools : undefined,
      stopWhen: stepCountIs(5), // AI SDK 6: lower for delegated queries
    })

    const inputTokens = result.usage?.promptTokens || 0
    const outputTokens = result.usage?.completionTokens || 0

    console.log(
      `[Delegation] Completed. Response length: ${result.text.length} chars`
    )
    console.log(
      `[Delegation] Usage: ${inputTokens} input, ${outputTokens} output tokens`
    )

    return {
      success: true,
      agentName: targetAgent.name,
      agentSlug: targetAgent.slug,
      response: result.text,
      usage: { inputTokens, outputTokens },
    }
  } catch (error) {
    console.error(`[Delegation] Error executing delegated query:`, error)

    return {
      success: false,
      agentName: targetAgent.name,
      agentSlug: targetAgent.slug,
      response: "",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  } finally {
    if (mcpClient) {
      try {
        await mcpClient.close()
      } catch (closeError) {
        console.error("[Delegation] Failed to close MCP client:", closeError)
      }
    }
  }
}

/**
 * Handle delegation via agent channels
 *
 * This is an alternative to inline delegation that uses Supabase channels
 * for inter-agent communication. Messages are visible in the UI and
 * can be observed by users.
 *
 * Flow:
 * 1. Head agent posts request to specialist's channel
 * 2. Webhook triggers specialist agent query
 * 3. Specialist posts response to channel
 * 4. Head agent receives response via realtime subscription
 *
 * Falls back to inline delegation if channel doesn't exist.
 *
 * @param input - The delegation input from the head agent
 * @param config - The deployed team configuration
 * @param workspaceId - The workspace ID
 * @param headAgentSlug - The head agent's slug (for getting profile)
 * @returns Success/failure with response or error
 */
export async function handleDelegationViaChannel(
  input: DelegationInput,
  config: DeployedTeamConfig,
  workspaceId: string,
  headAgentSlug: string
): Promise<{ success: boolean; response?: string; error?: string }> {
  console.log(
    `[Channel Delegation] Starting delegation from "${headAgentSlug}" to "${input.agent_slug}"`
  )

  // 1. Get channel for the target specialist agent
  const channelId = await getAgentChannel(workspaceId, input.agent_slug)
  if (!channelId) {
    console.log(
      `[Channel Delegation] No channel found for ${input.agent_slug}, falling back to inline delegation`
    )
    // Fall back to inline delegation if no channel exists
    const result = await handleDelegation(input, config, {
      workspaceId,
      userId: "",
      conversationId: "",
      headAgentSlug,
    })
    return {
      success: result.success,
      response: result.response,
      error: result.error,
    }
  }

  // 2. Get the head agent's profile ID (sender)
  const headProfileId = await getAgentProfile(workspaceId, headAgentSlug)
  if (!headProfileId) {
    console.error(
      `[Channel Delegation] Head agent profile not found for ${headAgentSlug}`
    )
    return { success: false, error: "Head agent profile not found" }
  }

  // 3. Build message content
  const message = input.context
    ? `Context: ${input.context}\n\nTask: ${input.task}`
    : input.task

  // 4. Post request to specialist's channel
  const requestId = crypto.randomUUID()
  console.log(
    `[Channel Delegation] Posting request ${requestId} to channel ${channelId}`
  )
  await postToAgentChannel(channelId, headProfileId, message, requestId)

  // 5. Wait for response via realtime subscription
  try {
    console.log(`[Channel Delegation] Waiting for response...`)
    const response = await waitForAgentResponse(channelId, requestId, 60000)
    console.log(
      `[Channel Delegation] Received response (${response.content.length} chars)`
    )
    return { success: true, response: response.content }
  } catch (error) {
    console.error(`[Channel Delegation] Timeout waiting for response:`, error)
    await updateMessageStatus(requestId, "timeout")
    return { success: false, error: "Specialist response timeout" }
  }
}
