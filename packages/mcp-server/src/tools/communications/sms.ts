import { z } from 'zod'
import { getSupabase } from '../../auth.js'
import { resolveWorkspaceId } from '../../lib/context.js'
import {
  paginationSchema,
  success,
  error,
  type ToolResult,
} from '../../types.js'

// Workspace ID schema for workspace-scoped tools
const workspaceIdSchema = z.object({
  workspace_id: z.string().uuid().optional().describe('The workspace ID'),
})

// Direction enum
const directionSchema = z.enum(['inbound', 'outbound']).optional()

// Tool definitions for SMS
export const smsTools = {
  sms_send: {
    description: 'Send an SMS message',
    inputSchema: workspaceIdSchema.extend({
      to_phone: z.string().describe('Recipient phone number (E.164 format)'),
      body: z.string().min(1).describe('Message body'),
      from_number: z.string().optional().describe('Sender phone number (defaults to user primary)'),
      lead_id: z.string().uuid().optional().describe('Associated lead ID'),
      contact_id: z.string().uuid().optional().describe('Associated contact ID'),
    }),
    handler: smsSend,
  },

  sms_list: {
    description: 'List SMS messages for a user',
    inputSchema: workspaceIdSchema.merge(paginationSchema).extend({
      phone_number: z.string().optional().describe('Filter by phone number'),
      direction: directionSchema.describe('Filter by direction (inbound/outbound)'),
    }),
    handler: smsList,
  },

  sms_get_conversation: {
    description: 'Get SMS conversation thread with a specific phone number',
    inputSchema: workspaceIdSchema.extend({
      phone_number: z.string().describe('The phone number to get conversation with'),
    }),
    handler: smsGetConversation,
  },

  sms_get_threads: {
    description: 'List all SMS conversation threads',
    inputSchema: workspaceIdSchema.merge(paginationSchema),
    handler: smsGetThreads,
  },

  sms_mark_thread_read: {
    description: 'Mark an SMS thread as read',
    inputSchema: workspaceIdSchema.extend({
      phone_number: z.string().describe('The phone number of the thread to mark as read'),
    }),
    handler: smsMarkThreadRead,
  },
}

// Handler implementations

async function smsSend(params: {
  workspace_id?: string
  to_phone: string
  body: string
  from_number?: string
  lead_id?: string
  contact_id?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const supabase = getSupabase()

    // Get the from number (use default if not specified)
    let fromNumber = params.from_number
    if (!fromNumber) {
      const { data: primaryNumber } = await supabase
        .from('twilio_numbers')
        .select('phone_number')
        .eq('user_id', workspace_id)
        .eq('is_primary', true)
        .single()

      if (primaryNumber) {
        fromNumber = primaryNumber.phone_number
      }
    }

    if (!fromNumber) {
      return success({
        message: 'No from number specified and no default number set. Please provide a from_number or configure a default.',
        sent: false,
      })
    }

    // Create the communication record
    // Note: In a real implementation, this would call Twilio's API to send the SMS
    // and update the record with the twilio_sid and status
    const { data, error: dbError } = await supabase
      .from('communications')
      .insert({
        user_id: workspace_id,
        type: 'sms',
        direction: 'outbound',
        from_number: fromNumber,
        to_number: params.to_phone,
        body: params.body,
        lead_id: params.lead_id || null,
        contact_id: params.contact_id || null,
        twilio_status: 'queued',
      })
      .select()
      .single()

    if (dbError) {
      return error(`Failed to send SMS: ${dbError.message}`)
    }

    // Update or create the conversation thread
    const { data: existingThread } = await supabase
      .from('conversation_threads')
      .select('id')
      .eq('user_id', workspace_id)
      .eq('phone_number', params.to_phone)
      .single()

    if (existingThread) {
      await supabase
        .from('conversation_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', existingThread.id)
    } else {
      await supabase
        .from('conversation_threads')
        .insert({
          user_id: workspace_id,
          phone_number: params.to_phone,
          lead_id: params.lead_id || null,
          contact_id: params.contact_id || null,
          last_message_at: new Date().toISOString(),
          unread_count: 0,
        })
    }

    return success({
      message: 'SMS sent successfully',
      sms: data,
    })
  } catch (err) {
    return error(`Failed to send SMS: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function smsList(params: {
  workspace_id?: string
  phone_number?: string
  direction?: 'inbound' | 'outbound'
  limit?: number
  offset?: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const supabase = getSupabase()

    let query = supabase
      .from('communications')
      .select('*')
      .eq('user_id', workspace_id)
      .eq('type', 'sms')
      .order('created_at', { ascending: false })

    if (params.phone_number) {
      query = query.or(`from_number.eq.${params.phone_number},to_number.eq.${params.phone_number}`)
    }

    if (params.direction) {
      query = query.eq('direction', params.direction)
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
      messages: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list SMS messages: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function smsGetConversation(params: {
  workspace_id?: string
  phone_number: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const supabase = getSupabase()

    // Get all messages with this phone number
    const { data: messages, error: msgError } = await supabase
      .from('communications')
      .select('*')
      .eq('user_id', workspace_id)
      .eq('type', 'sms')
      .or(`from_number.eq.${params.phone_number},to_number.eq.${params.phone_number}`)
      .order('created_at', { ascending: true })

    if (msgError) {
      return error(`Database error: ${msgError.message}`)
    }

    // Get thread info
    const { data: thread } = await supabase
      .from('conversation_threads')
      .select('*')
      .eq('user_id', workspace_id)
      .eq('phone_number', params.phone_number)
      .single()

    return success({
      thread,
      messages: messages || [],
      count: messages?.length || 0,
    })
  } catch (err) {
    return error(`Failed to get conversation: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function smsGetThreads(params: {
  workspace_id?: string
  limit?: number
  offset?: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const supabase = getSupabase()

    let query = supabase
      .from('conversation_threads')
      .select('*')
      .eq('user_id', workspace_id)
      .eq('is_archived', false)
      .order('last_message_at', { ascending: false })

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
      threads: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list SMS threads: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function smsMarkThreadRead(params: {
  workspace_id?: string
  phone_number: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const supabase = getSupabase()

    const { data, error: dbError } = await supabase
      .from('conversation_threads')
      .update({ unread_count: 0 })
      .eq('user_id', workspace_id)
      .eq('phone_number', params.phone_number)
      .select()
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Conversation thread not found')
      }
      return error(`Failed to mark thread as read: ${dbError.message}`)
    }

    return success({
      message: 'Thread marked as read',
      thread: data,
    })
  } catch (err) {
    return error(`Failed to mark thread as read: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
