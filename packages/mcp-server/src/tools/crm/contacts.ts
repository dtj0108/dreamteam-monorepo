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

// Tool definitions for contacts
export const contactTools = {
  contact_list: {
    description: 'List all contacts in a workspace',
    inputSchema: workspaceIdSchema.merge(paginationSchema).extend({
      lead_id: z.string().uuid().optional().describe('Filter by lead ID'),
      search: z.string().optional().describe('Search by name or email'),
    }),
    handler: contactList,
  },

  contact_get: {
    description: 'Get a single contact by ID',
    inputSchema: workspaceIdSchema.extend({
      contact_id: z.string().uuid().describe('The contact ID'),
    }),
    handler: contactGet,
  },

  contact_create: {
    description: 'Create a new contact',
    inputSchema: workspaceIdSchema.extend({
      first_name: z.string().min(1).describe('First name'),
      last_name: z.string().optional().describe('Last name'),
      email: z.string().email().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      title: z.string().optional().describe('Job title'),
      lead_id: z.string().uuid().optional().describe('Associated lead ID'),
      notes: z.string().optional().describe('Notes about the contact'),
    }),
    handler: contactCreate,
  },

  contact_update: {
    description: 'Update an existing contact',
    inputSchema: workspaceIdSchema.extend({
      contact_id: z.string().uuid().describe('The contact ID'),
      first_name: z.string().min(1).optional().describe('First name'),
      last_name: z.string().optional().describe('Last name'),
      email: z.string().email().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      title: z.string().optional().describe('Job title'),
      lead_id: z.string().uuid().optional().describe('Associated lead ID'),
      notes: z.string().optional().describe('Notes about the contact'),
    }),
    handler: contactUpdate,
  },

  contact_delete: {
    description: 'Delete a contact',
    inputSchema: workspaceIdSchema.extend({
      contact_id: z.string().uuid().describe('The contact ID to delete'),
    }),
    handler: contactDelete,
  },

  contact_search: {
    description: 'Search contacts by name or email',
    inputSchema: workspaceIdSchema.extend({
      query: z.string().min(1).describe('Search query'),
      limit: z.number().int().positive().max(100).optional().describe('Maximum results'),
    }),
    handler: contactSearch,
  },

  contact_get_activities: {
    description: 'Get all activities for a contact',
    inputSchema: workspaceIdSchema.extend({
      contact_id: z.string().uuid().describe('The contact ID'),
      limit: z.number().int().positive().max(100).optional().describe('Maximum results'),
    }),
    handler: contactGetActivities,
  },

  contact_get_deals: {
    description: 'Get all deals/opportunities for a contact',
    inputSchema: workspaceIdSchema.extend({
      contact_id: z.string().uuid().describe('The contact ID'),
    }),
    handler: contactGetDeals,
  },

  contact_get_by_lead: {
    description: 'Get all contacts associated with a lead',
    inputSchema: workspaceIdSchema.extend({
      lead_id: z.string().uuid().describe('The lead ID'),
    }),
    handler: contactGetByLead,
  },

  contact_get_by_email: {
    description: 'Find a contact by email address',
    inputSchema: workspaceIdSchema.extend({
      email: z.string().email().describe('Email address to search for'),
    }),
    handler: contactGetByEmail,
  },
}

// Handler implementations

async function contactList(params: {
  workspace_id?: string
  lead_id?: string
  search?: string
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
      .from('contacts')
      .select(`
        *,
        lead:leads(id, name)
      `)
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false })

    if (params.lead_id) {
      query = query.eq('lead_id', params.lead_id)
    }

    if (params.search) {
      query = query.or(`first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,email.ilike.%${params.search}%`)
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
      contacts: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list contacts: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function contactGet(params: {
  workspace_id?: string
  contact_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('contacts')
      .select(`
        *,
        lead:leads(id, name, website, industry, status)
      `)
      .eq('id', params.contact_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Contact not found', 'not_found')
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success(data)
  } catch (err) {
    return error(`Failed to get contact: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function contactCreate(params: {
  workspace_id?: string
  first_name: string
  last_name?: string
  email?: string
  phone?: string
  title?: string
  lead_id?: string
  notes?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // If lead_id is provided, verify lead belongs to this workspace
    if (params.lead_id) {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id')
        .eq('id', params.lead_id)
        .eq('workspace_id', workspace_id)
        .single()

      if (leadError || !lead) {
        return error('Lead not found', 'not_found')
      }
    }

    const { data, error: dbError } = await supabase
      .from('contacts')
      .insert({
        workspace_id: workspace_id,
        first_name: params.first_name,
        last_name: params.last_name || null,
        email: params.email || null,
        phone: params.phone || null,
        title: params.title || null,
        lead_id: params.lead_id || null,
        notes: params.notes || null,
      })
      .select(`
        *,
        lead:leads(id, name)
      `)
      .single()

    if (dbError) {
      return error(`Failed to create contact: ${dbError.message}`)
    }

    return success({
      message: 'Contact created successfully',
      contact: data,
    })
  } catch (err) {
    return error(`Failed to create contact: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function contactUpdate(params: {
  workspace_id?: string
  contact_id: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  title?: string
  lead_id?: string
  notes?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the contact belongs to this workspace
    const { data: existing, error: getError } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', params.contact_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Contact not found', 'not_found')
    }

    // If updating lead_id, verify the lead belongs to this workspace
    if (params.lead_id) {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id')
        .eq('id', params.lead_id)
        .eq('workspace_id', workspace_id)
        .single()

      if (leadError || !lead) {
        return error('Lead not found', 'not_found')
      }
    }

    const updateData: Record<string, unknown> = {}
    if (params.first_name !== undefined) updateData.first_name = params.first_name
    if (params.last_name !== undefined) updateData.last_name = params.last_name
    if (params.email !== undefined) updateData.email = params.email
    if (params.phone !== undefined) updateData.phone = params.phone
    if (params.title !== undefined) updateData.title = params.title
    if (params.lead_id !== undefined) updateData.lead_id = params.lead_id
    if (params.notes !== undefined) updateData.notes = params.notes

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update', 'validation')
    }

    const { data, error: dbError } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', params.contact_id)
      .select(`
        *,
        lead:leads(id, name)
      `)
      .single()

    if (dbError) {
      return error(`Failed to update contact: ${dbError.message}`)
    }

    return success({
      message: 'Contact updated successfully',
      contact: data,
    })
  } catch (err) {
    return error(`Failed to update contact: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function contactDelete(params: {
  workspace_id?: string
  contact_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the contact belongs to this workspace
    const { data: existing, error: getError } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', params.contact_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Contact not found', 'not_found')
    }

    const { error: dbError } = await supabase
      .from('contacts')
      .delete()
      .eq('id', params.contact_id)

    if (dbError) {
      return error(`Failed to delete contact: ${dbError.message}`)
    }

    return success({
      message: 'Contact deleted successfully',
      contact_id: params.contact_id,
    })
  } catch (err) {
    return error(`Failed to delete contact: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function contactSearch(params: {
  workspace_id?: string
  query: string
  limit?: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const searchQuery = `%${params.query}%`

    const { data, error: dbError } = await supabase
      .from('contacts')
      .select(`
        *,
        lead:leads(id, name)
      `)
      .eq('workspace_id', workspace_id)
      .or(`first_name.ilike.${searchQuery},last_name.ilike.${searchQuery},email.ilike.${searchQuery}`)
      .limit(params.limit || 50)
      .order('first_name', { ascending: true })

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      contacts: data || [],
      count: data?.length || 0,
      query: params.query,
    })
  } catch (err) {
    return error(`Failed to search contacts: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function contactGetActivities(params: {
  workspace_id?: string
  contact_id: string
  limit?: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the contact belongs to this workspace
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', params.contact_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (contactError || !contact) {
      return error('Contact not found', 'not_found')
    }

    // Get activities for this contact
    const { data, error: dbError } = await supabase
      .from('activities')
      .select('*')
      .eq('contact_id', params.contact_id)
      .order('created_at', { ascending: false })
      .limit(params.limit || 50)

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      activities: data || [],
      count: data?.length || 0,
      contact_id: params.contact_id,
    })
  } catch (err) {
    return error(`Failed to get activities: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function contactGetDeals(params: {
  workspace_id?: string
  contact_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the contact belongs to this workspace
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', params.contact_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (contactError || !contact) {
      return error('Contact not found', 'not_found')
    }

    // Get opportunities/deals for this contact
    const { data, error: dbError } = await supabase
      .from('lead_opportunities')
      .select('*')
      .eq('contact_id', params.contact_id)
      .order('created_at', { ascending: false })

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      deals: data || [],
      count: data?.length || 0,
      contact_id: params.contact_id,
    })
  } catch (err) {
    return error(`Failed to get deals: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function contactGetByLead(params: {
  workspace_id?: string
  lead_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the lead belongs to this workspace
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, name')
      .eq('id', params.lead_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (leadError || !lead) {
      return error('Lead not found', 'not_found')
    }

    // Get all contacts for this lead
    const { data, error: dbError } = await supabase
      .from('contacts')
      .select('*')
      .eq('lead_id', params.lead_id)
      .order('first_name', { ascending: true })

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      contacts: data || [],
      count: data?.length || 0,
      lead: lead,
    })
  } catch (err) {
    return error(`Failed to get contacts by lead: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function contactGetByEmail(params: {
  workspace_id?: string
  email: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('contacts')
      .select(`
        *,
        lead:leads(id, name)
      `)
      .eq('workspace_id', workspace_id)
      .eq('email', params.email)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Contact not found', 'not_found')
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success(data)
  } catch (err) {
    return error(`Failed to find contact: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
