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

// Activity type schema
const activityTypeSchema = z.enum(['call', 'email', 'meeting', 'note', 'task'])

// Tool definitions for activities
export const activityTools = {
  activity_list: {
    description: 'List all activities in a workspace',
    inputSchema: workspaceIdSchema.merge(paginationSchema).extend({
      type: activityTypeSchema.optional().describe('Filter by activity type'),
      contact_id: z.string().uuid().optional().describe('Filter by contact ID'),
      deal_id: z.string().uuid().optional().describe('Filter by deal ID'),
      is_completed: z.boolean().optional().describe('Filter by completion status'),
    }),
    handler: activityList,
  },

  activity_get: {
    description: 'Get a single activity by ID',
    inputSchema: workspaceIdSchema.extend({
      activity_id: z.string().uuid().describe('The activity ID'),
    }),
    handler: activityGet,
  },

  activity_create: {
    description: 'Create a new activity',
    inputSchema: workspaceIdSchema.extend({
      type: activityTypeSchema.describe('Activity type'),
      subject: z.string().min(1).describe('Activity subject'),
      description: z.string().optional().describe('Activity description'),
      contact_id: z.string().uuid().optional().describe('Associated contact ID'),
      deal_id: z.string().uuid().optional().describe('Associated deal ID'),
      due_date: z.string().optional().describe('Due date (ISO format)'),
    }),
    handler: activityCreate,
  },

  activity_update: {
    description: 'Update an existing activity',
    inputSchema: workspaceIdSchema.extend({
      activity_id: z.string().uuid().describe('The activity ID'),
      subject: z.string().min(1).optional().describe('Activity subject'),
      description: z.string().optional().describe('Activity description'),
      due_date: z.string().optional().describe('Due date'),
    }),
    handler: activityUpdate,
  },

  activity_delete: {
    description: 'Delete an activity',
    inputSchema: workspaceIdSchema.extend({
      activity_id: z.string().uuid().describe('The activity ID to delete'),
    }),
    handler: activityDelete,
  },

  activity_mark_complete: {
    description: 'Mark an activity as complete',
    inputSchema: workspaceIdSchema.extend({
      activity_id: z.string().uuid().describe('The activity ID'),
    }),
    handler: activityMarkComplete,
  },

  activity_log_call: {
    description: 'Log a phone call activity',
    inputSchema: workspaceIdSchema.extend({
      subject: z.string().min(1).describe('Call subject'),
      description: z.string().optional().describe('Call notes'),
      contact_id: z.string().uuid().optional().describe('Contact called'),
      deal_id: z.string().uuid().optional().describe('Related deal'),
      duration_minutes: z.number().int().positive().optional().describe('Call duration in minutes'),
    }),
    handler: activityLogCall,
  },

  activity_log_email: {
    description: 'Log an email activity',
    inputSchema: workspaceIdSchema.extend({
      subject: z.string().min(1).describe('Email subject'),
      description: z.string().optional().describe('Email body/notes'),
      contact_id: z.string().uuid().optional().describe('Email recipient contact'),
      deal_id: z.string().uuid().optional().describe('Related deal'),
    }),
    handler: activityLogEmail,
  },

  activity_log_meeting: {
    description: 'Log a meeting activity',
    inputSchema: workspaceIdSchema.extend({
      subject: z.string().min(1).describe('Meeting subject'),
      description: z.string().optional().describe('Meeting notes'),
      contact_id: z.string().uuid().optional().describe('Meeting attendee contact'),
      deal_id: z.string().uuid().optional().describe('Related deal'),
      meeting_date: z.string().optional().describe('Meeting date/time (ISO format)'),
    }),
    handler: activityLogMeeting,
  },

  activity_get_overdue: {
    description: 'Get all overdue activities',
    inputSchema: workspaceIdSchema.extend({
      limit: z.number().int().positive().max(100).optional().describe('Maximum results'),
    }),
    handler: activityGetOverdue,
  },

  activity_get_upcoming: {
    description: 'Get upcoming activities',
    inputSchema: workspaceIdSchema.extend({
      days_ahead: z.number().int().positive().max(30).optional().describe('Days ahead to look (default 7)'),
      limit: z.number().int().positive().max(100).optional().describe('Maximum results'),
    }),
    handler: activityGetUpcoming,
  },
}

// Handler implementations

async function activityList(params: {
  workspace_id?: string
  type?: string
  contact_id?: string
  deal_id?: string
  is_completed?: boolean
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
      .from('activities')
      .select(`
        *,
        contact:contacts(id, first_name, last_name, email),
        deal_id
      `)
      .eq('profile_id', member.profile_id)
      .order('created_at', { ascending: false })

    if (params.type) {
      query = query.eq('type', params.type)
    }

    if (params.contact_id) {
      query = query.eq('contact_id', params.contact_id)
    }

    if (params.deal_id) {
      query = query.eq('deal_id', params.deal_id)
    }

    if (params.is_completed !== undefined) {
      query = query.eq('is_completed', params.is_completed)
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
      activities: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list activities: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function activityGet(params: {
  workspace_id?: string
  activity_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('activities')
      .select(`
        *,
        contact:contacts(id, first_name, last_name, email, phone),
        deal_id
      `)
      .eq('id', params.activity_id)
      .eq('profile_id', member.profile_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return success({
        message: 'No activity found with this ID',
        activity: null,
      })
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success(data)
  } catch (err) {
    return error(`Failed to get activity: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function activityCreate(params: {
  workspace_id?: string
  type: string
  subject: string
  description?: string
  contact_id?: string
  deal_id?: string
  due_date?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify contact belongs to workspace if provided
    if (params.contact_id) {
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('id')
        .eq('id', params.contact_id)
        .eq('workspace_id', workspace_id)
        .single()

      if (contactError || !contact) {
        return success({
          message: 'No contact found with this ID in this workspace',
          contact: null,
        })
      }
    }

    // Verify deal belongs to workspace if provided
    if (params.deal_id) {
      const { data: deal, error: dealError } = await supabase
        .from('lead_opportunities')
        .select('id')
        .eq('id', params.deal_id)
        .eq('workspace_id', workspace_id)
        .single()

      if (dealError || !deal) {
        return success({
          message: 'No deal found with this ID in this workspace',
          deal: null,
        })
      }
    }

    const { data, error: dbError } = await supabase
      .from('activities')
      .insert({
        profile_id: member.profile_id,
        type: params.type,
        subject: params.subject,
        description: params.description || null,
        contact_id: params.contact_id || null,
        deal_id: params.deal_id || null,
        due_date: params.due_date || null,
        is_completed: false,
      })
      .select(`
        *,
        contact:contacts(id, first_name, last_name, email),
        deal_id
      `)
      .single()

    if (dbError) {
      return error(`Failed to create activity: ${dbError.message}`)
    }

    return success({
      message: 'Activity created successfully',
      activity: data,
    })
  } catch (err) {
    return error(`Failed to create activity: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function activityUpdate(params: {
  workspace_id?: string
  activity_id: string
  subject?: string
  description?: string
  due_date?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the activity belongs to this user
    const { data: existing, error: getError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', params.activity_id)
      .eq('profile_id', member.profile_id)
      .single()

    if (getError || !existing) {
      return success({
        message: 'No activity found with this ID',
        activity: null,
      })
    }

    const updateData: Record<string, unknown> = {}
    if (params.subject !== undefined) updateData.subject = params.subject
    if (params.description !== undefined) updateData.description = params.description
    if (params.due_date !== undefined) updateData.due_date = params.due_date

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update')
    }

    const { data, error: dbError } = await supabase
      .from('activities')
      .update(updateData)
      .eq('id', params.activity_id)
      .select(`
        *,
        contact:contacts(id, first_name, last_name, email),
        deal_id
      `)
      .single()

    if (dbError) {
      return error(`Failed to update activity: ${dbError.message}`)
    }

    return success({
      message: 'Activity updated successfully',
      activity: data,
    })
  } catch (err) {
    return error(`Failed to update activity: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function activityDelete(params: {
  workspace_id?: string
  activity_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the activity belongs to this user
    const { data: existing, error: getError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', params.activity_id)
      .eq('profile_id', member.profile_id)
      .single()

    if (getError || !existing) {
      return success({
        message: 'No activity found with this ID',
        activity: null,
      })
    }

    const { error: dbError } = await supabase
      .from('activities')
      .delete()
      .eq('id', params.activity_id)

    if (dbError) {
      return error(`Failed to delete activity: ${dbError.message}`)
    }

    return success({
      message: 'Activity deleted successfully',
      activity_id: params.activity_id,
    })
  } catch (err) {
    return error(`Failed to delete activity: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function activityMarkComplete(params: {
  workspace_id?: string
  activity_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the activity belongs to this user
    const { data: existing, error: getError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', params.activity_id)
      .eq('profile_id', member.profile_id)
      .single()

    if (getError || !existing) {
      return success({
        message: 'No activity found with this ID',
        activity: null,
      })
    }

    const { data, error: dbError } = await supabase
      .from('activities')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', params.activity_id)
      .select(`
        *,
        contact:contacts(id, first_name, last_name, email),
        deal_id
      `)
      .single()

    if (dbError) {
      return error(`Failed to complete activity: ${dbError.message}`)
    }

    return success({
      message: 'Activity marked as complete',
      activity: data,
    })
  } catch (err) {
    return error(`Failed to complete activity: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function activityLogCall(params: {
  workspace_id?: string
  subject: string
  description?: string
  contact_id?: string
  deal_id?: string
  duration_minutes?: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Build description with duration if provided
    let description = params.description || ''
    if (params.duration_minutes) {
      description = `${description}\nCall duration: ${params.duration_minutes} minutes`
    }

    const { data, error: dbError } = await supabase
      .from('activities')
      .insert({
        profile_id: member.profile_id,
        type: 'call',
        subject: params.subject,
        description: description.trim() || null,
        contact_id: params.contact_id || null,
        deal_id: params.deal_id || null,
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .select(`
        *,
        contact:contacts(id, first_name, last_name, email),
        deal_id
      `)
      .single()

    if (dbError) {
      return error(`Failed to log call: ${dbError.message}`)
    }

    return success({
      message: 'Call logged successfully',
      activity: data,
    })
  } catch (err) {
    return error(`Failed to log call: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function activityLogEmail(params: {
  workspace_id?: string
  subject: string
  description?: string
  contact_id?: string
  deal_id?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    const { data, error: dbError } = await supabase
      .from('activities')
      .insert({
        profile_id: member.profile_id,
        type: 'email',
        subject: params.subject,
        description: params.description || null,
        contact_id: params.contact_id || null,
        deal_id: params.deal_id || null,
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .select(`
        *,
        contact:contacts(id, first_name, last_name, email),
        deal_id
      `)
      .single()

    if (dbError) {
      return error(`Failed to log email: ${dbError.message}`)
    }

    return success({
      message: 'Email logged successfully',
      activity: data,
    })
  } catch (err) {
    return error(`Failed to log email: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function activityLogMeeting(params: {
  workspace_id?: string
  subject: string
  description?: string
  contact_id?: string
  deal_id?: string
  meeting_date?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Build description with meeting date if provided
    let description = params.description || ''
    if (params.meeting_date) {
      description = `${description}\nMeeting date: ${params.meeting_date}`
    }

    const { data, error: dbError } = await supabase
      .from('activities')
      .insert({
        profile_id: member.profile_id,
        type: 'meeting',
        subject: params.subject,
        description: description.trim() || null,
        contact_id: params.contact_id || null,
        deal_id: params.deal_id || null,
        due_date: params.meeting_date || null,
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .select(`
        *,
        contact:contacts(id, first_name, last_name, email),
        deal_id
      `)
      .single()

    if (dbError) {
      return error(`Failed to log meeting: ${dbError.message}`)
    }

    return success({
      message: 'Meeting logged successfully',
      activity: data,
    })
  } catch (err) {
    return error(`Failed to log meeting: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function activityGetOverdue(params: {
  workspace_id?: string
  limit?: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const now = new Date().toISOString()

    const { data, error: dbError } = await supabase
      .from('activities')
      .select(`
        *,
        contact:contacts(id, first_name, last_name, email),
        deal_id
      `)
      .eq('profile_id', member.profile_id)
      .eq('is_completed', false)
      .lt('due_date', now)
      .order('due_date', { ascending: true })
      .limit(params.limit || 50)

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      activities: data || [],
      count: data?.length || 0,
      message: `Found ${data?.length || 0} overdue activities`,
    })
  } catch (err) {
    return error(`Failed to get overdue activities: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function activityGetUpcoming(params: {
  workspace_id?: string
  days_ahead?: number
  limit?: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const now = new Date()
    const daysAhead = params.days_ahead || 7
    const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

    const { data, error: dbError } = await supabase
      .from('activities')
      .select(`
        *,
        contact:contacts(id, first_name, last_name, email),
        deal_id
      `)
      .eq('profile_id', member.profile_id)
      .eq('is_completed', false)
      .gte('due_date', now.toISOString())
      .lte('due_date', endDate.toISOString())
      .order('due_date', { ascending: true })
      .limit(params.limit || 50)

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      activities: data || [],
      count: data?.length || 0,
      days_ahead: daysAhead,
      message: `Found ${data?.length || 0} upcoming activities in the next ${daysAhead} days`,
    })
  } catch (err) {
    return error(`Failed to get upcoming activities: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
