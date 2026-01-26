/**
 * Session Manager for Claude Agent SDK (Express Server Version)
 *
 * Handles creation, resumption, and persistence of Claude SDK sessions.
 * Adapted from the Next.js version to work without Next.js-specific dependencies.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

// Session metadata type
export interface SessionMetadata {
  model: string
  tools: string[]
  createdAt: string
  lastActiveAt: string
  totalInputTokens: number
  totalOutputTokens: number
  totalCostUsd: number
  turnCount: number
}

export interface StoredSession {
  conversationId: string
  sdkSessionId: string | null
  metadata: SessionMetadata
}

/**
 * Store session ID and metadata in database
 */
export async function storeSession(
  supabase: SupabaseClient,
  conversationId: string,
  sdkSessionId: string,
  metadata: Partial<SessionMetadata>
): Promise<void> {
  const now = new Date().toISOString()

  const fullMetadata: SessionMetadata = {
    model: metadata.model || "sonnet",
    tools: metadata.tools || [],
    createdAt: metadata.createdAt || now,
    lastActiveAt: now,
    totalInputTokens: metadata.totalInputTokens || 0,
    totalOutputTokens: metadata.totalOutputTokens || 0,
    totalCostUsd: metadata.totalCostUsd || 0,
    turnCount: metadata.turnCount || 0,
  }

  const { error } = await supabase
    .from("agent_conversations")
    .update({
      sdk_session_id: sdkSessionId,
      sdk_session_metadata: fullMetadata,
      total_input_tokens: fullMetadata.totalInputTokens,
      total_output_tokens: fullMetadata.totalOutputTokens,
      total_cost_usd: fullMetadata.totalCostUsd,
    })
    .eq("id", conversationId)

  if (error) {
    console.error("Failed to store session:", error)
    throw new Error(`Failed to store session: ${error.message}`)
  }
}

/**
 * Load existing session from database
 */
export async function loadSession(
  supabase: SupabaseClient,
  conversationId: string
): Promise<StoredSession | null> {
  const { data, error } = await supabase
    .from("agent_conversations")
    .select(
      "id, sdk_session_id, sdk_session_metadata, total_input_tokens, total_output_tokens, total_cost_usd"
    )
    .eq("id", conversationId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    conversationId: data.id,
    sdkSessionId: data.sdk_session_id,
    metadata: {
      ...(data.sdk_session_metadata as SessionMetadata),
      totalInputTokens: data.total_input_tokens || 0,
      totalOutputTokens: data.total_output_tokens || 0,
      totalCostUsd: parseFloat(data.total_cost_usd) || 0,
    },
  }
}

/**
 * Update session usage after a turn completes
 */
export async function updateSessionUsage(
  supabase: SupabaseClient,
  conversationId: string,
  usage: {
    inputTokens: number
    outputTokens: number
    costUsd: number
  }
): Promise<void> {
  // First get current values
  const { data: current } = await supabase
    .from("agent_conversations")
    .select(
      "total_input_tokens, total_output_tokens, total_cost_usd, sdk_session_metadata"
    )
    .eq("id", conversationId)
    .single()

  const currentMetadata = (current?.sdk_session_metadata as SessionMetadata) || {}
  const newInputTokens = (current?.total_input_tokens || 0) + usage.inputTokens
  const newOutputTokens = (current?.total_output_tokens || 0) + usage.outputTokens
  const newCost = parseFloat(current?.total_cost_usd || "0") + usage.costUsd

  const { error } = await supabase
    .from("agent_conversations")
    .update({
      total_input_tokens: newInputTokens,
      total_output_tokens: newOutputTokens,
      total_cost_usd: newCost,
      sdk_session_metadata: {
        ...currentMetadata,
        lastActiveAt: new Date().toISOString(),
        totalInputTokens: newInputTokens,
        totalOutputTokens: newOutputTokens,
        totalCostUsd: newCost,
        turnCount: (currentMetadata.turnCount || 0) + 1,
      },
    })
    .eq("id", conversationId)

  if (error) {
    console.error("Failed to update session usage:", error)
  }
}

/**
 * Create a new conversation record and return its ID
 *
 * Note: agentId is optional. In team mode, the agent comes from the deployed
 * team config (workspace_deployed_teams) rather than the legacy agents table,
 * so we pass null to avoid foreign key constraint violations.
 */
export async function createConversation(
  supabase: SupabaseClient,
  params: {
    workspaceId: string
    agentId?: string | null
    userId: string
    title?: string
  }
): Promise<string> {
  const { workspaceId, agentId, userId, title } = params

  const { data, error } = await supabase
    .from("agent_conversations")
    .insert({
      workspace_id: workspaceId,
      agent_id: agentId || null,
      user_id: userId,
      title: title || "New Conversation",
      sdk_session_metadata: {
        model: "sonnet",
        tools: [],
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCostUsd: 0,
        turnCount: 0,
      },
    })
    .select("id")
    .single()

  if (error || !data) {
    throw new Error(`Failed to create conversation: ${error?.message}`)
  }

  return data.id
}

/**
 * Calculate estimated cost from token usage
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Claude pricing per 1M tokens
  const pricing: Record<string, { input: number; output: number }> = {
    "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
    "claude-opus-4-20250514": { input: 15.0, output: 75.0 },
    "claude-haiku-4-20250514": { input: 0.25, output: 1.25 },
    // Fallback
    sonnet: { input: 3.0, output: 15.0 },
    opus: { input: 15.0, output: 75.0 },
    haiku: { input: 0.25, output: 1.25 },
  }

  const modelPricing = pricing[model] || pricing.sonnet
  const inputCost = (inputTokens / 1_000_000) * modelPricing.input
  const outputCost = (outputTokens / 1_000_000) * modelPricing.output

  return inputCost + outputCost
}
