/**
 * Agent Profile Utilities
 *
 * Functions for looking up agent profile IDs in the database.
 * Agent profiles are created during team deployment and linked to
 * their workspace and agent slug.
 */

import { createAdminClient } from "./supabase.js"

/**
 * Get the profile ID for an agent in a workspace
 *
 * Agents have profiles with is_agent=true, agent_workspace_id, and agent_slug
 * set during deployment.
 *
 * @param workspaceId - The workspace the agent belongs to
 * @param agentSlug - The agent's slug (e.g., "research", "tax")
 * @returns The profile ID, or null if not found
 */
export async function getAgentProfile(
  workspaceId: string,
  agentSlug: string
): Promise<string | null> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("agent_workspace_id", workspaceId)
    .eq("agent_slug", agentSlug)
    .eq("is_agent", true)
    .single()

  return data?.id || null
}
