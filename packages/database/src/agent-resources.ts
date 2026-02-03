import type { createAdminClient } from './server'
import type { DeployedTeamConfig, DeployedAgent } from './auto-deploy'

type AdminSupabaseClient = ReturnType<typeof createAdminClient>

function generateAgentEmail(agentSlug: string, workspaceId: string): string {
  return `${agentSlug}@agent.workspace-${workspaceId.substring(0, 8)}.local`
}

async function createAgentProfile(
  supabase: AdminSupabaseClient,
  workspaceId: string,
  agent: DeployedAgent
): Promise<string> {
  const email = generateAgentEmail(agent.slug, workspaceId)

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('linked_agent_id', agent.id)
    .eq('agent_workspace_id', workspaceId)
    .single()

  if (existing) {
    return existing.id
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({
      email,
      name: agent.name,
      avatar_url: agent.avatar_url,
      is_agent: true,
      agent_slug: agent.slug,
      linked_agent_id: agent.id,
      agent_workspace_id: workspaceId,
    })
    .select('id')
    .single()

  if (error || !profile) {
    throw new Error(`Failed to create agent profile for ${agent.slug}: ${error?.message || 'Unknown error'}`)
  }

  return profile.id
}

async function addAgentToWorkspace(
  supabase: AdminSupabaseClient,
  workspaceId: string,
  profileId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('profile_id', profileId)
    .single()

  if (existing) return

  const { error } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: workspaceId,
      profile_id: profileId,
      role: 'member',
    })

  if (error) {
    throw new Error(`Failed to add agent to workspace: ${error.message}`)
  }
}

async function createAgentChannel(
  supabase: AdminSupabaseClient,
  workspaceId: string,
  agent: DeployedAgent,
  creatorProfileId: string | null
): Promise<string> {
  const channelName = `agent-${agent.slug}`

  const { data: existing } = await supabase
    .from('channels')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('name', channelName)
    .single()

  if (existing) {
    return existing.id
  }

  const { data: channel, error } = await supabase
    .from('channels')
    .insert({
      workspace_id: workspaceId,
      name: channelName,
      description: `Communication channel for ${agent.name}`,
      is_agent_channel: true,
      linked_agent_id: agent.id,
      created_by: creatorProfileId || null,
    })
    .select('id')
    .single()

  if (error || !channel) {
    throw new Error(`Failed to create agent channel for ${agent.slug}: ${error?.message || 'Unknown error'}`)
  }

  return channel.id
}

async function addProfileToChannel(
  supabase: AdminSupabaseClient,
  channelId: string,
  profileId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('channel_members')
    .select('id')
    .eq('channel_id', channelId)
    .eq('profile_id', profileId)
    .single()

  if (existing) return

  const { error } = await supabase
    .from('channel_members')
    .insert({
      channel_id: channelId,
      profile_id: profileId,
    })

  if (error) {
    throw new Error(`Failed to add profile to channel: ${error.message}`)
  }
}

/**
 * Best-effort provisioning of agent profiles and channels for a deployed team.
 * Safe to call multiple times (idempotent).
 */
export async function ensureAgentResourcesForDeployment(
  supabase: AdminSupabaseClient,
  workspaceId: string,
  deployedConfig: DeployedTeamConfig,
  channelCreatorId?: string | null
): Promise<void> {
  try {
    const agentProfileIds: string[] = []

    for (const agent of deployedConfig.agents) {
      if (!agent.is_enabled) continue
      const profileId = await createAgentProfile(supabase, workspaceId, agent)
      agentProfileIds.push(profileId)
      await addAgentToWorkspace(supabase, workspaceId, profileId)
    }

    for (const agent of deployedConfig.agents) {
      if (!agent.is_enabled) continue
      const channelId = await createAgentChannel(supabase, workspaceId, agent, channelCreatorId || null)

      for (const profileId of agentProfileIds) {
        await addProfileToChannel(supabase, channelId, profileId)
      }

      if (channelCreatorId) {
        await addProfileToChannel(supabase, channelId, channelCreatorId)
      }
    }
  } catch (error) {
    console.error('[agent-resources] Failed to provision agent resources:', error)
  }
}
