/**
 * Auto-deploy functions for workspace team deployment
 * Used when a user subscribes to a plan to automatically deploy the plan's team
 */
import { createAdminClient } from './server'

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
  provider: string
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
      const { data: agentTools } = await supabase
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
      const { data: agentSkills } = await supabase
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
      const { data: agentMind } = await supabase
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
      const { data: agentRules } = await supabase
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
      .select('id, source_team_id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .single()

    // If already deployed with the same team, skip
    if (existingDeployment && existingDeployment.source_team_id === teamId) {
      console.log(`[auto-deploy] Workspace ${workspaceId} already has team ${teamId} deployed`)
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

    // 5. Mark existing deployment as replaced (if any)
    if (existingDeployment) {
      await supabase
        .from('workspace_deployed_teams')
        .update({ status: 'replaced' })
        .eq('id', existingDeployment.id)

      // 5b. Clean up scheduled tasks from the old deployment's agents
      const { data: oldDeployedAgents } = await supabase
        .from('workspace_deployed_agents')
        .select('agent_id')
        .eq('deployment_id', existingDeployment.id)

      if (oldDeployedAgents && oldDeployedAgents.length > 0) {
        const oldAgentIds = oldDeployedAgents.map((a: { agent_id: string }) => a.agent_id)

        // Delete schedules for these old agents (non-template schedules only)
        const { error: deleteError } = await supabase
          .from('agent_schedules')
          .delete()
          .eq('workspace_id', workspaceId)
          .eq('is_template', false)
          .in('agent_id', oldAgentIds)

        if (deleteError) {
          console.error(`[auto-deploy] Failed to clean up old schedules:`, deleteError)
        } else {
          console.log(`[auto-deploy] Cleaned up schedules for ${oldAgentIds.length} old agents in workspace ${workspaceId}`)
        }
      }
    }

    // 6. Create new deployment with empty customizations
    const emptyCustomizations: Customizations = {
      disabled_agents: [],
      disabled_delegations: [],
      added_mind: [],
      agent_overrides: {},
    }

    // Resolve creator for schedule authorization (fallback to workspace owner)
    let resolvedCreatedByUserId = createdByUserId
    if (!resolvedCreatedByUserId) {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .single()
      resolvedCreatedByUserId = workspace?.owner_id || undefined
    }

    const { data: deployment, error: insertError } = await supabase
      .from('workspace_deployed_teams')
      .insert({
        workspace_id: workspaceId,
        source_team_id: teamId,
        source_version: sourceVersion,
        base_config: baseConfig,
        customizations: emptyCustomizations,
        active_config: baseConfig, // Same as base_config since no customizations
        deployed_by: resolvedCreatedByUserId || null,
        status: 'active',
        previous_deployment_id: existingDeployment?.id || null,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error(`[auto-deploy] Failed to create deployment:`, insertError)
      return { deployed: false, error: insertError.message }
    }

    // Clone schedule templates for all agents in the team
    await cloneScheduleTemplatesForDeployment(
      supabase,
      baseConfig.agents.map(a => a.id),
      workspaceId,
      resolvedCreatedByUserId
    )

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

    return { success: true }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Clone schedule templates for all agents in a deployment.
 * Called after team deployment to ensure all agents have their scheduled tasks.
 */
async function cloneScheduleTemplatesForDeployment(
  supabase: ReturnType<typeof createAdminClient>,
  agentIds: string[],
  workspaceId: string,
  createdByUserId?: string
): Promise<void> {
  if (agentIds.length === 0) return

  try {
    // Fetch all schedule templates for these agents in one query
    const { data: templates, error: fetchError } = await supabase
      .from('agent_schedules')
      .select('*')
      .in('agent_id', agentIds)
      .eq('is_template', true)

    if (fetchError) {
      console.error('[auto-deploy] Error fetching schedule templates:', fetchError)
      return
    }

    if (!templates?.length) {
      console.log('[auto-deploy] No schedule templates to clone')
      return
    }

    // Check for existing workspace schedules to avoid duplicates
    const { data: existingSchedules } = await supabase
      .from('agent_schedules')
      .select('agent_id, name')
      .eq('workspace_id', workspaceId)
      .eq('is_template', false)

    const existingKeys = new Set(
      (existingSchedules || []).map((s: { agent_id: string; name: string }) => `${s.agent_id}:${s.name}`)
    )

    // Clone templates that don't already exist for this workspace
    const schedulesToCreate = templates
      .filter((t: { agent_id: string; name: string }) => !existingKeys.has(`${t.agent_id}:${t.name}`))
      .map((template: {
        agent_id: string
        name: string
        description: string | null
        cron_expression: string
        timezone: string | null
        task_prompt: string
        requires_approval: boolean
        output_config: unknown
      }) => ({
        agent_id: template.agent_id,
        workspace_id: workspaceId,
        name: template.name,
        description: template.description,
        cron_expression: template.cron_expression,
        timezone: template.timezone || 'UTC',
        task_prompt: template.task_prompt,
        requires_approval: template.requires_approval,
        output_config: template.output_config,
        is_enabled: true,
        is_template: false,
        // Set next_run_at to 1 minute from now - the scheduler will calculate the actual time
        next_run_at: new Date(Date.now() + 60 * 1000).toISOString(),
        created_by: createdByUserId || null,
      }))

    if (schedulesToCreate.length === 0) {
      console.log('[auto-deploy] All schedule templates already cloned for workspace')
      return
    }

    const { error: insertError } = await supabase
      .from('agent_schedules')
      .insert(schedulesToCreate)

    if (insertError) {
      console.error('[auto-deploy] Error cloning schedule templates:', insertError)
    } else {
      console.log(`[auto-deploy] Cloned ${schedulesToCreate.length} schedule templates for workspace ${workspaceId}`)
    }
  } catch (error) {
    // Log but don't fail the deployment if schedule cloning fails
    console.error('[auto-deploy] Error in cloneScheduleTemplatesForDeployment:', error)
  }
}

// Export types for use in other modules
export type { DeployedTeamConfig, DeployedAgent, Customizations }
