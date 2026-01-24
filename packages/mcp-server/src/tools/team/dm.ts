import { z } from 'zod'
import { getSupabase, validateWorkspaceAccess } from '../../auth.js'
import { resolveWorkspaceId } from '../../lib/context.js'
import {
  workspaceIdSchema,
  success,
  error,
  type ToolResult,
} from '../../types.js'

// Tool definitions for direct messages
export const dmTools = {
  dm_list_conversations: {
    description: 'List all DM conversations for the current user',
    inputSchema: workspaceIdSchema,
    handler: dmListConversations,
  },

  dm_get_conversation: {
    description: 'Get a DM conversation with recent messages',
    inputSchema: workspaceIdSchema.extend({
      conversation_id: z.string().uuid().describe('The conversation ID'),
    }),
    handler: dmGetConversation,
  },

  dm_create_conversation: {
    description: 'Start a new DM conversation with one or more users',
    inputSchema: workspaceIdSchema.extend({
      participant_ids: z.array(z.string().uuid()).min(1).describe('Profile IDs of participants'),
    }),
    handler: dmCreateConversation,
  },

  dm_get_or_create: {
    description: 'Get or create a DM conversation with a single user',
    inputSchema: workspaceIdSchema.extend({
      participant_id: z.string().uuid().describe('Profile ID of the other participant'),
    }),
    handler: dmGetOrCreate,
  },

  dm_archive_conversation: {
    description: 'Archive a DM conversation',
    inputSchema: workspaceIdSchema.extend({
      conversation_id: z.string().uuid().describe('The conversation ID to archive'),
    }),
    handler: dmArchiveConversation,
  },

  dm_mark_read: {
    description: 'Mark a DM conversation as read',
    inputSchema: workspaceIdSchema.extend({
      conversation_id: z.string().uuid().describe('The conversation ID'),
    }),
    handler: dmMarkRead,
  },

  dm_get_unread_count: {
    description: 'Get the count of unread DM conversations',
    inputSchema: workspaceIdSchema,
    handler: dmGetUnreadCount,
  },
}

// Handler implementations

async function dmListConversations(params: {
  workspace_id?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get conversations where user is a participant
    const { data: participations, error: partError } = await supabase
      .from('dm_participants')
      .select(`
        conversation_id,
        last_read_at,
        conversation:dm_conversations(
          id,
          workspace_id,
          created_at
        )
      `)
      .eq('profile_id', member.profile_id)

    if (partError) {
      return error(`Database error: ${partError.message}`)
    }

    // Filter to workspace conversations
    const workspaceConversations = (participations || [])
      .filter(p => {
        const conv = p.conversation as unknown as { workspace_id: string } | null
        return conv?.workspace_id === workspace_id
      })

    if (workspaceConversations.length === 0) {
      return success({
        conversations: [],
        count: 0,
      })
    }

    // Get conversation details with participants and last message
    const conversationIds = workspaceConversations.map(p => p.conversation_id)

    // Get all participants for these conversations
    const { data: allParticipants } = await supabase
      .from('dm_participants')
      .select(`
        conversation_id,
        profile:profiles(id, name, avatar_url)
      `)
      .in('conversation_id', conversationIds)
      .neq('profile_id', member.profile_id)

    // Get last message for each conversation
    const { data: lastMessages } = await supabase
      .from('messages')
      .select('dm_conversation_id, content, created_at, sender_id')
      .in('dm_conversation_id', conversationIds)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    // Build conversation objects
    type MessageRecord = {
      dm_conversation_id: string | null
      content: string
      created_at: string
      sender_id: string
    }
    const lastMessageByConversation: Record<string, MessageRecord> = {}
    for (const msg of (lastMessages || []) as MessageRecord[]) {
      if (msg.dm_conversation_id && !lastMessageByConversation[msg.dm_conversation_id]) {
        lastMessageByConversation[msg.dm_conversation_id] = msg
      }
    }

    const participantsByConversation: Record<string, Array<{ id: string; name: string; avatar_url: string }>> = {}
    for (const part of allParticipants || []) {
      if (!participantsByConversation[part.conversation_id]) {
        participantsByConversation[part.conversation_id] = []
      }
      if (part.profile) {
        const profile = part.profile as unknown as { id: string; name: string; avatar_url: string }
        participantsByConversation[part.conversation_id].push(profile)
      }
    }

    const conversations = workspaceConversations.map(p => {
      const conv = p.conversation as unknown as { id: string; created_at: string }
      const lastMessage = lastMessageByConversation[p.conversation_id]
      const participants = participantsByConversation[p.conversation_id] || []
      const hasUnread = lastMessage && p.last_read_at
        ? new Date(lastMessage.created_at) > new Date(p.last_read_at)
        : false

      return {
        id: conv.id,
        participants,
        last_message: lastMessage ? {
          content: lastMessage.content,
          created_at: lastMessage.created_at,
        } : null,
        last_read_at: p.last_read_at,
        has_unread: hasUnread,
        created_at: conv.created_at,
      }
    })

    // Sort by last message date
    conversations.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.created_at
      const bTime = b.last_message?.created_at || b.created_at
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })

    return success({
      conversations,
      count: conversations.length,
    })
  } catch (err) {
    return error(`Failed to list conversations: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function dmGetConversation(params: {
  workspace_id?: string
  conversation_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify user is a participant
    const { data: participation, error: partError } = await supabase
      .from('dm_participants')
      .select('id, last_read_at')
      .eq('conversation_id', params.conversation_id)
      .eq('profile_id', member.profile_id)
      .single()

    if (partError || !participation) {
      return error('Conversation not found')
    }

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('dm_conversations')
      .select('*')
      .eq('id', params.conversation_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (convError || !conversation) {
      return error('Conversation not found')
    }

    // Get participants
    const { data: participants } = await supabase
      .from('dm_participants')
      .select(`
        profile:profiles(id, name, avatar_url, email)
      `)
      .eq('conversation_id', params.conversation_id)

    // Get recent messages
    const { data: messages } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, name, avatar_url)
      `)
      .eq('dm_conversation_id', params.conversation_id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(50)

    return success({
      conversation: {
        ...conversation,
        participants: (participants || []).map(p => p.profile),
      },
      messages: (messages || []).reverse(), // Chronological order
      last_read_at: participation.last_read_at,
    })
  } catch (err) {
    return error(`Failed to get conversation: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function dmCreateConversation(params: {
  workspace_id?: string
  participant_ids: string[]
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify all participants are workspace members
    const { data: members, error: membersError } = await supabase
      .from('workspace_members')
      .select('profile_id')
      .eq('workspace_id', workspace_id)
      .in('profile_id', params.participant_ids)

    if (membersError) {
      return error(`Database error: ${membersError.message}`)
    }

    if (!members || members.length !== params.participant_ids.length) {
      return error('One or more participants are not members of this workspace')
    }

    // Create the conversation
    const { data: conversation, error: convError } = await supabase
      .from('dm_conversations')
      .insert({
        workspace_id: workspace_id,
      })
      .select('*')
      .single()

    if (convError) {
      return error(`Failed to create conversation: ${convError.message}`)
    }

    // Add all participants including the current user
    const allParticipantIds = [...new Set([...params.participant_ids, member.profile_id])]
    const participantInserts = allParticipantIds.map(profileId => ({
      conversation_id: conversation.id,
      profile_id: profileId,
    }))

    const { error: partError } = await supabase
      .from('dm_participants')
      .insert(participantInserts)

    if (partError) {
      // Clean up conversation if participants failed
      await supabase.from('dm_conversations').delete().eq('id', conversation.id)
      return error(`Failed to add participants: ${partError.message}`)
    }

    // Get participant details
    const { data: participants } = await supabase
      .from('dm_participants')
      .select(`
        profile:profiles(id, name, avatar_url)
      `)
      .eq('conversation_id', conversation.id)

    return success({
      message: 'Conversation created',
      conversation: {
        ...conversation,
        participants: (participants || []).map(p => p.profile),
      },
    })
  } catch (err) {
    return error(`Failed to create conversation: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function dmGetOrCreate(params: {
  workspace_id?: string
  participant_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    if (params.participant_id === member.profile_id) {
      return error('Cannot create a conversation with yourself')
    }

    const supabase = getSupabase()

    // Verify participant is a workspace member
    const { data: participantMember, error: memberError } = await supabase
      .from('workspace_members')
      .select('profile_id')
      .eq('workspace_id', workspace_id)
      .eq('profile_id', params.participant_id)
      .single()

    if (memberError || !participantMember) {
      return error('User is not a member of this workspace')
    }

    // Try to find existing 1:1 conversation
    // Get all conversations where current user is a participant
    const { data: myParticipations } = await supabase
      .from('dm_participants')
      .select('conversation_id')
      .eq('profile_id', member.profile_id)

    if (myParticipations && myParticipations.length > 0) {
      const myConversationIds = myParticipations.map(p => p.conversation_id)

      // Check if the other user is in any of these conversations
      const { data: sharedParticipations } = await supabase
        .from('dm_participants')
        .select(`
          conversation_id,
          conversation:dm_conversations(id, workspace_id)
        `)
        .eq('profile_id', params.participant_id)
        .in('conversation_id', myConversationIds)

      // Find a 1:1 conversation in this workspace
      for (const shared of sharedParticipations || []) {
        const conv = shared.conversation as unknown as { workspace_id: string } | null
        if (conv?.workspace_id !== workspace_id) continue

        // Count participants to verify it's a 1:1
        const { count } = await supabase
          .from('dm_participants')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', shared.conversation_id)

        if (count === 2) {
          // Found existing 1:1 conversation
          const result = await dmGetConversation({
            workspace_id: workspace_id,
            conversation_id: shared.conversation_id,
          })
          return {
            ...result,
            content: result.content.map(c => ({
              ...c,
              text: JSON.stringify({
                ...JSON.parse(c.text),
                is_new: false,
              }),
            })),
          }
        }
      }
    }

    // No existing conversation found, create a new one
    const createResult = await dmCreateConversation({
      workspace_id: workspace_id,
      participant_ids: [params.participant_id],
    })

    if (createResult.isError) {
      return createResult
    }

    // Add is_new flag to response
    return {
      ...createResult,
      content: createResult.content.map(c => ({
        ...c,
        text: JSON.stringify({
          ...JSON.parse(c.text),
          is_new: true,
        }),
      })),
    }
  } catch (err) {
    return error(`Failed to get or create conversation: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function dmArchiveConversation(params: {
  workspace_id?: string
  conversation_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify user is a participant
    const { data: participation, error: partError } = await supabase
      .from('dm_participants')
      .select('id')
      .eq('conversation_id', params.conversation_id)
      .eq('profile_id', member.profile_id)
      .single()

    if (partError || !participation) {
      return error('Conversation not found')
    }

    // Remove user from conversation (archiving for them)
    const { error: dbError } = await supabase
      .from('dm_participants')
      .delete()
      .eq('id', participation.id)

    if (dbError) {
      return error(`Failed to archive conversation: ${dbError.message}`)
    }

    return success({
      message: 'Conversation archived',
      conversation_id: params.conversation_id,
    })
  } catch (err) {
    return error(`Failed to archive conversation: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function dmMarkRead(params: {
  workspace_id?: string
  conversation_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    const { data, error: dbError } = await supabase
      .from('dm_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', params.conversation_id)
      .eq('profile_id', member.profile_id)
      .select('*')
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Conversation not found')
      }
      return error(`Failed to mark as read: ${dbError.message}`)
    }

    return success({
      message: 'Conversation marked as read',
      participation: data,
    })
  } catch (err) {
    return error(`Failed to mark as read: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function dmGetUnreadCount(params: {
  workspace_id?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get user's participations in this workspace
    const { data: participations } = await supabase
      .from('dm_participants')
      .select(`
        conversation_id,
        last_read_at,
        conversation:dm_conversations(workspace_id)
      `)
      .eq('profile_id', member.profile_id)

    if (!participations || participations.length === 0) {
      return success({ unread_count: 0 })
    }

    // Filter to workspace conversations
    const workspaceConversations = participations.filter(p => {
      const conv = p.conversation as unknown as { workspace_id: string } | null
      return conv?.workspace_id === workspace_id
    })

    if (workspaceConversations.length === 0) {
      return success({ unread_count: 0 })
    }

    // Count unread conversations
    let unreadCount = 0
    for (const participation of workspaceConversations) {
      // Get last message in conversation
      const { data: lastMessage } = await supabase
        .from('messages')
        .select('created_at')
        .eq('dm_conversation_id', participation.conversation_id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (lastMessage) {
        const lastReadAt = participation.last_read_at
          ? new Date(participation.last_read_at)
          : new Date(0)
        const lastMessageAt = new Date(lastMessage.created_at)

        if (lastMessageAt > lastReadAt) {
          unreadCount++
        }
      }
    }

    return success({
      unread_count: unreadCount,
    })
  } catch (err) {
    return error(`Failed to get unread count: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
