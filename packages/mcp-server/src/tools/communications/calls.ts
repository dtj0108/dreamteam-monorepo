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

// Call status enum
const callStatusSchema = z.enum(['initiated', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer', 'canceled'])

// Tool definitions for calls
export const callTools = {
  call_initiate: {
    description: 'Initiate an outbound call',
    inputSchema: workspaceIdSchema.extend({
      to_phone: z.string().describe('Recipient phone number (E.164 format)'),
      from_number: z.string().optional().describe('Caller phone number (defaults to user primary)'),
      lead_id: z.string().uuid().optional().describe('Associated lead ID'),
      contact_id: z.string().uuid().optional().describe('Associated contact ID'),
    }),
    handler: callInitiate,
  },

  call_get: {
    description: 'Get details of a specific call',
    inputSchema: workspaceIdSchema.extend({
      call_id: z.string().uuid().describe('The call ID'),
    }),
    handler: callGet,
  },

  call_list: {
    description: 'List calls for a user',
    inputSchema: workspaceIdSchema.merge(paginationSchema).extend({
      direction: z.enum(['inbound', 'outbound']).optional().describe('Filter by call direction'),
      status: callStatusSchema.optional().describe('Filter by call status'),
    }),
    handler: callList,
  },

  call_get_recording: {
    description: 'Get the recording URL for a call',
    inputSchema: workspaceIdSchema.extend({
      call_id: z.string().uuid().describe('The call ID'),
    }),
    handler: callGetRecording,
  },

  call_end: {
    description: 'End an active call',
    inputSchema: workspaceIdSchema.extend({
      call_id: z.string().uuid().describe('The call ID to end'),
    }),
    handler: callEnd,
  },
}

// Handler implementations

async function callInitiate(params: {
  workspace_id?: string
  to_phone: string
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
        called: false,
      })
    }

    // Create the communication record
    // Note: In a real implementation, this would call Twilio's API to initiate the call
    // and update the record with the twilio_sid and status
    const { data, error: dbError } = await supabase
      .from('communications')
      .insert({
        user_id: workspace_id,
        type: 'call',
        direction: 'outbound',
        from_number: fromNumber,
        to_number: params.to_phone,
        lead_id: params.lead_id || null,
        contact_id: params.contact_id || null,
        twilio_status: 'initiated',
      })
      .select()
      .single()

    if (dbError) {
      return error(`Failed to initiate call: ${dbError.message}`)
    }

    return success({
      message: 'Call initiated',
      call: data,
      note: 'This action requires Twilio API integration. The call will be connected via Twilio.',
    })
  } catch (err) {
    return error(`Failed to initiate call: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function callGet(params: {
  workspace_id?: string
  call_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const supabase = getSupabase()

    const { data, error: dbError } = await supabase
      .from('communications')
      .select(`
        *,
        recording:call_recordings(*)
      `)
      .eq('id', params.call_id)
      .eq('user_id', workspace_id)
      .eq('type', 'call')
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Call not found', 'not_found')
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success(data)
  } catch (err) {
    return error(`Failed to get call: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function callList(params: {
  workspace_id?: string
  direction?: 'inbound' | 'outbound'
  status?: string
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
      .eq('type', 'call')
      .order('created_at', { ascending: false })

    if (params.direction) {
      query = query.eq('direction', params.direction)
    }

    if (params.status) {
      query = query.eq('twilio_status', params.status)
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
      calls: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list calls: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function callGetRecording(params: {
  workspace_id?: string
  call_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const supabase = getSupabase()

    // First verify the call belongs to this user
    const { data: call, error: callError } = await supabase
      .from('communications')
      .select('id')
      .eq('id', params.call_id)
      .eq('user_id', workspace_id)
      .eq('type', 'call')
      .single()

    if (callError || !call) {
      return error('Call not found or does not belong to this user', 'not_found')
    }

    // Get the recording
    const { data: recording, error: dbError } = await supabase
      .from('call_recordings')
      .select('*')
      .eq('communication_id', params.call_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('No recording found for this call', 'not_found')
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      recording_url: recording.twilio_recording_url || recording.storage_path,
      duration_seconds: recording.duration_seconds,
      file_size_bytes: recording.file_size_bytes,
    })
  } catch (err) {
    return error(`Failed to get call recording: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function callEnd(params: {
  workspace_id?: string
  call_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const supabase = getSupabase()

    // Verify the call belongs to this user
    const { data: call, error: callError } = await supabase
      .from('communications')
      .select('id, twilio_sid, twilio_status')
      .eq('id', params.call_id)
      .eq('user_id', workspace_id)
      .eq('type', 'call')
      .single()

    if (callError || !call) {
      return error('Call not found or does not belong to this user', 'not_found')
    }

    // Check if call is still active
    const activeStatuses = ['initiated', 'ringing', 'in-progress']
    if (!activeStatuses.includes(call.twilio_status)) {
      return error(`Call is not active (status: ${call.twilio_status})`)
    }

    // Note: In a real implementation, this would call Twilio's API to end the call
    // For now, we'll just update the status in the database

    const { data, error: dbError } = await supabase
      .from('communications')
      .update({ twilio_status: 'completed' })
      .eq('id', params.call_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to end call: ${dbError.message}`)
    }

    return success({
      message: 'Call ended',
      call: data,
    })
  } catch (err) {
    return error(`Failed to end call: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
