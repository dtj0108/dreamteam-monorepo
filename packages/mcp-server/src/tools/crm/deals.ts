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

// Deal stage schema (maps to lead_opportunities.stage)
const dealStageSchema = z.enum(['prospect', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'])

// Deal status schema
const dealStatusSchema = z.enum(['active', 'won', 'lost'])

// Tool definitions for deals (using lead_opportunities table)
export const dealTools = {
  deal_list: {
    description: 'List all deals/opportunities in a workspace',
    inputSchema: workspaceIdSchema.merge(paginationSchema).extend({
      lead_id: z.string().uuid().optional().describe('Filter by lead ID'),
      status: dealStatusSchema.optional().describe('Filter by status'),
      stage: dealStageSchema.optional().describe('Filter by stage'),
      contact_id: z.string().uuid().optional().describe('Filter by contact ID'),
    }),
    handler: dealList,
  },

  deal_get: {
    description: 'Get a single deal/opportunity by ID',
    inputSchema: workspaceIdSchema.extend({
      deal_id: z.string().uuid().describe('The deal ID'),
    }),
    handler: dealGet,
  },

  deal_create: {
    description: 'Create a new deal/opportunity',
    inputSchema: workspaceIdSchema.extend({
      lead_id: z.string().uuid().describe('The lead ID this deal belongs to'),
      name: z.string().min(1).describe('Deal name'),
      value: z.number().optional().describe('Deal value'),
      stage: dealStageSchema.optional().describe('Initial stage'),
      probability: z.number().int().min(0).max(100).optional().describe('Win probability (0-100)'),
      expected_close_date: z.string().optional().describe('Expected close date (YYYY-MM-DD)'),
      contact_id: z.string().uuid().optional().describe('Primary contact ID'),
      notes: z.string().optional().describe('Notes'),
    }),
    handler: dealCreate,
  },

  deal_update: {
    description: 'Update an existing deal/opportunity',
    inputSchema: workspaceIdSchema.extend({
      deal_id: z.string().uuid().describe('The deal ID'),
      name: z.string().min(1).optional().describe('Deal name'),
      value: z.number().optional().describe('Deal value'),
      stage: dealStageSchema.optional().describe('Deal stage'),
      probability: z.number().int().min(0).max(100).optional().describe('Win probability'),
      expected_close_date: z.string().optional().describe('Expected close date'),
      contact_id: z.string().uuid().optional().describe('Primary contact ID'),
      notes: z.string().optional().describe('Notes'),
    }),
    handler: dealUpdate,
  },

  deal_delete: {
    description: 'Delete a deal/opportunity',
    inputSchema: workspaceIdSchema.extend({
      deal_id: z.string().uuid().describe('The deal ID to delete'),
    }),
    handler: dealDelete,
  },

  deal_move_stage: {
    description: 'Move a deal to a different stage',
    inputSchema: workspaceIdSchema.extend({
      deal_id: z.string().uuid().describe('The deal ID'),
      stage: dealStageSchema.describe('New stage'),
    }),
    handler: dealMoveStage,
  },

  deal_mark_won: {
    description: 'Mark a deal as won',
    inputSchema: workspaceIdSchema.extend({
      deal_id: z.string().uuid().describe('The deal ID'),
      closed_date: z.string().optional().describe('Close date (YYYY-MM-DD)'),
    }),
    handler: dealMarkWon,
  },

  deal_mark_lost: {
    description: 'Mark a deal as lost',
    inputSchema: workspaceIdSchema.extend({
      deal_id: z.string().uuid().describe('The deal ID'),
      reason: z.string().optional().describe('Reason for loss'),
    }),
    handler: dealMarkLost,
  },

  deal_get_activities: {
    description: 'Get all activities for a deal',
    inputSchema: workspaceIdSchema.extend({
      deal_id: z.string().uuid().describe('The deal ID'),
      limit: z.number().int().positive().max(100).optional().describe('Maximum results'),
    }),
    handler: dealGetActivities,
  },

  deal_get_value_by_stage: {
    description: 'Get total deal value grouped by stage',
    inputSchema: workspaceIdSchema.extend({
      lead_id: z.string().uuid().optional().describe('Filter by lead ID'),
    }),
    handler: dealGetValueByStage,
  },

  deal_get_forecast: {
    description: 'Get sales forecast based on deals and probabilities',
    inputSchema: workspaceIdSchema.extend({
      months_ahead: z.number().int().positive().max(12).optional().describe('Months to forecast (default 3)'),
    }),
    handler: dealGetForecast,
  },
}

// Handler implementations

async function dealList(params: {
  workspace_id?: string
  lead_id?: string
  status?: string
  stage?: string
  contact_id?: string
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
      .from('lead_opportunities')
      .select(`
        *,
        lead:leads(id, name),
        contact:contacts(id, first_name, last_name, email)
      `)
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false })

    if (params.lead_id) {
      query = query.eq('lead_id', params.lead_id)
    }

    if (params.status) {
      query = query.eq('status', params.status)
    }

    if (params.stage) {
      query = query.eq('stage', params.stage)
    }

    if (params.contact_id) {
      query = query.eq('contact_id', params.contact_id)
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

    // Calculate summary
    const totalValue = (data || []).reduce((sum, deal) => sum + (deal.value || 0), 0)
    const activeDeals = (data || []).filter(d => d.status === 'active').length

    return success({
      deals: data || [],
      count: data?.length || 0,
      total_value: totalValue,
      active_count: activeDeals,
    })
  } catch (err) {
    return error(`Failed to list deals: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function dealGet(params: {
  workspace_id?: string
  deal_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('lead_opportunities')
      .select(`
        *,
        lead:leads(id, name, website, industry),
        contact:contacts(id, first_name, last_name, email, phone, title)
      `)
      .eq('id', params.deal_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Deal not found', 'not_found')
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success(data)
  } catch (err) {
    return error(`Failed to get deal: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function dealCreate(params: {
  workspace_id?: string
  lead_id: string
  name: string
  value?: number
  stage?: string
  probability?: number
  expected_close_date?: string
  contact_id?: string
  notes?: string
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
      .select('id')
      .eq('id', params.lead_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (leadError || !lead) {
      return error('Lead not found', 'not_found')
    }

    // If contact_id provided, verify it belongs to this workspace
    if (params.contact_id) {
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('id')
        .eq('id', params.contact_id)
        .eq('workspace_id', workspace_id)
        .single()

      if (contactError || !contact) {
        return error('Contact not found', 'not_found')
      }
    }

    const { data, error: dbError } = await supabase
      .from('lead_opportunities')
      .insert({
        workspace_id: workspace_id,
        user_id: member.profile_id === '00000000-0000-0000-0000-000000000000' ? null : member.profile_id,
        lead_id: params.lead_id,
        name: params.name,
        value: params.value || 0,
        stage: params.stage || 'prospect',
        probability: params.probability || 0,
        expected_close_date: params.expected_close_date || null,
        contact_id: params.contact_id || null,
        notes: params.notes || null,
        status: 'active',
      })
      .select(`
        *,
        lead:leads(id, name),
        contact:contacts(id, first_name, last_name, email)
      `)
      .single()

    if (dbError) {
      return error(`Failed to create deal: ${dbError.message}`)
    }

    return success({
      message: 'Deal created successfully',
      deal: data,
    })
  } catch (err) {
    return error(`Failed to create deal: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function dealUpdate(params: {
  workspace_id?: string
  deal_id: string
  name?: string
  value?: number
  stage?: string
  probability?: number
  expected_close_date?: string
  contact_id?: string
  notes?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the deal belongs to this workspace
    const { data: existing, error: getError } = await supabase
      .from('lead_opportunities')
      .select('id')
      .eq('id', params.deal_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Deal not found', 'not_found')
    }

    const updateData: Record<string, unknown> = {}
    if (params.name !== undefined) updateData.name = params.name
    if (params.value !== undefined) updateData.value = params.value
    if (params.stage !== undefined) updateData.stage = params.stage
    if (params.probability !== undefined) updateData.probability = params.probability
    if (params.expected_close_date !== undefined) updateData.expected_close_date = params.expected_close_date
    if (params.contact_id !== undefined) updateData.contact_id = params.contact_id
    if (params.notes !== undefined) updateData.notes = params.notes

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update', 'validation')
    }

    const { data, error: dbError } = await supabase
      .from('lead_opportunities')
      .update(updateData)
      .eq('id', params.deal_id)
      .select(`
        *,
        lead:leads(id, name),
        contact:contacts(id, first_name, last_name, email)
      `)
      .single()

    if (dbError) {
      return error(`Failed to update deal: ${dbError.message}`)
    }

    return success({
      message: 'Deal updated successfully',
      deal: data,
    })
  } catch (err) {
    return error(`Failed to update deal: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function dealDelete(params: {
  workspace_id?: string
  deal_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the deal belongs to this workspace
    const { data: existing, error: getError } = await supabase
      .from('lead_opportunities')
      .select('id')
      .eq('id', params.deal_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Deal not found', 'not_found')
    }

    const { error: dbError } = await supabase
      .from('lead_opportunities')
      .delete()
      .eq('id', params.deal_id)

    if (dbError) {
      return error(`Failed to delete deal: ${dbError.message}`)
    }

    return success({
      message: 'Deal deleted successfully',
      deal_id: params.deal_id,
    })
  } catch (err) {
    return error(`Failed to delete deal: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function dealMoveStage(params: {
  workspace_id?: string
  deal_id: string
  stage: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the deal belongs to this workspace
    const { data: existing, error: getError } = await supabase
      .from('lead_opportunities')
      .select('id, stage')
      .eq('id', params.deal_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Deal not found', 'not_found')
    }

    const oldStage = existing.stage

    const { data, error: dbError } = await supabase
      .from('lead_opportunities')
      .update({ stage: params.stage })
      .eq('id', params.deal_id)
      .select(`
        *,
        lead:leads(id, name),
        contact:contacts(id, first_name, last_name, email)
      `)
      .single()

    if (dbError) {
      return error(`Failed to move deal: ${dbError.message}`)
    }

    return success({
      message: 'Deal moved to new stage',
      old_stage: oldStage,
      new_stage: params.stage,
      deal: data,
    })
  } catch (err) {
    return error(`Failed to move deal: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function dealMarkWon(params: {
  workspace_id?: string
  deal_id: string
  closed_date?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the deal belongs to this workspace
    const { data: existing, error: getError } = await supabase
      .from('lead_opportunities')
      .select('id, value')
      .eq('id', params.deal_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Deal not found', 'not_found')
    }

    const closedDate = params.closed_date || new Date().toISOString().split('T')[0]

    const { data, error: dbError } = await supabase
      .from('lead_opportunities')
      .update({
        status: 'won',
        stage: 'closed_won',
        closed_date: closedDate,
        probability: 100,
      })
      .eq('id', params.deal_id)
      .select(`
        *,
        lead:leads(id, name),
        contact:contacts(id, first_name, last_name, email)
      `)
      .single()

    if (dbError) {
      return error(`Failed to mark deal as won: ${dbError.message}`)
    }

    return success({
      message: 'Deal marked as won!',
      value_won: existing.value,
      closed_date: closedDate,
      deal: data,
    })
  } catch (err) {
    return error(`Failed to mark deal as won: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function dealMarkLost(params: {
  workspace_id?: string
  deal_id: string
  reason?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the deal belongs to this workspace
    const { data: existing, error: getError } = await supabase
      .from('lead_opportunities')
      .select('id, notes')
      .eq('id', params.deal_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Deal not found', 'not_found')
    }

    const closedDate = new Date().toISOString().split('T')[0]
    const notes = params.reason
      ? `${existing.notes ? existing.notes + '\n' : ''}Loss reason: ${params.reason}`
      : existing.notes

    const { data, error: dbError } = await supabase
      .from('lead_opportunities')
      .update({
        status: 'lost',
        stage: 'closed_lost',
        closed_date: closedDate,
        probability: 0,
        notes: notes,
      })
      .eq('id', params.deal_id)
      .select(`
        *,
        lead:leads(id, name),
        contact:contacts(id, first_name, last_name, email)
      `)
      .single()

    if (dbError) {
      return error(`Failed to mark deal as lost: ${dbError.message}`)
    }

    return success({
      message: 'Deal marked as lost',
      reason: params.reason || null,
      closed_date: closedDate,
      deal: data,
    })
  } catch (err) {
    return error(`Failed to mark deal as lost: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function dealGetActivities(params: {
  workspace_id?: string
  deal_id: string
  limit?: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the deal belongs to this workspace
    const { data: deal, error: dealError } = await supabase
      .from('lead_opportunities')
      .select('id')
      .eq('id', params.deal_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (dealError || !deal) {
      return error('Deal not found', 'not_found')
    }

    // Get activities for this deal
    const { data, error: dbError } = await supabase
      .from('activities')
      .select('*')
      .eq('deal_id', params.deal_id)
      .order('created_at', { ascending: false })
      .limit(params.limit || 50)

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      activities: data || [],
      count: data?.length || 0,
      deal_id: params.deal_id,
    })
  } catch (err) {
    return error(`Failed to get activities: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function dealGetValueByStage(params: {
  workspace_id?: string
  lead_id?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    let query = supabase
      .from('lead_opportunities')
      .select('stage, value, status')
      .eq('workspace_id', workspace_id)

    if (params.lead_id) {
      query = query.eq('lead_id', params.lead_id)
    }

    const { data, error: dbError } = await query

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    // Group by stage
    const valueByStage = (data || []).reduce((acc: Record<string, { value: number; count: number }>, deal) => {
      const stage = deal.stage || 'unknown'
      if (!acc[stage]) {
        acc[stage] = { value: 0, count: 0 }
      }
      acc[stage].value += deal.value || 0
      acc[stage].count += 1
      return acc
    }, {})

    // Calculate totals
    const totalValue = (data || []).reduce((sum, deal) => sum + (deal.value || 0), 0)
    const activeValue = (data || [])
      .filter(d => d.status === 'active')
      .reduce((sum, deal) => sum + (deal.value || 0), 0)

    return success({
      by_stage: valueByStage,
      total_value: totalValue,
      active_value: activeValue,
      deal_count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to get value by stage: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function dealGetForecast(params: {
  workspace_id?: string
  months_ahead?: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const monthsAhead = params.months_ahead || 3

    // Get all active deals
    const { data, error: dbError } = await supabase
      .from('lead_opportunities')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('status', 'active')

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    // Calculate forecast by month
    const now = new Date()
    const forecast: Record<string, { weighted_value: number; total_value: number; deal_count: number }> = {}

    for (let i = 0; i < monthsAhead; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      forecast[monthKey] = { weighted_value: 0, total_value: 0, deal_count: 0 }
    }

    // Assign deals to months based on expected close date
    for (const deal of data || []) {
      if (!deal.expected_close_date) continue

      const closeDate = new Date(deal.expected_close_date)
      const monthKey = `${closeDate.getFullYear()}-${String(closeDate.getMonth() + 1).padStart(2, '0')}`

      if (forecast[monthKey]) {
        const value = deal.value || 0
        const probability = (deal.probability || 0) / 100
        forecast[monthKey].weighted_value += value * probability
        forecast[monthKey].total_value += value
        forecast[monthKey].deal_count += 1
      }
    }

    // Calculate totals
    const totalWeightedValue = Object.values(forecast).reduce((sum, m) => sum + m.weighted_value, 0)
    const totalPipelineValue = (data || []).reduce((sum, d) => sum + (d.value || 0), 0)

    return success({
      forecast_by_month: forecast,
      total_weighted_forecast: totalWeightedValue,
      total_pipeline_value: totalPipelineValue,
      active_deals: data?.length || 0,
      months_ahead: monthsAhead,
    })
  } catch (err) {
    return error(`Failed to get forecast: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
