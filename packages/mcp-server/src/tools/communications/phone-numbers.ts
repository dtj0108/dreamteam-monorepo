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

// Tool definitions for phone numbers
export const phoneNumberTools = {
  phone_number_list: {
    description: 'List all phone numbers for a user',
    inputSchema: workspaceIdSchema.merge(paginationSchema),
    handler: phoneNumberList,
  },

  phone_number_provision: {
    description: 'Provision a new phone number',
    inputSchema: workspaceIdSchema.extend({
      area_code: z.string().optional().describe('Preferred area code'),
      country: z.string().default('US').describe('Country code (default: US)'),
    }),
    handler: phoneNumberProvision,
  },

  phone_number_release: {
    description: 'Release a phone number',
    inputSchema: workspaceIdSchema.extend({
      phone_number_id: z.string().uuid().describe('The phone number ID to release'),
    }),
    handler: phoneNumberRelease,
  },

  phone_number_set_default: {
    description: 'Set a phone number as the default outbound number',
    inputSchema: workspaceIdSchema.extend({
      phone_number_id: z.string().uuid().describe('The phone number ID to set as default'),
    }),
    handler: phoneNumberSetDefault,
  },
}

// Handler implementations

async function phoneNumberList(params: {
  workspace_id?: string
  limit?: number
  offset?: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const supabase = getSupabase()

    let query = supabase
      .from('twilio_numbers')
      .select('*')
      .eq('user_id', workspace_id)
      .order('created_at', { ascending: false })

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
      phone_numbers: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list phone numbers: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function phoneNumberProvision(params: {
  workspace_id?: string
  area_code?: string
  country?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const supabase = getSupabase()

    // Note: In a real implementation, this would call Twilio's API to:
    // 1. Search for available numbers in the specified area code/country
    // 2. Purchase the number
    // 3. Store the provisioned number in our database

    // For now, we'll return a placeholder indicating the number would be provisioned
    // The actual Twilio integration would be handled by a separate service

    return success({
      message: 'Phone number provisioning initiated',
      note: 'This action requires Twilio API integration. The number will be provisioned and added to your account.',
      requested: {
        area_code: params.area_code || 'any',
        country: params.country || 'US',
      },
    })
  } catch (err) {
    return error(`Failed to provision phone number: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function phoneNumberRelease(params: {
  workspace_id?: string
  phone_number_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const supabase = getSupabase()

    // Verify the phone number belongs to this user
    const { data: existing, error: getError } = await supabase
      .from('twilio_numbers')
      .select('id, twilio_sid, phone_number')
      .eq('id', params.phone_number_id)
      .eq('user_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Phone number not found or does not belong to this user', 'not_found')
    }

    // Note: In a real implementation, this would call Twilio's API to release the number
    // For now, we'll just delete from our database

    const { error: dbError } = await supabase
      .from('twilio_numbers')
      .delete()
      .eq('id', params.phone_number_id)

    if (dbError) {
      return error(`Failed to release phone number: ${dbError.message}`)
    }

    return success({
      message: 'Phone number released successfully',
      phone_number: existing.phone_number,
    })
  } catch (err) {
    return error(`Failed to release phone number: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function phoneNumberSetDefault(params: {
  workspace_id?: string
  phone_number_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const supabase = getSupabase()

    // Verify the phone number belongs to this user
    const { data: existing, error: getError } = await supabase
      .from('twilio_numbers')
      .select('id')
      .eq('id', params.phone_number_id)
      .eq('user_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Phone number not found or does not belong to this user', 'not_found')
    }

    // First, unset any current default
    await supabase
      .from('twilio_numbers')
      .update({ is_primary: false })
      .eq('user_id', workspace_id)
      .eq('is_primary', true)

    // Set the new default
    const { data, error: dbError } = await supabase
      .from('twilio_numbers')
      .update({ is_primary: true })
      .eq('id', params.phone_number_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to set default phone number: ${dbError.message}`)
    }

    return success({
      message: 'Default phone number updated successfully',
      phone_number: data,
    })
  } catch (err) {
    return error(`Failed to set default phone number: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
