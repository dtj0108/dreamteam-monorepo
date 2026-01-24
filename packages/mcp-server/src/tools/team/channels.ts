import { z } from 'zod'
import { getSupabase, validateWorkspaceAccess } from '../../auth.js'
import { resolveWorkspaceId } from '../../lib/context.js'
import {
  workspaceIdSchema,
  success,
  error,
  type ToolResult,
} from '../../types.js'

// Notification preference schema
const notificationPreferenceSchema = z.enum(['all', 'mentions', 'none'])

// Tool definitions for channels
export const channelTools = {
  channel_list: {
    description: 'List all channels in the workspace',
    inputSchema: workspaceIdSchema.extend({
      include_private: z.boolean().optional().describe('Include private channels the user is a member of'),
    }),
    handler: channelList,
  },

  channel_get: {
    description: 'Get channel details',
    inputSchema: workspaceIdSchema.extend({
      channel_id: z.string().uuid().describe('The channel ID'),
    }),
    handler: channelGet,
  },

  channel_create: {
    description: 'Create a new channel',
    inputSchema: workspaceIdSchema.extend({
      name: z.string().min(1).max(100).describe('Channel name'),
      description: z.string().optional().describe('Channel description'),
      is_private: z.boolean().optional().describe('Make this a private channel'),
    }),
    handler: channelCreate,
  },

  channel_update: {
    description: 'Update a channel',
    inputSchema: workspaceIdSchema.extend({
      channel_id: z.string().uuid().describe('The channel ID'),
      name: z.string().min(1).max(100).optional().describe('Channel name'),
      description: z.string().optional().describe('Channel description'),
    }),
    handler: channelUpdate,
  },

  channel_delete: {
    description: 'Archive/delete a channel',
    inputSchema: workspaceIdSchema.extend({
      channel_id: z.string().uuid().describe('The channel ID to delete'),
    }),
    handler: channelDelete,
  },

  channel_join: {
    description: 'Join a channel',
    inputSchema: workspaceIdSchema.extend({
      channel_id: z.string().uuid().describe('The channel ID to join'),
    }),
    handler: channelJoin,
  },

  channel_leave: {
    description: 'Leave a channel',
    inputSchema: workspaceIdSchema.extend({
      channel_id: z.string().uuid().describe('The channel ID to leave'),
    }),
    handler: channelLeave,
  },

  channel_add_member: {
    description: 'Add a member to a channel',
    inputSchema: workspaceIdSchema.extend({
      channel_id: z.string().uuid().describe('The channel ID'),
      member_id: z.string().uuid().describe('The workspace member ID to add'),
    }),
    handler: channelAddMember,
  },

  channel_remove_member: {
    description: 'Remove a member from a channel',
    inputSchema: workspaceIdSchema.extend({
      channel_id: z.string().uuid().describe('The channel ID'),
      member_id: z.string().uuid().describe('The workspace member ID to remove'),
    }),
    handler: channelRemoveMember,
  },

  channel_get_members: {
    description: 'List all members of a channel',
    inputSchema: workspaceIdSchema.extend({
      channel_id: z.string().uuid().describe('The channel ID'),
    }),
    handler: channelGetMembers,
  },

  channel_set_notifications: {
    description: 'Set notification preferences for a channel',
    inputSchema: workspaceIdSchema.extend({
      channel_id: z.string().uuid().describe('The channel ID'),
      notifications: notificationPreferenceSchema.describe('Notification preference'),
    }),
    handler: channelSetNotifications,
  },
}

// Handler implementations

async function channelList(params: {
  workspace_id?: string
  include_private?: boolean
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get public channels
    let query = supabase
      .from('channels')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('is_archived', false)
      .order('name', { ascending: true })

    if (!params.include_private) {
      query = query.eq('is_private', false)
    }

    const { data, error: dbError } = await query

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    let channels = data || []

    // If including private, filter to ones user is a member of
    if (params.include_private) {
      const { data: memberships } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('profile_id', member.profile_id)

      const memberChannelIds = new Set((memberships || []).map(m => m.channel_id))

      channels = channels.filter(ch =>
        !ch.is_private || memberChannelIds.has(ch.id)
      )
    }

    // Get member counts for each channel
    const channelIds = channels.map(c => c.id)
    if (channelIds.length > 0) {
      const { data: memberCounts } = await supabase
        .from('channel_members')
        .select('channel_id')
        .in('channel_id', channelIds)

      const countByChannel = (memberCounts || []).reduce((acc: Record<string, number>, m) => {
        acc[m.channel_id] = (acc[m.channel_id] || 0) + 1
        return acc
      }, {})

      channels = channels.map(ch => ({
        ...ch,
        member_count: countByChannel[ch.id] || 0,
      }))
    }

    return success({
      channels,
      count: channels.length,
    })
  } catch (err) {
    return error(`Failed to list channels: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function channelGet(params: {
  workspace_id?: string
  channel_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('channels')
      .select(`
        *,
        created_by_profile:profiles!channels_created_by_fkey(id, name, avatar_url)
      `)
      .eq('id', params.channel_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return success({
          message: 'No channel found with this ID',
          channel: null,
        })
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    // If private, check membership
    if (data.is_private) {
      const { data: membership } = await supabase
        .from('channel_members')
        .select('id')
        .eq('channel_id', params.channel_id)
        .eq('profile_id', member.profile_id)
        .single()

      if (!membership) {
        return success({
          message: 'No channel found with this ID',
          channel: null,
        })
      }
    }

    // Get member count
    const { count: memberCount } = await supabase
      .from('channel_members')
      .select('id', { count: 'exact', head: true })
      .eq('channel_id', params.channel_id)

    return success({
      ...data,
      member_count: memberCount || 0,
    })
  } catch (err) {
    return error(`Failed to get channel: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function channelCreate(params: {
  workspace_id?: string
  name: string
  description?: string
  is_private?: boolean
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Check if channel name already exists in workspace
    const { data: existing } = await supabase
      .from('channels')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('name', params.name)
      .single()

    if (existing) {
      return error('A channel with this name already exists')
    }

    const { data, error: dbError } = await supabase
      .from('channels')
      .insert({
        workspace_id: workspace_id,
        name: params.name,
        description: params.description || null,
        is_private: params.is_private || false,
        created_by: member.profile_id === '00000000-0000-0000-0000-000000000000' ? null : member.profile_id,
      })
      .select('*')
      .single()

    if (dbError) {
      return error(`Failed to create channel: ${dbError.message}`)
    }

    // Add creator as a member
    await supabase
      .from('channel_members')
      .insert({
        channel_id: data.id,
        profile_id: member.profile_id,
        notifications: 'all',
      })

    return success({
      message: 'Channel created successfully',
      channel: data,
    })
  } catch (err) {
    return error(`Failed to create channel: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function channelUpdate(params: {
  workspace_id?: string
  channel_id: string
  name?: string
  description?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify channel exists and user has access
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, created_by')
      .eq('id', params.channel_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (channelError || !channel) {
      return success({
          message: 'No channel found with this ID',
          channel: null,
        })
    }

    // Only creator or admins can update channel
    if (channel.created_by !== member.profile_id && member.role !== 'admin' && member.role !== 'owner') {
      return error('Only the channel creator or admins can update the channel')
    }

    const updateData: Record<string, unknown> = {}
    if (params.name !== undefined) updateData.name = params.name
    if (params.description !== undefined) updateData.description = params.description

    if (Object.keys(updateData).length === 0) {
      return success({
        message: 'No fields provided to update',
        channel: null,
        updated: false,
      })
    }

    const { data, error: dbError } = await supabase
      .from('channels')
      .update(updateData)
      .eq('id', params.channel_id)
      .select('*')
      .single()

    if (dbError) {
      return error(`Failed to update channel: ${dbError.message}`)
    }

    return success({
      message: 'Channel updated successfully',
      channel: data,
    })
  } catch (err) {
    return error(`Failed to update channel: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function channelDelete(params: {
  workspace_id?: string
  channel_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify channel exists
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, created_by, name')
      .eq('id', params.channel_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (channelError || !channel) {
      return success({
          message: 'No channel found with this ID',
          channel: null,
        })
    }

    // Only creator or admins can delete channel
    if (channel.created_by !== member.profile_id && member.role !== 'admin' && member.role !== 'owner') {
      return error('Only the channel creator or admins can delete the channel')
    }

    // Archive instead of hard delete to preserve messages
    const { error: dbError } = await supabase
      .from('channels')
      .update({ is_archived: true })
      .eq('id', params.channel_id)

    if (dbError) {
      return error(`Failed to delete channel: ${dbError.message}`)
    }

    return success({
      message: 'Channel archived successfully',
      channel_id: params.channel_id,
      channel_name: channel.name,
    })
  } catch (err) {
    return error(`Failed to delete channel: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function channelJoin(params: {
  workspace_id?: string
  channel_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify channel exists
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, name, is_private')
      .eq('id', params.channel_id)
      .eq('workspace_id', workspace_id)
      .eq('is_archived', false)
      .single()

    if (channelError || !channel) {
      return success({
          message: 'No channel found with this ID',
          channel: null,
        })
    }

    // Cannot join private channels directly
    if (channel.is_private) {
      return error('Cannot join a private channel. Ask to be added by a member.')
    }

    // Check if already a member
    const { data: existingMembership } = await supabase
      .from('channel_members')
      .select('id')
      .eq('channel_id', params.channel_id)
      .eq('profile_id', member.profile_id)
      .single()

    if (existingMembership) {
      return error('You are already a member of this channel')
    }

    const { data, error: dbError } = await supabase
      .from('channel_members')
      .insert({
        channel_id: params.channel_id,
        profile_id: member.profile_id,
        notifications: 'all',
      })
      .select('*')
      .single()

    if (dbError) {
      return error(`Failed to join channel: ${dbError.message}`)
    }

    return success({
      message: `Joined channel #${channel.name}`,
      membership: data,
    })
  } catch (err) {
    return error(`Failed to join channel: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function channelLeave(params: {
  workspace_id?: string
  channel_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify channel exists
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, name, created_by')
      .eq('id', params.channel_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (channelError || !channel) {
      return success({
          message: 'No channel found with this ID',
          channel: null,
        })
    }

    // Cannot leave if you're the channel creator (they must delete it)
    if (channel.created_by === member.profile_id) {
      return success({
        message: 'Channel creator cannot leave. Archive the channel instead.',
        left: false,
      })
    }

    // Check if member of channel
    const { data: membership, error: membershipError } = await supabase
      .from('channel_members')
      .select('id')
      .eq('channel_id', params.channel_id)
      .eq('profile_id', member.profile_id)
      .single()

    if (membershipError || !membership) {
      return error('You are not a member of this channel')
    }

    const { error: dbError } = await supabase
      .from('channel_members')
      .delete()
      .eq('id', membership.id)

    if (dbError) {
      return error(`Failed to leave channel: ${dbError.message}`)
    }

    return success({
      message: `Left channel #${channel.name}`,
      channel_id: params.channel_id,
    })
  } catch (err) {
    return error(`Failed to leave channel: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function channelAddMember(params: {
  workspace_id?: string
  channel_id: string
  member_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify channel exists
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, name, is_private, created_by')
      .eq('id', params.channel_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (channelError || !channel) {
      return success({
          message: 'No channel found with this ID',
          channel: null,
        })
    }

    // For private channels, only members can add others
    if (channel.is_private) {
      const { data: myMembership } = await supabase
        .from('channel_members')
        .select('id')
        .eq('channel_id', params.channel_id)
        .eq('profile_id', member.profile_id)
        .single()

      if (!myMembership) {
        return error('Only channel members can add others to private channels')
      }
    }

    // Get the workspace member to add
    const { data: workspaceMember, error: memberError } = await supabase
      .from('workspace_members')
      .select('id, profile_id')
      .eq('id', params.member_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (memberError || !workspaceMember) {
      return error('Workspace member not found')
    }

    // Check if already a channel member
    const { data: existingMembership } = await supabase
      .from('channel_members')
      .select('id')
      .eq('channel_id', params.channel_id)
      .eq('profile_id', workspaceMember.profile_id)
      .single()

    if (existingMembership) {
      return error('User is already a member of this channel')
    }

    const { data, error: dbError } = await supabase
      .from('channel_members')
      .insert({
        channel_id: params.channel_id,
        profile_id: workspaceMember.profile_id,
        notifications: 'all',
      })
      .select(`
        *,
        profile:profiles(id, name, avatar_url)
      `)
      .single()

    if (dbError) {
      return error(`Failed to add member: ${dbError.message}`)
    }

    return success({
      message: 'Member added to channel',
      membership: data,
    })
  } catch (err) {
    return error(`Failed to add member: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function channelRemoveMember(params: {
  workspace_id?: string
  channel_id: string
  member_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify channel exists
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, created_by')
      .eq('id', params.channel_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (channelError || !channel) {
      return success({
          message: 'No channel found with this ID',
          channel: null,
        })
    }

    // Only channel creator or admins can remove members
    if (channel.created_by !== member.profile_id && member.role !== 'admin' && member.role !== 'owner') {
      return error('Only the channel creator or admins can remove members')
    }

    // Get the workspace member to remove
    const { data: workspaceMember, error: memberError } = await supabase
      .from('workspace_members')
      .select('id, profile_id')
      .eq('id', params.member_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (memberError || !workspaceMember) {
      return error('Workspace member not found')
    }

    // Cannot remove channel creator
    if (workspaceMember.profile_id === channel.created_by) {
      return error('Cannot remove the channel creator')
    }

    const { error: dbError } = await supabase
      .from('channel_members')
      .delete()
      .eq('channel_id', params.channel_id)
      .eq('profile_id', workspaceMember.profile_id)

    if (dbError) {
      return error(`Failed to remove member: ${dbError.message}`)
    }

    return success({
      message: 'Member removed from channel',
      channel_id: params.channel_id,
      member_id: params.member_id,
    })
  } catch (err) {
    return error(`Failed to remove member: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function channelGetMembers(params: {
  workspace_id?: string
  channel_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify channel exists
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, is_private')
      .eq('id', params.channel_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (channelError || !channel) {
      return success({
          message: 'No channel found with this ID',
          channel: null,
        })
    }

    // For private channels, verify user is a member
    if (channel.is_private) {
      const { data: myMembership } = await supabase
        .from('channel_members')
        .select('id')
        .eq('channel_id', params.channel_id)
        .eq('profile_id', member.profile_id)
        .single()

      if (!myMembership) {
        return success({
          message: 'No channel found with this ID',
          channel: null,
        })
      }
    }

    const { data, error: dbError } = await supabase
      .from('channel_members')
      .select(`
        *,
        profile:profiles(id, name, avatar_url, email)
      `)
      .eq('channel_id', params.channel_id)
      .order('joined_at', { ascending: true })

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      members: data || [],
      count: data?.length || 0,
      channel_id: params.channel_id,
    })
  } catch (err) {
    return error(`Failed to get members: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function channelSetNotifications(params: {
  workspace_id?: string
  channel_id: string
  notifications: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify user is a member of the channel
    const { data: membership, error: membershipError } = await supabase
      .from('channel_members')
      .select('id')
      .eq('channel_id', params.channel_id)
      .eq('profile_id', member.profile_id)
      .single()

    if (membershipError || !membership) {
      return error('You are not a member of this channel')
    }

    const { data, error: dbError } = await supabase
      .from('channel_members')
      .update({ notifications: params.notifications })
      .eq('id', membership.id)
      .select('*')
      .single()

    if (dbError) {
      return error(`Failed to set notifications: ${dbError.message}`)
    }

    return success({
      message: `Notification preference set to "${params.notifications}"`,
      membership: data,
    })
  } catch (err) {
    return error(`Failed to set notifications: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
