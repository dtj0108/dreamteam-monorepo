import type { createAdminClient } from './server'
import type { DeployedTeamConfig } from './auto-deploy'
import { cloneScheduleTemplatesForDeployment } from './schedule-templates'
import { ensureAgentResourcesForDeployment } from './agent-resources'

type AdminSupabaseClient = ReturnType<typeof createAdminClient>

type LogContext = {
  actorId?: string | null
  actorEmail?: string | null
  requestId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

export type ProvisionDeploymentOptions = {
  channelCreatorId?: string | null
  createdByUserId?: string | null
  logContext?: LogContext
  retryOnce?: boolean
}

export type ProvisionDeploymentSummary = {
  expectedAgents: number
  profiles: number
  channels: number
  schedules: number
  templates: number
}

type ProvisionCounts = {
  profiles: number
  channels: number
  schedules: number
  templates: number
  templateAgents: number
}

function getEnabledAgentIds(config: DeployedTeamConfig): string[] {
  return config.agents.filter(agent => agent.is_enabled).map(agent => agent.id)
}

async function fetchProvisionCounts(
  supabase: AdminSupabaseClient,
  workspaceId: string,
  agentIds: string[]
): Promise<ProvisionCounts> {
  const { count: profileCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('agent_workspace_id', workspaceId)
    .eq('is_agent', true)

  const { count: channelCount } = await supabase
    .from('channels')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('is_agent_channel', true)

  const { count: scheduleCount } = await supabase
    .from('agent_schedules')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('is_template', false)

  let templates = 0
  let templateAgents = 0

  if (agentIds.length > 0) {
    const { data: templateRows } = await supabase
      .from('agent_schedules')
      .select('agent_id')
      .in('agent_id', agentIds)
      .eq('is_template', true)

    templates = templateRows?.length || 0
    templateAgents = new Set((templateRows || []).map((row: { agent_id: string }) => row.agent_id)).size
  }

  return {
    profiles: profileCount || 0,
    channels: channelCount || 0,
    schedules: scheduleCount || 0,
    templates,
    templateAgents,
  }
}

async function logProvisioningIssue(
  supabase: AdminSupabaseClient,
  workspaceId: string,
  metadata: Record<string, unknown>,
  logContext?: LogContext
): Promise<void> {
  try {
    const details = {
      ...metadata,
      actorEmail: logContext?.actorEmail || null,
      requestId: logContext?.requestId || null,
    }

    await supabase.from('audit_logs').insert({
      action: 'deployment_provisioning_incomplete',
      resource_type: 'workspace',
      resource_id: workspaceId,
      workspace_id: workspaceId,
      user_id: logContext?.actorId || null,
      details,
      ip_address: logContext?.ipAddress || null,
      user_agent: logContext?.userAgent || null,
    })
  } catch (error) {
    console.error('[deployment-resources] Failed to write audit log:', error)
  }
}

/**
 * Provision schedules and agent resources for a deployment with safety checks.
 * Best-effort: retries once and logs to audit_logs if still incomplete.
 */
export async function provisionDeploymentResources(
  supabase: AdminSupabaseClient,
  workspaceId: string,
  deployedConfig: DeployedTeamConfig,
  options: ProvisionDeploymentOptions = {}
): Promise<ProvisionDeploymentSummary> {
  const enabledAgentIds = getEnabledAgentIds(deployedConfig)
  const expectedAgents = enabledAgentIds.length

  if (expectedAgents === 0) {
    return { expectedAgents: 0, profiles: 0, channels: 0, schedules: 0, templates: 0 }
  }

  const runProvisioning = async () => {
    await cloneScheduleTemplatesForDeployment(
      supabase,
      enabledAgentIds,
      workspaceId,
      options.createdByUserId || undefined
    )

    await ensureAgentResourcesForDeployment(
      supabase,
      workspaceId,
      deployedConfig,
      options.channelCreatorId || null
    )
  }

  try {
    await runProvisioning()
  } catch (error) {
    console.error('[deployment-resources] Provisioning attempt failed:', error)
  }

  let counts = await fetchProvisionCounts(supabase, workspaceId, enabledAgentIds)
  let incomplete =
    counts.profiles < expectedAgents ||
    counts.channels < expectedAgents ||
    counts.schedules === 0

  if (incomplete && options.retryOnce !== false) {
    try {
      await runProvisioning()
    } catch (error) {
      console.error('[deployment-resources] Retry failed:', error)
    }

    counts = await fetchProvisionCounts(supabase, workspaceId, enabledAgentIds)
    incomplete =
      counts.profiles < expectedAgents ||
      counts.channels < expectedAgents ||
      counts.schedules === 0
  }

  if (incomplete) {
    await logProvisioningIssue(
      supabase,
      workspaceId,
      {
        expectedAgents,
        profiles: counts.profiles,
        channels: counts.channels,
        schedules: counts.schedules,
        templates: counts.templates,
        templateAgents: counts.templateAgents,
        templateMissing: counts.templateAgents < expectedAgents,
        createdByUserId: options.createdByUserId || null,
        channelCreatorId: options.channelCreatorId || null,
      },
      options.logContext
    )
  }

  return {
    expectedAgents,
    profiles: counts.profiles,
    channels: counts.channels,
    schedules: counts.schedules,
    templates: counts.templates,
  }
}
