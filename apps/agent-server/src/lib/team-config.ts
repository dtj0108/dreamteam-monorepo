/**
 * Team Configuration Loader
 *
 * Loads the deployed team configuration from workspace_deployed_teams table
 * with in-memory caching. When a team is deployed to a workspace, the
 * active_config JSONB column contains the complete DeployedTeamConfig.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { DeployedTeamConfig, DeployedAgent } from "../types/team.js"

// In-memory cache for deployed team configs
// Key: workspaceId, Value: { config, loadedAt }
const configCache = new Map<
  string,
  { config: DeployedTeamConfig; loadedAt: number }
>()

// Cache TTL: 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000

/**
 * Load the deployed team configuration for a workspace
 *
 * Checks in-memory cache first, then loads from database.
 * Only returns active deployments.
 *
 * @param supabase - Supabase client (admin client recommended)
 * @param workspaceId - The workspace to load team config for
 * @returns The deployed team config, or null if no team is deployed
 */
export async function loadDeployedTeamConfig(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<DeployedTeamConfig | null> {
  // Check cache first
  const cached = configCache.get(workspaceId)
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    console.log(
      `[Team Config] Cache hit for workspace ${workspaceId} (age: ${Math.round((Date.now() - cached.loadedAt) / 1000)}s)`
    )
    return cached.config
  }

  // Load from database
  console.log(`[Team Config] Loading config for workspace ${workspaceId}`)
  const { data, error } = await supabase
    .from("workspace_deployed_teams")
    .select("active_config")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .single()

  if (error) {
    // Not an error if no team is deployed (PGRST116 = no rows)
    if (error.code === "PGRST116") {
      console.log(`[Team Config] No team deployed for workspace ${workspaceId}`)
      return null
    }
    console.error(`[Team Config] Error loading config:`, error)
    return null
  }

  if (!data?.active_config) {
    console.log(`[Team Config] No active_config for workspace ${workspaceId}`)
    return null
  }

  const config = data.active_config as DeployedTeamConfig
  console.log(
    `[Team Config] Loaded team "${config.team.name}" with ${config.agents.length} agents`
  )

  // Store in cache
  configCache.set(workspaceId, { config, loadedAt: Date.now() })

  return config
}

/**
 * Get the head agent from a deployed team config
 *
 * The head agent is the entry point for all user interactions.
 * It must be enabled and match the team's head_agent_id.
 *
 * @param config - The deployed team configuration
 * @returns The head agent, or null if not found/disabled
 */
export function getHeadAgent(config: DeployedTeamConfig): DeployedAgent | null {
  if (!config.team.head_agent_id) {
    console.warn(`[Team Config] Team "${config.team.name}" has no head_agent_id`)
    return null
  }

  const headAgent = config.agents.find(
    (a) => a.id === config.team.head_agent_id && a.is_enabled
  )

  if (!headAgent) {
    console.warn(
      `[Team Config] Head agent ${config.team.head_agent_id} not found or disabled`
    )
    return null
  }

  return headAgent
}

/**
 * Get an agent by slug from a deployed team config
 *
 * Used for delegation - finding the target agent to delegate to.
 *
 * @param config - The deployed team configuration
 * @param slug - The agent's slug
 * @returns The agent, or null if not found/disabled
 */
export function getAgentBySlug(
  config: DeployedTeamConfig,
  slug: string
): DeployedAgent | null {
  return config.agents.find((a) => a.slug === slug && a.is_enabled) || null
}

/**
 * Get an agent by ID from a deployed team config
 *
 * Used for direct agent routing - when a user clicks on a specific agent.
 *
 * @param config - The deployed team configuration
 * @param agentId - The agent's ID
 * @returns The agent, or null if not found/disabled
 */
export function getAgentById(
  config: DeployedTeamConfig,
  agentId: string
): DeployedAgent | null {
  return config.agents.find((a) => a.id === agentId && a.is_enabled) || null
}

/**
 * Invalidate the cache for a workspace
 *
 * Call this when a team is redeployed or config is updated.
 *
 * @param workspaceId - The workspace to invalidate cache for
 */
export function invalidateTeamConfigCache(workspaceId: string): void {
  configCache.delete(workspaceId)
  console.log(`[Team Config] Cache invalidated for workspace ${workspaceId}`)
}

/**
 * Clear the entire config cache
 *
 * Use with caution - forces reload of all configs.
 */
export function clearTeamConfigCache(): void {
  configCache.clear()
  console.log(`[Team Config] Entire cache cleared`)
}
