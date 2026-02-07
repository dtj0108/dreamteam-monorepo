/**
 * Auto-deploy functions for workspace team deployment
 * Used when a user subscribes to a plan to automatically deploy the plan's team
 */
import { createAdminClient } from './server'
import {
  provisionDeploymentResources,
  type ProvisionDeploymentSummary,
} from './deployment-resources'

// ============================================
// TYPES (minimal subset needed for deployment)
// ============================================

interface DeployedTool {
  id: string
  name: string
  description: string
  input_schema: Record<string, unknown>
}

interface DeployedSkill {
  id: string
  name: string
  slug: string
  content: string
}

interface DeployedMind {
  id: string
  name: string
  slug: string
  content: string
  category: string
}

interface DeployedRule {
  id: string
  rule_type: string
  content: string
  priority: number
}

interface DeployedAgent {
  id: string
  slug: string
  name: string
  description: string | null
  avatar_url: string | null
  system_prompt: string
  model: string
  provider?: string  // Optional: AI provider (e.g., 'anthropic', 'openai', 'xai')
  is_enabled: boolean
  tools: DeployedTool[]
  skills: DeployedSkill[]
  mind: DeployedMind[]
  rules: DeployedRule[]
}

interface DeployedDelegation {
  id: string
  from_agent_slug: string
  to_agent_slug: string
  condition: string | null
  context_template: string | null
  is_enabled: boolean
}

interface DeployedTeamConfig {
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

interface Customizations {
  disabled_agents: string[]
  disabled_delegations: string[]
  added_mind: DeployedMind[]
  agent_overrides: Record<string, Partial<DeployedAgent>>
}

type SupabaseError = {
  message?: string
  details?: string
  hint?: string
  code?: string
}

function logSupabaseError(context: string, error?: SupabaseError | null) {
  if (!error) return
  console.error(`[auto-deploy] ${context} failed`, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  })
}

function buildProvisioningIncompleteError(summary: ProvisionDeploymentSummary): string {
  return `provisioning_incomplete:${JSON.stringify({
    issues: summary.issues,
    expectedAgents: summary.expectedAgents,
    profiles: summary.profiles,
    channels: summary.channels,
    schedules: summary.schedules,
    templates: summary.templates,
  })}`
}

// ============================================
// BUILD CONFIG SNAPSHOT
// ============================================

/**
 * Build a complete config snapshot from a team template.
 * This is used when deploying a team to a workspace.
 */
async function buildConfigSnapshot(teamId: string): Promise<DeployedTeamConfig> {
  const supabase = createAdminClient()

  // Get team with head agent
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, name, slug, head_agent_id')
    .eq('id', teamId)
    .single()

  if (teamError || !team) {
    logSupabaseError('Team lookup', teamError)
    throw new Error(`Team not found: ${teamId}`)
  }

  // Get team agents with full agent details
  const { data: teamAgents, error: agentsError } = await supabase
    .from('team_agents')
    .select(`
      agent_id,
      role,
      display_order,
      agent:ai_agents(
        id,
        name,
        slug,
        description,
        avatar_url,
        system_prompt,
        model,
        provider
      )
    `)
    .eq('team_id', teamId)
    .order('display_order')

  if (agentsError) {
    logSupabaseError('Team agents lookup', agentsError)
    throw new Error(`Failed to load team agents: ${agentsError.message}`)
  }

  // Build deployed agents with their tools, skills, mind, and rules
  const agents: DeployedAgent[] = await Promise.all(
    (teamAgents || []).map(async (ta: { agent_id: string; role: string; display_order: number; agent: unknown }) => {
      const agentData = ta.agent as unknown as {
        id: string
        name: string
        slug: string
        description: string | null
        avatar_url: string | null
        system_prompt: string
        model: string
        provider: string | null
      } | null

      if (!agentData) {
        throw new Error('Team agent has no associated agent')
      }

      const agent = agentData

      // Get agent tools
      const { data: agentTools, error: toolsError } = await supabase
        .from('ai_agent_tools')
        .select(`
          tool:agent_tools(
            id,
            name,
            description,
            input_schema
          )
        `)
        .eq('agent_id', agent.id)

      const tools: DeployedTool[] = (agentTools || [])
        .filter((at: { tool: unknown }) => at.tool)
        .map((at: { tool: unknown }) => {
          const tool = at.tool as unknown as { id: string; name: string; description: string; input_schema: Record<string, unknown> }
          return {
            id: tool.id,
            name: tool.name,
            description: tool.description || '',
            input_schema: tool.input_schema || {},
          }
        })

      // Get agent skills
      const { data: agentSkills, error: skillsError } = await supabase
        .from('ai_agent_skills')
        .select(`
          skill:agent_skills(
            id,
            name,
            skill_content
          )
        `)
        .eq('agent_id', agent.id)

      const skills: DeployedSkill[] = (agentSkills || [])
        .filter((as: { skill: unknown }) => as.skill)
        .map((as: { skill: unknown }) => {
          const skill = as.skill as unknown as { id: string; name: string; skill_content: string }
          return {
            id: skill.id,
            name: skill.name,
            slug: skill.name.toLowerCase().replace(/\s+/g, '-'),
            content: skill.skill_content,
          }
        })

      // Get agent mind (from agent_mind table if exists)
      const { data: agentMind, error: mindError } = await supabase
        .from('agent_mind')
        .select('id, name, slug, content, category')
        .eq('agent_id', agent.id)
        .eq('is_enabled', true)

      const mind: DeployedMind[] = (agentMind || []).map((m: { id: string; name: string; slug: string; content: string; category: string | null }) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        content: m.content,
        category: m.category || 'general',
      }))

      // Get agent rules
      const { data: agentRules, error: rulesError } = await supabase
        .from('agent_rules')
        .select('id, rule_type, rule_content, priority')
        .eq('agent_id', agent.id)
        .eq('is_enabled', true)
        .order('priority')

      const rules: DeployedRule[] = (agentRules || []).map((r: { id: string; rule_type: string; rule_content: string; priority: number | null }) => ({
        id: r.id,
        rule_type: r.rule_type,
        content: r.rule_content,
        priority: r.priority || 0,
      }))

      return {
        id: agent.id,
        slug: agent.slug || agent.name.toLowerCase().replace(/\s+/g, '-'),
        name: agent.name,
        description: agent.description,
        avatar_url: agent.avatar_url,
        system_prompt: agent.system_prompt,
        model: agent.model || 'sonnet',
        provider: agent.provider || 'anthropic',
        is_enabled: true,
        tools,
        skills,
        mind,
        rules,
      }
    })
  )

  // Get team delegations
  const { data: teamDelegations, error: delegationsError } = await supabase
    .from('team_delegations')
    .select(`
      id,
      from_agent_id,
      to_agent_id,
      condition,
      context_template,
      from_agent:ai_agents!team_delegations_from_agent_id_fkey(slug),
      to_agent:ai_agents!team_delegations_to_agent_id_fkey(slug)
    `)
    .eq('team_id', teamId)

  if (delegationsError) {
    logSupabaseError('Team delegations lookup', delegationsError)
    throw new Error(`Failed to load team delegations: ${delegationsError.message}`)
  }

  const delegations: DeployedDelegation[] = (teamDelegations || []).map((d: { id: string; from_agent_id: string; to_agent_id: string; condition: string | null; context_template: string | null; from_agent: unknown; to_agent: unknown }) => {
    const fromAgent = d.from_agent as unknown as { slug: string } | null
    const toAgent = d.to_agent as unknown as { slug: string } | null
    return {
      id: d.id,
      from_agent_slug: fromAgent?.slug || '',
      to_agent_slug: toAgent?.slug || '',
      condition: d.condition,
      context_template: d.context_template,
      is_enabled: true,
    }
  })

  // Get team mind files
  const { data: teamMindData } = await supabase
    .from('team_mind')
    .select(`
      mind:agent_mind(
        id,
        name,
        slug,
        content,
        category
      )
    `)
    .eq('team_id', teamId)

  const team_mind: DeployedMind[] = (teamMindData || [])
    .filter((tm: { mind: unknown }) => tm.mind)
    .map((tm: { mind: unknown }) => {
      const mind = tm.mind as unknown as { id: string; name: string; slug: string; content: string; category: string }
      return {
        id: mind.id,
        name: mind.name,
        slug: mind.slug,
        content: mind.content,
        category: mind.category || 'general',
      }
    })

  return {
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
      head_agent_id: team.head_agent_id,
    },
    agents,
    delegations,
    team_mind,
  }
}

async function insertDeploymentWithRetry(
  supabase: ReturnType<typeof createAdminClient>,
  payload: {
    workspace_id: string
    source_team_id: string
    source_version: number
    base_config: DeployedTeamConfig
    customizations: Customizations
    active_config: DeployedTeamConfig
    deployed_by: string | null
    status: 'active' | 'paused' | 'failed'
    previous_deployment_id: string | null
  },
  maxRetries = 1
) {
  let lastError: { message?: string } | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const { data, error } = await supabase
      .from('workspace_deployed_teams')
      .insert(payload)
      .select('id')
      .single()

    if (!error && data) {
      return { data, error: null }
    }

    lastError = error
    const message = error?.message || ''

    // Retry once on transient network failures
    if (attempt < maxRetries && message.includes('fetch failed')) {
      const delayMs = 500 * (attempt + 1)
      console.warn(`[auto-deploy] Deployment insert fetch failed (attempt ${attempt + 1}), retrying in ${delayMs}ms`)
      logSupabaseError('Deployment insert (fetch failed)', error as SupabaseError)
      await new Promise(resolve => setTimeout(resolve, delayMs))
      continue
    }

    break
  }

  return { data: null, error: lastError }
}

// ============================================
// APPLY CUSTOMIZATIONS
// ============================================

/**
 * Apply workspace customizations to a base config to produce the active config.
 */
function applyCustomizations(
  baseConfig: DeployedTeamConfig,
  customizations: Customizations
): DeployedTeamConfig {
  // Deep clone the base config
  const config: DeployedTeamConfig = JSON.parse(JSON.stringify(baseConfig))

  // Disable agents that are in the disabled list
  const disabledAgents = customizations.disabled_agents || []
  for (const agent of config.agents) {
    agent.is_enabled = !disabledAgents.includes(agent.slug)
  }

  // Disable delegations that are in the disabled list
  const disabledDelegations = customizations.disabled_delegations || []
  for (const delegation of config.delegations) {
    delegation.is_enabled = !disabledDelegations.includes(delegation.id)
  }

  // Add workspace-specific mind files
  const addedMind = customizations.added_mind || []
  config.team_mind = [...config.team_mind, ...addedMind]

  // Apply per-agent overrides
  const agentOverrides = customizations.agent_overrides || {}
  for (const [slug, overrides] of Object.entries(agentOverrides)) {
    const agent = config.agents.find((a) => a.slug === slug)
    if (agent && overrides) {
      if (overrides.system_prompt !== undefined) {
        agent.system_prompt = overrides.system_prompt
      }
      if (overrides.model !== undefined) {
        agent.model = overrides.model
      }
      if (overrides.is_enabled !== undefined) {
        agent.is_enabled = overrides.is_enabled
      }
    }
  }

  return config
}

// ============================================
// AUTO-DEPLOY TEAM FOR PLAN
// ============================================

export interface AutoDeployResult {
  deployed: boolean
  teamId?: string
  deploymentId?: string
  error?: string
  errorCode?: 'provisioning_incomplete'
  provisioning?: ProvisionDeploymentSummary
}

/**
 * Auto-deploy a team to a workspace based on plan subscription.
 *
 * @param workspaceId - The workspace to deploy to
 * @param planSlug - The plan slug ('starter', 'growth', 'scale')
 * @param createdByUserId - Optional user ID who triggered the deployment
 * @returns Result indicating success or failure
 */
export async function autoDeployTeamForPlan(
  workspaceId: string,
  planSlug: string,
  createdByUserId?: string
): Promise<AutoDeployResult> {
  const supabase = createAdminClient()

  try {
    // 1. Look up plan by slug to get team_id
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id, team_id')
      .eq('slug', planSlug)
      .eq('is_active', true)
      .single()

    if (planError || !plan) {
      logSupabaseError('Plan lookup', planError)
      console.log(`[auto-deploy] Plan not found: ${planSlug}`)
      return { deployed: false, error: `Plan not found: ${planSlug}` }
    }

    if (!plan.team_id) {
      console.log(`[auto-deploy] Plan ${planSlug} has no associated team`)
      return { deployed: false, error: `Plan ${planSlug} has no associated team` }
    }

    const teamId = plan.team_id

    // 2. Check if workspace already has an active deployment
    const { data: existingDeployment } = await supabase
      .from('workspace_deployed_teams')
      .select('id, source_team_id, active_config')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .single()

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single()

    if (workspaceError) {
      logSupabaseError('Workspace lookup', workspaceError)
    }

    const ownerId = workspace?.owner_id || undefined

    // If already deployed with the same team, skip
    if (existingDeployment && existingDeployment.source_team_id === teamId) {
      console.log(`[auto-deploy] Workspace ${workspaceId} already has team ${teamId} deployed`)
      const existingConfig = existingDeployment.active_config as DeployedTeamConfig | null
      const configToUse = existingConfig || await buildConfigSnapshot(teamId)
      const provisioning = await provisionDeploymentResources(supabase, workspaceId, configToUse, {
        channelCreatorId: ownerId || createdByUserId || null,
        createdByUserId: createdByUserId || ownerId,
        retryOnce: true,
      })
      if (!provisioning.isComplete) {
        return {
          deployed: false,
          teamId,
          deploymentId: existingDeployment.id,
          errorCode: 'provisioning_incomplete',
          error: buildProvisioningIncompleteError(provisioning),
          provisioning,
        }
      }
      return { deployed: true, teamId, deploymentId: existingDeployment.id }
    }

    // 3. Get team version
    const { data: team } = await supabase
      .from('teams')
      .select('current_version')
      .eq('id', teamId)
      .single()

    const sourceVersion = team?.current_version || 1

    // 4. Build config snapshot
    const baseConfig = await buildConfigSnapshot(teamId)
    console.log('[auto-deploy] base_config summary:', {
      agents: baseConfig.agents.length,
      enabledAgents: baseConfig.agents.filter(agent => agent.is_enabled).length,
      delegations: baseConfig.delegations.length,
      teamMind: baseConfig.team_mind.length,
    })

    // 5. Create new deployment in a staged state.
    // We only activate and disable old schedules after provisioning is complete.
    const emptyCustomizations: Customizations = {
      disabled_agents: [],
      disabled_delegations: [],
      added_mind: [],
      agent_overrides: {},
    }

    // Resolve owner for channel creation and schedule attribution
    let resolvedCreatedByUserId = createdByUserId
    if (!resolvedCreatedByUserId) {
      resolvedCreatedByUserId = ownerId
    }

    const baseConfigSize = JSON.stringify(baseConfig).length
    console.log(`[auto-deploy] base_config size: ${baseConfigSize} bytes`)

    const { data: deployment, error: insertError } = await insertDeploymentWithRetry(
      supabase,
      {
        workspace_id: workspaceId,
        source_team_id: teamId,
        source_version: sourceVersion,
        base_config: baseConfig,
        customizations: emptyCustomizations,
        active_config: baseConfig, // Same as base_config since no customizations
        deployed_by: resolvedCreatedByUserId || null,
        status: 'paused',
        previous_deployment_id: existingDeployment?.id || null,
      },
      1
    )

    if (insertError) {
      logSupabaseError('Deployment insert', insertError as SupabaseError)
      return { deployed: false, error: insertError.message }
    }

    const provisioning = await provisionDeploymentResources(supabase, workspaceId, baseConfig, {
      channelCreatorId: ownerId || resolvedCreatedByUserId || null,
      createdByUserId: resolvedCreatedByUserId,
      retryOnce: true,
    })

    if (!provisioning.isComplete) {
      // Keep staged deployment non-active so we don't expose a partial deployment.
      await supabase
        .from('workspace_deployed_teams')
        .update({ status: 'failed' })
        .eq('id', deployment.id)

      return {
        deployed: false,
        teamId,
        deploymentId: deployment.id,
        errorCode: 'provisioning_incomplete',
        error: buildProvisioningIncompleteError(provisioning),
        provisioning,
      }
    }

    // Provisioning is complete. If replacing an existing deployment, cut over now.
    if (existingDeployment) {
      const { error: replaceError } = await supabase
        .from('workspace_deployed_teams')
        .update({ status: 'replaced' })
        .eq('id', existingDeployment.id)

      if (replaceError) {
        logSupabaseError('Existing deployment replace', replaceError as SupabaseError)
        return { deployed: false, error: replaceError.message || 'Failed to replace existing deployment' }
      }

      // Disable schedules for old deployment agents after successful provisioning.
      const { data: oldDeployedAgents } = await supabase
        .from('workspace_deployed_agents')
        .select('agent_id')
        .eq('deployment_id', existingDeployment.id)

      if (oldDeployedAgents && oldDeployedAgents.length > 0) {
        const oldAgentIds = oldDeployedAgents.map((a: { agent_id: string }) => a.agent_id)
        const { error: disableError } = await supabase
          .from('agent_schedules')
          .update({
            is_enabled: false,
            updated_at: new Date().toISOString(),
          })
          .eq('workspace_id', workspaceId)
          .eq('is_template', false)
          .in('agent_id', oldAgentIds)
          .eq('is_enabled', true)

        if (disableError) {
          console.error(`[auto-deploy] Failed to disable old schedules:`, disableError)
        } else {
          console.log(`[auto-deploy] Disabled schedules for ${oldAgentIds.length} old agents in workspace ${workspaceId}`)
        }
      }
    }

    const { error: activateError } = await supabase
      .from('workspace_deployed_teams')
      .update({ status: 'active' })
      .eq('id', deployment.id)

    if (activateError) {
      logSupabaseError('Deployment activation', activateError as SupabaseError)
      if (existingDeployment) {
        await supabase
          .from('workspace_deployed_teams')
          .update({ status: 'active' })
          .eq('id', existingDeployment.id)
      }
      return { deployed: false, error: activateError.message || 'Failed to activate deployment' }
    }

    console.log(`[auto-deploy] Successfully deployed team ${teamId} to workspace ${workspaceId}`)
    return { deployed: true, teamId, deploymentId: deployment.id }

  } catch (error) {
    console.error(`[auto-deploy] Error:`, error)
    return {
      deployed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get a workspace's active deployed team configuration.
 */
export async function getWorkspaceDeployment(workspaceId: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('workspace_deployed_teams')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .single()

  if (error || !data) {
    return null
  }

  return data
}

/**
 * Toggle an agent's enabled state in a workspace deployment.
 *
 * @param workspaceId - The workspace ID
 * @param agentSlug - The agent's slug to toggle
 * @param enabled - Whether the agent should be enabled
 * @param modifiedByUserId - Optional user ID who made the change
 */
export async function toggleAgentEnabled(
  workspaceId: string,
  agentSlug: string,
  enabled: boolean,
  modifiedByUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  try {
    // Get current deployment
    const { data: deployment, error: fetchError } = await supabase
      .from('workspace_deployed_teams')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .single()

    if (fetchError || !deployment) {
      return { success: false, error: 'No active deployment found for workspace' }
    }

    // Get current customizations
    const currentCustomizations = (deployment.customizations as Customizations) || {
      disabled_agents: [],
      disabled_delegations: [],
      added_mind: [],
      agent_overrides: {},
    }

    // Update disabled_agents list
    const disabledAgents = new Set(currentCustomizations.disabled_agents)

    if (enabled) {
      // Remove from disabled list to enable
      disabledAgents.delete(agentSlug)
    } else {
      // Add to disabled list to disable
      disabledAgents.add(agentSlug)
    }

    const newCustomizations: Customizations = {
      ...currentCustomizations,
      disabled_agents: Array.from(disabledAgents),
    }

    // Compute active config
    const activeConfig = applyCustomizations(
      deployment.base_config as DeployedTeamConfig,
      newCustomizations
    )

    // Update deployment
    const { error: updateError } = await supabase
      .from('workspace_deployed_teams')
      .update({
        customizations: newCustomizations,
        active_config: activeConfig,
        last_customized_at: new Date().toISOString(),
        last_customized_by: modifiedByUserId || null,
      })
      .eq('id', deployment.id)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    if (enabled) {
      let ownerId: string | null = null
      try {
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('owner_id')
          .eq('id', workspaceId)
          .single()
        ownerId = workspace?.owner_id || null
      } catch (error) {
        console.warn('[auto-deploy] Failed to load workspace owner for provisioning:', error)
      }

      const resolvedCreatedBy = modifiedByUserId || ownerId

      const provisioning = await provisionDeploymentResources(supabase, workspaceId, activeConfig, {
        channelCreatorId: resolvedCreatedBy || null,
        createdByUserId: resolvedCreatedBy || undefined,
        retryOnce: true,
      })

      if (!provisioning.isComplete) {
        return {
          success: false,
          error: buildProvisioningIncompleteError(provisioning),
        }
      }
    }

    return { success: true }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Export types for use in other modules
export type { DeployedTeamConfig, DeployedAgent, Customizations }
