/**
 * Agent Channel Utilities
 *
 * Functions for working with agent-specific channels.
 * Each specialist agent gets a dedicated channel (#agent-{slug})
 * for receiving delegation requests and posting responses.
 */

import { createAdminClient } from "./supabase.js"

/**
 * Get the channel ID for an agent in a workspace
 *
 * Agent channels are named "agent-{slug}" and have is_agent_channel=true.
 *
 * @param workspaceId - The workspace the channel belongs to
 * @param agentSlug - The agent's slug (e.g., "research", "tax")
 * @returns The channel ID, or null if not found
 */
export async function getAgentChannel(
  workspaceId: string,
  agentSlug: string
): Promise<string | null> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from("channels")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", `agent-${agentSlug}`)
    .eq("is_agent_channel", true)
    .single()

  return data?.id || null
}

/**
 * Post a message to an agent channel
 *
 * Used by the head agent to send delegation requests, and by
 * specialist agents to send responses.
 *
 * @param channelId - The channel to post to
 * @param senderProfileId - The profile ID of the sender (agent)
 * @param content - The message content
 * @param requestId - Optional request ID for correlation (set for delegation requests)
 */
export async function postToAgentChannel(
  channelId: string,
  senderProfileId: string,
  content: string,
  requestId?: string
): Promise<void> {
  const supabase = createAdminClient()

  await supabase.from("messages").insert({
    channel_id: channelId,
    profile_id: senderProfileId,
    content,
    is_agent_request: !!requestId,
    agent_request_id: requestId || null,
    agent_response_status: requestId ? "pending" : null,
  })
}

/**
 * Update the status of a delegation request message
 *
 * Called after a specialist responds or times out.
 *
 * @param requestId - The request ID to update
 * @param status - The new status
 */
export async function updateMessageStatus(
  requestId: string,
  status: "completed" | "timeout" | "error"
): Promise<void> {
  const supabase = createAdminClient()

  await supabase
    .from("messages")
    .update({ agent_response_status: status })
    .eq("agent_request_id", requestId)
}
