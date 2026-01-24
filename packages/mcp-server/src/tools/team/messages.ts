import { z } from 'zod'
import { getSupabase, validateWorkspaceAccess } from '../../auth.js'
import { resolveWorkspaceId } from '../../lib/context.js'
import {
  workspaceIdSchema,
  success,
  error,
  type ToolResult,
} from '../../types.js'

// Tool definitions for messages
export const messageTools = {
  message_list: {
    description: 'List messages in a channel or DM conversation',
    inputSchema: workspaceIdSchema.extend({
      channel_id: z.string().uuid().optional().describe('Channel ID (required if not dm_conversation_id)'),
      dm_conversation_id: z.string().uuid().optional().describe('DM conversation ID (required if not channel_id)'),
      limit: z.number().int().positive().max(100).optional().describe('Maximum messages to return'),
      before: z.string().optional().describe('Return messages before this timestamp'),
      after: z.string().optional().describe('Return messages after this timestamp'),
    }),
    handler: messageList,
  },

  message_get: {
    description: 'Get a single message by ID',
    inputSchema: workspaceIdSchema.extend({
      message_id: z.string().uuid().describe('The message ID'),
    }),
    handler: messageGet,
  },

  message_send: {
    description: 'Send a message to a channel or DM',
    inputSchema: workspaceIdSchema.extend({
      channel_id: z.string().uuid().optional().describe('Channel ID (required if not dm_conversation_id)'),
      dm_conversation_id: z.string().uuid().optional().describe('DM conversation ID (required if not channel_id)'),
      content: z.string().min(1).describe('Message content'),
      parent_id: z.string().uuid().optional().describe('Parent message ID for threading'),
    }),
    handler: messageSend,
  },

  message_update: {
    description: 'Edit a message',
    inputSchema: workspaceIdSchema.extend({
      message_id: z.string().uuid().describe('The message ID'),
      content: z.string().min(1).describe('New message content'),
    }),
    handler: messageUpdate,
  },

  message_delete: {
    description: 'Delete a message',
    inputSchema: workspaceIdSchema.extend({
      message_id: z.string().uuid().describe('The message ID to delete'),
    }),
    handler: messageDelete,
  },

  message_reply: {
    description: 'Reply to a message in a thread',
    inputSchema: workspaceIdSchema.extend({
      parent_message_id: z.string().uuid().describe('The parent message ID'),
      content: z.string().min(1).describe('Reply content'),
    }),
    handler: messageReply,
  },

  message_add_reaction: {
    description: 'Add an emoji reaction to a message',
    inputSchema: workspaceIdSchema.extend({
      message_id: z.string().uuid().describe('The message ID'),
      emoji: z.string().min(1).max(50).describe('Emoji to add'),
    }),
    handler: messageAddReaction,
  },

  message_remove_reaction: {
    description: 'Remove an emoji reaction from a message',
    inputSchema: workspaceIdSchema.extend({
      message_id: z.string().uuid().describe('The message ID'),
      emoji: z.string().min(1).max(50).describe('Emoji to remove'),
    }),
    handler: messageRemoveReaction,
  },

  message_search: {
    description: 'Search messages in the workspace',
    inputSchema: workspaceIdSchema.extend({
      query: z.string().min(1).describe('Search query'),
      channel_id: z.string().uuid().optional().describe('Filter by channel'),
      sender_id: z.string().uuid().optional().describe('Filter by sender'),
      limit: z.number().int().positive().max(100).optional().describe('Maximum results'),
    }),
    handler: messageSearch,
  },

  message_get_thread: {
    description: 'Get all replies to a message thread',
    inputSchema: workspaceIdSchema.extend({
      parent_message_id: z.string().uuid().describe('The parent message ID'),
    }),
    handler: messageGetThread,
  },

  message_pin: {
    description: 'Pin a message in a channel',
    inputSchema: workspaceIdSchema.extend({
      message_id: z.string().uuid().describe('The message ID to pin'),
    }),
    handler: messagePin,
  },

  message_unpin: {
    description: 'Unpin a message in a channel',
    inputSchema: workspaceIdSchema.extend({
      message_id: z.string().uuid().describe('The message ID to unpin'),
    }),
    handler: messageUnpin,
  },
}

// Handler implementations

async function messageList(params: {
  workspace_id?: string
  channel_id?: string
  dm_conversation_id?: string
  limit?: number
  before?: string
  after?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    if (!params.channel_id && !params.dm_conversation_id) {
      return error('Either channel_id or dm_conversation_id is required')
    }

    const supabase = getSupabase()

    // Verify access to channel or DM
    if (params.channel_id) {
      const { data: channel } = await supabase
        .from('channels')
        .select('id, is_private')
        .eq('id', params.channel_id)
        .eq('workspace_id', workspace_id)
        .single()

      if (!channel) {
        return success({
          message: 'No channel found with this ID',
          channel: null,
        })
      }

      if (channel.is_private) {
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
    }

    if (params.dm_conversation_id) {
      const { data: participant } = await supabase
        .from('dm_participants')
        .select('id')
        .eq('conversation_id', params.dm_conversation_id)
        .eq('profile_id', member.profile_id)
        .single()

      if (!participant) {
        return error('Conversation not found')
      }
    }

    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, name, avatar_url),
        reactions:message_reactions(id, emoji, profile_id)
      `)
      .eq('workspace_id', workspace_id)
      .eq('is_deleted', false)
      .is('parent_id', null) // Only get top-level messages
      .order('created_at', { ascending: false })

    if (params.channel_id) {
      query = query.eq('channel_id', params.channel_id)
    }

    if (params.dm_conversation_id) {
      query = query.eq('dm_conversation_id', params.dm_conversation_id)
    }

    if (params.before) {
      query = query.lt('created_at', params.before)
    }

    if (params.after) {
      query = query.gt('created_at', params.after)
    }

    query = query.limit(params.limit || 50)

    const { data, error: dbError } = await query

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    // Get reply counts for each message
    const messageIds = (data || []).map(m => m.id)
    let messagesWithReplies = data || []

    if (messageIds.length > 0) {
      const { data: replies } = await supabase
        .from('messages')
        .select('parent_id')
        .in('parent_id', messageIds)
        .eq('is_deleted', false)

      const replyCountByMessage = (replies || []).reduce((acc: Record<string, number>, r) => {
        if (r.parent_id) {
          acc[r.parent_id] = (acc[r.parent_id] || 0) + 1
        }
        return acc
      }, {})

      messagesWithReplies = messagesWithReplies.map(m => ({
        ...m,
        reply_count: replyCountByMessage[m.id] || 0,
      }))
    }

    return success({
      messages: messagesWithReplies,
      count: messagesWithReplies.length,
    })
  } catch (err) {
    return error(`Failed to list messages: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function messageGet(params: {
  workspace_id?: string
  message_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, name, avatar_url),
        reactions:message_reactions(id, emoji, profile_id)
      `)
      .eq('id', params.message_id)
      .eq('workspace_id', workspace_id)
      .eq('is_deleted', false)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return success({
        message: 'No message found with this ID',
        data: null,
      })
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success(data)
  } catch (err) {
    return error(`Failed to get message: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function messageSend(params: {
  workspace_id?: string
  channel_id?: string
  dm_conversation_id?: string
  content: string
  parent_id?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    if (!params.channel_id && !params.dm_conversation_id) {
      return error('Either channel_id or dm_conversation_id is required')
    }

    if (params.channel_id && params.dm_conversation_id) {
      return success({
        message: 'Cannot specify both channel_id and dm_conversation_id. Please provide only one.',
        sent: false,
      })
    }

    const supabase = getSupabase()

    // Verify access
    if (params.channel_id) {
      const { data: membership } = await supabase
        .from('channel_members')
        .select('id')
        .eq('channel_id', params.channel_id)
        .eq('profile_id', member.profile_id)
        .single()

      if (!membership) {
        // For public channels, join automatically
        const { data: channel } = await supabase
          .from('channels')
          .select('id, is_private')
          .eq('id', params.channel_id)
          .eq('workspace_id', workspace_id)
          .single()

        if (!channel || channel.is_private) {
          return error('You must be a member of this channel to send messages')
        }

        // Auto-join public channel
        await supabase
          .from('channel_members')
          .insert({
            channel_id: params.channel_id,
            profile_id: member.profile_id,
            notifications: 'all',
          })
      }
    }

    if (params.dm_conversation_id) {
      const { data: participant } = await supabase
        .from('dm_participants')
        .select('id')
        .eq('conversation_id', params.dm_conversation_id)
        .eq('profile_id', member.profile_id)
        .single()

      if (!participant) {
        return error('You are not a participant in this conversation')
      }
    }

    const { data, error: dbError } = await supabase
      .from('messages')
      .insert({
        workspace_id: workspace_id,
        channel_id: params.channel_id || null,
        dm_conversation_id: params.dm_conversation_id || null,
        sender_id: member.profile_id,
        content: params.content,
        parent_id: params.parent_id || null,
        is_edited: false,
        is_deleted: false,
      })
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, name, avatar_url)
      `)
      .single()

    if (dbError) {
      return error(`Failed to send message: ${dbError.message}`)
    }

    return success({
      message: 'Message sent',
      data: data,
    })
  } catch (err) {
    return error(`Failed to send message: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function messageUpdate(params: {
  workspace_id?: string
  message_id: string
  content: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify message exists and belongs to user
    const { data: existing, error: getError } = await supabase
      .from('messages')
      .select('id, sender_id, content')
      .eq('id', params.message_id)
      .eq('workspace_id', workspace_id)
      .eq('is_deleted', false)
      .single()

    if (getError || !existing) {
      return success({
        message: 'No message found with this ID',
        data: null,
      })
    }

    if (existing.sender_id !== member.profile_id) {
      return error('You can only edit your own messages')
    }

    const { data, error: dbError } = await supabase
      .from('messages')
      .update({
        content: params.content,
        is_edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq('id', params.message_id)
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, name, avatar_url)
      `)
      .single()

    if (dbError) {
      return error(`Failed to update message: ${dbError.message}`)
    }

    return success({
      message: 'Message updated',
      data: data,
    })
  } catch (err) {
    return error(`Failed to update message: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function messageDelete(params: {
  workspace_id?: string
  message_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify message exists
    const { data: existing, error: getError } = await supabase
      .from('messages')
      .select('id, sender_id')
      .eq('id', params.message_id)
      .eq('workspace_id', workspace_id)
      .eq('is_deleted', false)
      .single()

    if (getError || !existing) {
      return success({
        message: 'No message found with this ID',
        data: null,
      })
    }

    // Only sender or admins can delete
    if (existing.sender_id !== member.profile_id && member.role !== 'admin' && member.role !== 'owner') {
      return error('You can only delete your own messages')
    }

    // Soft delete
    const { error: dbError } = await supabase
      .from('messages')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', params.message_id)

    if (dbError) {
      return error(`Failed to delete message: ${dbError.message}`)
    }

    return success({
      message: 'Message deleted',
      message_id: params.message_id,
    })
  } catch (err) {
    return error(`Failed to delete message: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function messageReply(params: {
  workspace_id?: string
  parent_message_id: string
  content: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get parent message
    const { data: parent, error: parentError } = await supabase
      .from('messages')
      .select('id, channel_id, dm_conversation_id')
      .eq('id', params.parent_message_id)
      .eq('workspace_id', workspace_id)
      .eq('is_deleted', false)
      .single()

    if (parentError || !parent) {
      return error('Parent message not found')
    }

    const { data, error: dbError } = await supabase
      .from('messages')
      .insert({
        workspace_id: workspace_id,
        channel_id: parent.channel_id,
        dm_conversation_id: parent.dm_conversation_id,
        sender_id: member.profile_id,
        content: params.content,
        parent_id: params.parent_message_id,
        is_edited: false,
        is_deleted: false,
      })
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, name, avatar_url)
      `)
      .single()

    if (dbError) {
      return error(`Failed to send reply: ${dbError.message}`)
    }

    return success({
      message: 'Reply sent',
      data: data,
    })
  } catch (err) {
    return error(`Failed to send reply: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function messageAddReaction(params: {
  workspace_id?: string
  message_id: string
  emoji: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify message exists
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id')
      .eq('id', params.message_id)
      .eq('workspace_id', workspace_id)
      .eq('is_deleted', false)
      .single()

    if (messageError || !message) {
      return success({
        message: 'No message found with this ID',
        data: null,
      })
    }

    // Check if reaction already exists
    const { data: existingReaction } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', params.message_id)
      .eq('profile_id', member.profile_id)
      .eq('emoji', params.emoji)
      .single()

    if (existingReaction) {
      return error('You have already added this reaction')
    }

    const { data, error: dbError } = await supabase
      .from('message_reactions')
      .insert({
        message_id: params.message_id,
        profile_id: member.profile_id,
        emoji: params.emoji,
      })
      .select('*')
      .single()

    if (dbError) {
      return error(`Failed to add reaction: ${dbError.message}`)
    }

    return success({
      message: 'Reaction added',
      reaction: data,
    })
  } catch (err) {
    return error(`Failed to add reaction: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function messageRemoveReaction(params: {
  workspace_id?: string
  message_id: string
  emoji: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    const { error: dbError } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', params.message_id)
      .eq('profile_id', member.profile_id)
      .eq('emoji', params.emoji)

    if (dbError) {
      return error(`Failed to remove reaction: ${dbError.message}`)
    }

    return success({
      message: 'Reaction removed',
      message_id: params.message_id,
      emoji: params.emoji,
    })
  } catch (err) {
    return error(`Failed to remove reaction: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function messageSearch(params: {
  workspace_id?: string
  query: string
  channel_id?: string
  sender_id?: string
  limit?: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    let query_builder = supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, name, avatar_url),
        channel:channels(id, name)
      `)
      .eq('workspace_id', workspace_id)
      .eq('is_deleted', false)
      .ilike('content', `%${params.query}%`)
      .order('created_at', { ascending: false })

    if (params.channel_id) {
      query_builder = query_builder.eq('channel_id', params.channel_id)
    }

    if (params.sender_id) {
      query_builder = query_builder.eq('sender_id', params.sender_id)
    }

    query_builder = query_builder.limit(params.limit || 50)

    const { data, error: dbError } = await query_builder

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      messages: data || [],
      count: data?.length || 0,
      query: params.query,
    })
  } catch (err) {
    return error(`Failed to search messages: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function messageGetThread(params: {
  workspace_id?: string
  parent_message_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get parent message
    const { data: parent, error: parentError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, name, avatar_url),
        reactions:message_reactions(id, emoji, profile_id)
      `)
      .eq('id', params.parent_message_id)
      .eq('workspace_id', workspace_id)
      .eq('is_deleted', false)
      .single()

    if (parentError || !parent) {
      return success({
        message: 'No message found with this ID',
        data: null,
      })
    }

    // Get replies
    const { data: replies, error: repliesError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, name, avatar_url),
        reactions:message_reactions(id, emoji, profile_id)
      `)
      .eq('parent_id', params.parent_message_id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (repliesError) {
      return error(`Database error: ${repliesError.message}`)
    }

    return success({
      parent_message: parent,
      replies: replies || [],
      reply_count: replies?.length || 0,
    })
  } catch (err) {
    return error(`Failed to get thread: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function messagePin(params: {
  workspace_id?: string
  message_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get message and verify it's a channel message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id, channel_id')
      .eq('id', params.message_id)
      .eq('workspace_id', workspace_id)
      .eq('is_deleted', false)
      .single()

    if (messageError || !message) {
      return success({
        message: 'No message found with this ID',
        data: null,
      })
    }

    if (!message.channel_id) {
      return error('Only channel messages can be pinned')
    }

    // Note: The schema doesn't have an is_pinned column, so we'll add one to the update
    // If this fails, the schema needs to be updated
    const { data, error: dbError } = await supabase
      .from('messages')
      .update({ is_pinned: true })
      .eq('id', params.message_id)
      .select('*')
      .single()

    if (dbError) {
      // If is_pinned doesn't exist, return a helpful error
      if (dbError.message.includes('is_pinned')) {
        return error('Pin functionality not available - database schema update required')
      }
      return error(`Failed to pin message: ${dbError.message}`)
    }

    return success({
      message: 'Message pinned',
      data: data,
    })
  } catch (err) {
    return error(`Failed to pin message: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function messageUnpin(params: {
  workspace_id?: string
  message_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    const { data, error: dbError } = await supabase
      .from('messages')
      .update({ is_pinned: false })
      .eq('id', params.message_id)
      .eq('workspace_id', workspace_id)
      .select('*')
      .single()

    if (dbError) {
      if (dbError.message.includes('is_pinned')) {
        return error('Pin functionality not available - database schema update required')
      }
      return error(`Failed to unpin message: ${dbError.message}`)
    }

    return success({
      message: 'Message unpinned',
      data: data,
    })
  } catch (err) {
    return error(`Failed to unpin message: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
