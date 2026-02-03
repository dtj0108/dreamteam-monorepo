/**
 * Agent Channel Message Handler
 *
 * Webhook endpoint triggered by Supabase when a message is inserted
 * into an agent channel. Processes delegation requests by running
 * the specialist agent and posting the response back to the channel.
 *
 * Uses Vercel AI SDK with MCP tools for all AI providers.
 *
 * Webhook setup:
 * - Table: messages
 * - Event: INSERT
 * - Filter: is_agent_request = true
 * - URL: https://your-server.railway.app/agent-channel-message
 */

import type { Request, Response } from "express"
import { generateText, stepCountIs } from "ai"
import { createAdminClient } from "./lib/supabase.js"
import { loadDeployedTeamConfig } from "./lib/team-config.js"
import { getAgentProfile } from "./lib/agent-profile.js"
import { applyRulesToPrompt, type AgentRule } from "./lib/agent-rules.js"
import { formatTimeContext } from "./lib/time-context.js"
import { createMCPClient, type MCPClientInstance } from "./lib/mcp-client.js"
import { getModel, getApiKeyEnvVar } from "./lib/ai-providers.js"
import type { DeployedAgent, DeployedMind } from "./types/team.js"

/**
 * Webhook payload from Supabase
 */
interface WebhookPayload {
  type: "INSERT"
  table: "messages"
  record: {
    id: string
    channel_id: string
    profile_id: string
    content: string
    is_agent_request?: boolean
    agent_request_id?: string
    agent_response_status?: string
  }
}

/**
 * Build the system prompt for a specialist agent
 */
function buildSpecialistPrompt(
  agent: DeployedAgent,
  teamMind: DeployedMind[],
  workspaceId: string,
  timezone: string = 'UTC'
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

  // Add delegation context with workspace_id instruction and time context
  systemPrompt = `${systemPrompt}

---

# Delegation Context

You are responding to a delegated task from the team's head agent. Focus on your specialty and provide a thorough, helpful response. The head agent will incorporate your response into the conversation with the user.

${formatTimeContext(timezone)}

## Current Context
- Workspace ID: ${workspaceId}

**IMPORTANT: When calling ANY tool, ALWAYS include \`workspace_id: "${workspaceId}"\` in the tool input.** This is required for proper data access.

IMPORTANT: If a user asks what AI model, LLM, or technology powers you, respond that you are powered by state-of-the-art (SOTA) models from xAI and Anthropic. Do not mention specific model names or versions. Only provide this information when explicitly asked.`

  return systemPrompt
}

/**
 * Run a specialist agent query using Vercel AI SDK
 */
async function runSpecialistQuery(
  agent: DeployedAgent,
  message: string,
  workspaceId: string,
  teamMind: DeployedMind[],
  timezone: string = 'UTC'
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const systemPrompt = buildSpecialistPrompt(agent, teamMind, workspaceId, timezone)
  const toolNames = agent.tools?.map((t) => t.name) || []
  const provider = agent.provider || "anthropic"

  // Check API key
  const apiKeyEnvVar = getApiKeyEnvVar(provider)
  if (!process.env[apiKeyEnvVar]) {
    throw new Error(`API key not configured: ${apiKeyEnvVar}`)
  }

  console.log(`[Agent Channel Handler] Running specialist with ${provider}/${agent.model}`)

  let mcpClient: MCPClientInstance | null = null

  try {
    // Create MCP client for tools (if tools are assigned)
    let aiTools: Record<string, ReturnType<typeof import("ai").tool>> = {}
    if (toolNames.length > 0) {
      try {
        mcpClient = await createMCPClient({
          workspaceId,
          userId: "agent",
          enabledTools: toolNames,
        })
        aiTools = mcpClient.tools
        console.log(`[Agent Channel Handler] MCP client connected with ${Object.keys(aiTools).length} tools`)
      } catch (mcpError) {
        console.error("[Agent Channel Handler] Failed to create MCP client:", mcpError)
        // Continue without tools
      }
    }

    // Run the query
    const result = await generateText({
      model: getModel(provider, agent.model),
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
      tools: Object.keys(aiTools).length > 0 ? aiTools : undefined,
      stopWhen: stepCountIs(5), // AI SDK 6: lower for specialist queries
    })

    return {
      text: result.text,
      inputTokens: result.usage?.inputTokens || 0,
      outputTokens: result.usage?.outputTokens || 0,
    }
  } finally {
    if (mcpClient) {
      try {
        await mcpClient.close()
      } catch (closeError) {
        console.error("[Agent Channel Handler] Failed to close MCP client:", closeError)
      }
    }
  }
}

/**
 * Handle incoming agent channel messages
 *
 * Triggered by Supabase webhook when a delegation request is posted
 * to an agent channel.
 */
export async function agentChannelMessageHandler(
  req: Request,
  res: Response
): Promise<void> {
  console.log("[Agent Channel Handler] Received webhook")

  try {
    const payload = req.body as WebhookPayload
    const { record } = payload

    // Only process delegation requests
    if (!record?.is_agent_request || !record?.agent_request_id) {
      console.log("[Agent Channel Handler] Skipping - not a delegation request")
      res.json({ skipped: true, reason: "Not a delegation request" })
      return
    }

    console.log(
      `[Agent Channel Handler] Processing request ${record.agent_request_id}`
    )

    const supabase = createAdminClient()

    // Get channel details to find the workspace and linked agent
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("id, workspace_id, linked_agent_id, is_agent_channel")
      .eq("id", record.channel_id)
      .single()

    if (channelError || !channel) {
      console.error("[Agent Channel Handler] Channel not found:", channelError)
      res.status(404).json({ error: "Channel not found" })
      return
    }

    if (!channel.is_agent_channel || !channel.linked_agent_id) {
      console.log("[Agent Channel Handler] Skipping - not an agent channel")
      res.json({ skipped: true, reason: "Not an agent channel" })
      return
    }

    // Load deployed team config
    const config = await loadDeployedTeamConfig(supabase, channel.workspace_id)
    if (!config) {
      console.error("[Agent Channel Handler] No deployed team found")
      res.status(404).json({ error: "No deployed team" })
      return
    }

    // Find the specialist agent
    const specialist = config.agents.find(
      (a) => a.id === channel.linked_agent_id && a.is_enabled
    )
    if (!specialist) {
      console.error(
        `[Agent Channel Handler] Specialist ${channel.linked_agent_id} not found`
      )
      res.status(404).json({ error: "Specialist not found" })
      return
    }

    console.log(
      `[Agent Channel Handler] Running specialist: ${specialist.name}`
    )

    // Fetch workspace timezone for time context
    let workspaceTimezone = 'UTC'
    try {
      const { data: workspaceData } = await supabase
        .from("workspaces")
        .select("timezone")
        .eq("id", channel.workspace_id)
        .single()
      
      if (workspaceData?.timezone) {
        workspaceTimezone = workspaceData.timezone
      }
    } catch (error) {
      console.log("[Agent Channel Handler] Failed to load workspace timezone, using UTC:", error)
    }

    // Run the specialist query
    const result = await runSpecialistQuery(
      specialist,
      record.content,
      channel.workspace_id,
      config.team_mind,
      workspaceTimezone
    )

    console.log(
      `[Agent Channel Handler] Specialist responded (${result.text.length} chars)`
    )

    // Get the specialist's profile ID
    const specialistProfileId = await getAgentProfile(
      channel.workspace_id,
      specialist.slug
    )

    if (specialistProfileId) {
      // Post response to channel (not a request, just a response message)
      // We use the same request_id but is_agent_request=false to correlate
      await supabase.from("messages").insert({
        channel_id: record.channel_id,
        profile_id: specialistProfileId,
        content: result.text,
        is_agent_request: false,
        agent_request_id: record.agent_request_id, // Correlate with original request
        agent_response_status: "completed",
      })

      console.log("[Agent Channel Handler] Response posted to channel")
    } else {
      console.warn(
        `[Agent Channel Handler] No profile found for specialist ${specialist.slug}`
      )
    }

    res.json({
      success: true,
      agentSlug: specialist.slug,
      responseLength: result.text.length,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    })
  } catch (error) {
    console.error("[Agent Channel Handler] Error:", error)
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    })
  }
}
