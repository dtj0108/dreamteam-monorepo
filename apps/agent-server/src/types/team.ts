/**
 * Team Type Definitions for Agent Server
 *
 * These types represent the deployed team configuration loaded from
 * the workspace_deployed_teams table's active_config JSONB column.
 *
 * Copied from admin panel's src/types/teams.ts (deployed team types only).
 */

// ============================================
// DEPLOYED TEAM TYPES
// ============================================

export interface DeployedAgent {
  id: string
  slug: string
  name: string
  description: string | null
  avatar_url: string | null
  system_prompt: string
  model: string  // Model name or alias (e.g., 'sonnet', 'gpt-4o', 'grok-3', 'gemini-flash')
  provider?: string  // AI provider (e.g., 'anthropic', 'openai', 'xai', 'google')
  is_enabled: boolean // Can be toggled per-workspace
  tools: DeployedTool[]
  skills: DeployedSkill[]
  mind: DeployedMind[]
  rules: DeployedRule[]
}

export interface DeployedTool {
  id: string
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export interface DeployedSkill {
  id: string
  name: string
  slug: string
  content: string
}

export interface DeployedMind {
  id: string
  name: string
  slug: string
  content: string
  category: string
}

export interface DeployedRule {
  id: string
  rule_type: string
  content: string
  priority: number
}

export interface DeployedDelegation {
  id: string
  from_agent_slug: string
  to_agent_slug: string
  condition: string | null
  context_template: string | null
  is_enabled: boolean // Can be toggled per-workspace
}

export interface DeployedTeamConfig {
  team: {
    id: string
    name: string
    slug: string
    head_agent_id: string | null
  }
  agents: DeployedAgent[]
  delegations: DeployedDelegation[]
  team_mind: DeployedMind[]
}

export interface Customizations {
  disabled_agents: string[] // Agent slugs to disable
  disabled_delegations: string[] // Delegation IDs to disable
  added_mind: DeployedMind[] // Workspace-specific mind files
  agent_overrides: Record<string, Partial<DeployedAgent>> // Per-agent tweaks
}

export type DeploymentStatus = "active" | "paused" | "replaced" | "failed"

export interface WorkspaceDeployedTeam {
  id: string
  workspace_id: string
  source_team_id: string
  source_version: number
  base_config: DeployedTeamConfig
  customizations: Customizations
  active_config: DeployedTeamConfig
  deployed_at: string
  deployed_by: string | null
  last_customized_at: string | null
  last_customized_by: string | null
  status: DeploymentStatus
  previous_deployment_id: string | null
  created_at: string
  updated_at: string
}
