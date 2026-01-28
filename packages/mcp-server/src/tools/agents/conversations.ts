import { z } from 'zod'
import { getSupabase, validateWorkspaceAccess } from '../../auth.js'
import { resolveWorkspaceId } from '../../lib/context.js'
import {
  workspaceIdSchema,
  paginationSchema,
  success,
  error,
  type ToolResult,
} from '../../types.js'

// Tool definitions for agent conversations
export const agentConversationTools = {
  agent_conversation_list: {
    description: 'List agent conversations',
    inputSchema: workspaceIdSchema.merge(paginationSchema).extend({
      agent_id: z.string().uuid().optional().describe('Filter by agent ID'),
    }),
    handler: conversationList,
  },

  agent_conversation_get: {
    description: 'Get a conversation with all messages',
    inputSchema: workspaceIdSchema.extend({
      conversation_id: z.string().uuid().describe('The conversation ID'),
    }),
    handler: conversationGet,
  },

  agent_conversation_create: {
    description: 'Start a new conversation with an agent',
    inputSchema: workspaceIdSchema.extend({
      agent_id: z.string().uuid().describe('The agent ID to converse with'),
      title: z.string().optional().describe('Conversation title'),
    }),
    handler: conversationCreate,
  },

  agent_conversation_send_message: {
    description: 'Send a message in an agent conversation',
    inputSchema: workspaceIdSchema.extend({
      conversation_id: z.string().uuid().describe('The conversation ID'),
      content: z.string().min(1).describe('Message content'),
    }),
    handler: conversationSendMessage,
  },

  agent_conversation_delete: {
    description: 'Delete a conversation',
    inputSchema: workspaceIdSchema.extend({
      conversation_id: z.string().uuid().describe('The conversation ID to delete'),
    }),
    handler: conversationDelete,
  },
}

// Handler implementations

async function conversationList(params: {
  workspace_id?: string
  agent_id?: string
  limit?: number
  offset?: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    let query = supabase
      .from('agent_conversations')
      .select(`
        *,
        agent:agents(id, name, avatar_url)
      `)
      .eq('workspace_id', workspace_id)
      .order('updated_at', { ascending: false })

    if (params.agent_id) {
      query = query.eq('agent_id', params.agent_id)
    }

    if (params.limit) {
      query = query.limit(params.limit)
    }

    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1)
    }

    const { data, error: dbError } = await query

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      conversations: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list conversations: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function conversationGet(params: {
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

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('agent_conversations')
      .select(`
        *,
        agent:agents(id, name, avatar_url)
      `)
      .eq('id', params.conversation_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (convError) {
      if (convError.code === 'PGRST116') {
        return error('Conversation not found', 'not_found')
      }
      return error(`Database error: ${convError.message}`)
    }

    // Get messages
    const { data: messages, error: msgError } = await supabase
      .from('agent_messages')
      .select('*')
      .eq('conversation_id', params.conversation_id)
      .order('created_at', { ascending: true })

    if (msgError) {
      return error(`Database error: ${msgError.message}`)
    }

    return success({
      ...conversation,
      messages: messages || [],
      message_count: messages?.length || 0,
    })
  } catch (err) {
    return error(`Failed to get conversation: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function conversationCreate(params: {
  workspace_id?: string
  agent_id: string
  title?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify agent belongs to workspace
    const { data: agent } = await supabase
      .from('agents')
      .select('id, name')
      .eq('id', params.agent_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (!agent) {
      return error('Agent not found', 'not_found')
    }

    const { data, error: dbError } = await supabase
      .from('agent_conversations')
      .insert({
        workspace_id: workspace_id,
        agent_id: params.agent_id,
        user_id: member.profile_id === '00000000-0000-0000-0000-000000000000' ? null : member.profile_id,
        title: params.title || `Conversation with ${agent.name}`,
      })
      .select()
      .single()

    if (dbError) {
      return error(`Failed to create conversation: ${dbError.message}`)
    }

    return success({
      message: 'Conversation created successfully',
      conversation: data,
    })
  } catch (err) {
    return error(`Failed to create conversation: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function conversationSendMessage(params: {
  workspace_id?: string
  conversation_id: string
  content: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify conversation belongs to workspace
    const { data: conversation } = await supabase
      .from('agent_conversations')
      .select('id, agent_id')
      .eq('id', params.conversation_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (!conversation) {
      return error('Conversation not found', 'not_found')
    }

    // Add user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from('agent_messages')
      .insert({
        conversation_id: params.conversation_id,
        role: 'user',
        content: params.content,
        parts: [{ type: 'text', text: params.content }],
      })
      .select()
      .single()

    if (userMsgError) {
      return error(`Failed to send message: ${userMsgError.message}`)
    }

    // Update conversation timestamp
    await supabase
      .from('agent_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', params.conversation_id)

    // Note: In a real implementation, this would trigger the agent to respond
    // The agent response would be added via a separate process/webhook

    return success({
      message: 'Message sent successfully',
      user_message: userMessage,
      note: 'The agent will respond asynchronously. Check the conversation for updates.',
    })
  } catch (err) {
    return error(`Failed to send message: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function conversationDelete(params: {
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

    // Verify conversation belongs to workspace
    const { data: conversation } = await supabase
      .from('agent_conversations')
      .select('id')
      .eq('id', params.conversation_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (!conversation) {
      return error('Conversation not found', 'not_found')
    }

    // Delete messages first (cascade should handle this, but being explicit)
    await supabase
      .from('agent_messages')
      .delete()
      .eq('conversation_id', params.conversation_id)

    // Delete conversation
    const { error: dbError } = await supabase
      .from('agent_conversations')
      .delete()
      .eq('id', params.conversation_id)

    if (dbError) {
      return error(`Failed to delete conversation: ${dbError.message}`)
    }

    return success({
      message: 'Conversation deleted successfully',
      conversation_id: params.conversation_id,
    })
  } catch (err) {
    return error(`Failed to delete conversation: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
