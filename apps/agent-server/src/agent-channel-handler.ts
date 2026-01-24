/**
 * Agent Channel Message Handler
 *
 * Webhook endpoint triggered by Supabase when a message is inserted
 * into an agent channel. Processes delegation requests by running
 * the specialist agent and posting the response back to the channel.
 *
 * Webhook setup:
 * - Table: messages
 * - Event: INSERT
 * - Filter: is_agent_request = true
 * - URL: https://your-server.railway.app/agent-channel-message
 */

import type { Request, Response } from "express"
import { query } from "@anthropic-ai/claude-agent-sdk"
import type { McpStdioServerConfig } from "@anthropic-ai/claude-agent-sdk"
import path from "path"
import { fileURLToPath } from "url"
import { createAdminClient } from "./lib/supabase.js"
import { loadDeployedTeamConfig } from "./lib/team-config.js"
import { postToAgentChannel } from "./lib/agent-channel.js"
import { getAgentProfile } from "./lib/agent-profile.js"
import { applyRulesToPrompt, type AgentRule } from "./lib/agent-rules.js"
import type { DeployedAgent, DeployedMind } from "./types/team.js"

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
 * Map model name to Claude model ID
 * For Anthropic: converts 'sonnet'/'opus'/'haiku' to full model IDs
 * For other providers: returns the model string as-is (e.g., 'grok-3')
 */
function getModelId(model: string): string {
  const modelMap: Record<string, string> = {
    sonnet: "claude-sonnet-4-20250514",
    opus: "claude-opus-4-20250514",
    haiku: "claude-haiku-4-20250514",
  }
  return modelMap[model] || model
}

/**
 * Run a specialist agent query
 */
async function runSpecialistQuery(
  agent: DeployedAgent,
  message: string,
  workspaceId: string,
  teamMind: DeployedMind[]
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const systemPrompt = buildSpecialistPrompt(agent, teamMind, workspaceId)
  const toolNames = agent.tools?.map((t) => t.name) || []

  // MCP server config (if agent has tools)
  const mcpServerPath = path.resolve(
    __dirname,
    "../../packages/mcp-server/dist/index.js"
  )

  const mcpServerConfig: McpStdioServerConfig | null =
    toolNames.length > 0
      ? {
          type: "stdio",
          command: "node",
          args: [mcpServerPath],
          env: {
            SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
            SUPABASE_SERVICE_ROLE_KEY:
              process.env.SUPABASE_SERVICE_ROLE_KEY || "",
            WORKSPACE_ID: workspaceId,
            USER_ID: "agent", // Agent-initiated queries
          },
        }
      : null

  // Run the query
  const queryGenerator = query({
    prompt: message,
    options: {
      model: getModelId(agent.model),
      systemPrompt,
      maxTurns: 5, // Lower for specialist queries
      maxThinkingTokens: 2000,
      disallowedTools: ["Task", "delegate_to_agent"], // No recursion
      ...(mcpServerConfig
        ? {
            mcpServers: {
              dreamteam: mcpServerConfig,
            },
            allowedTools: toolNames.map((name) => `mcp__dreamteam__${name}`),
          }
        : {}),
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      },
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      persistSession: false,
    },
  })

  let responseText = ""
  let inputTokens = 0
  let outputTokens = 0

  for await (const msg of queryGenerator) {
    if (msg.type === "assistant") {
      for (const content of msg.message.content) {
        if (content.type === "text") {
          responseText += content.text
        }
      }
      if (msg.message.usage) {
        inputTokens += msg.message.usage.input_tokens || 0
        outputTokens += msg.message.usage.output_tokens || 0
      }
    }
    if (msg.type === "result") {
      inputTokens = msg.usage.input_tokens
      outputTokens = msg.usage.output_tokens
    }
  }

  return { text: responseText, inputTokens, outputTokens }
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

    // Run the specialist query
    const result = await runSpecialistQuery(
      specialist,
      record.content,
      channel.workspace_id,
      config.team_mind
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
