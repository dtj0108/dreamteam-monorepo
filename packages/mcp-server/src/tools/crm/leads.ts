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

// Lead status schema
const leadStatusSchema = z.enum(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'])

// Tool definitions for leads
export const leadTools = {
  lead_list: {
    description: 'List all leads in a workspace',
    inputSchema: workspaceIdSchema.merge(paginationSchema).extend({
      status: leadStatusSchema.optional().describe('Filter by lead status'),
      pipeline_id: z.string().uuid().optional().describe('Filter by pipeline ID'),
      stage_id: z.string().uuid().optional().describe('Filter by stage ID'),
    }),
    handler: leadList,
  },

  lead_get: {
    description: 'Get a single lead with full details',
    inputSchema: workspaceIdSchema.extend({
      lead_id: z.string().uuid().describe('The lead ID'),
    }),
    handler: leadGet,
  },

  lead_create: {
    description: 'Create a new lead',
    inputSchema: workspaceIdSchema.extend({
      name: z.string().min(1).describe('Lead/company name'),
      website: z.string().url().optional().describe('Website URL'),
      industry: z.string().optional().describe('Industry'),
      status: leadStatusSchema.optional().describe('Initial status'),
      notes: z.string().optional().describe('Notes'),
      pipeline_id: z.string().uuid().optional().describe('Pipeline ID'),
      stage_id: z.string().uuid().optional().describe('Initial stage ID'),
    }),
    handler: leadCreate,
  },

  lead_update: {
    description: 'Update an existing lead',
    inputSchema: workspaceIdSchema.extend({
      lead_id: z.string().uuid().describe('The lead ID'),
      name: z.string().min(1).optional().describe('Lead/company name'),
      website: z.string().url().optional().describe('Website URL'),
      industry: z.string().optional().describe('Industry'),
      status: leadStatusSchema.optional().describe('Lead status'),
      notes: z.string().optional().describe('Notes'),
      pipeline_id: z.string().uuid().optional().describe('Pipeline ID'),
      stage_id: z.string().uuid().optional().describe('Stage ID'),
    }),
    handler: leadUpdate,
  },

  lead_delete: {
    description: 'Delete a lead',
    inputSchema: workspaceIdSchema.extend({
      lead_id: z.string().uuid().describe('The lead ID to delete'),
    }),
    handler: leadDelete,
  },

  lead_change_status: {
    description: 'Change a lead\'s status',
    inputSchema: workspaceIdSchema.extend({
      lead_id: z.string().uuid().describe('The lead ID'),
      status: leadStatusSchema.describe('New status'),
    }),
    handler: leadChangeStatus,
  },

  lead_move_stage: {
    description: 'Move a lead to a different pipeline stage',
    inputSchema: workspaceIdSchema.extend({
      lead_id: z.string().uuid().describe('The lead ID'),
      stage_id: z.string().uuid().describe('New stage ID'),
    }),
    handler: leadMoveStage,
  },

  lead_add_task: {
    description: 'Add a task to a lead',
    inputSchema: workspaceIdSchema.extend({
      lead_id: z.string().uuid().describe('The lead ID'),
      title: z.string().min(1).describe('Task title'),
      description: z.string().optional().describe('Task description'),
      due_date: z.string().optional().describe('Due date (ISO format)'),
    }),
    handler: leadAddTask,
  },

  lead_complete_task: {
    description: 'Mark a lead task as complete',
    inputSchema: workspaceIdSchema.extend({
      lead_id: z.string().uuid().describe('The lead ID'),
      task_id: z.string().uuid().describe('The task ID'),
    }),
    handler: leadCompleteTask,
  },

  lead_get_tasks: {
    description: 'Get all tasks for a lead',
    inputSchema: workspaceIdSchema.extend({
      lead_id: z.string().uuid().describe('The lead ID'),
      is_completed: z.boolean().optional().describe('Filter by completion status'),
    }),
    handler: leadGetTasks,
  },

  lead_get_opportunities: {
    description: 'Get all opportunities/deals for a lead',
    inputSchema: workspaceIdSchema.extend({
      lead_id: z.string().uuid().describe('The lead ID'),
    }),
    handler: leadGetOpportunities,
  },

  lead_get_contacts: {
    description: 'Get all contacts associated with a lead',
    inputSchema: workspaceIdSchema.extend({
      lead_id: z.string().uuid().describe('The lead ID'),
    }),
    handler: leadGetContacts,
  },
}

// Handler implementations

async function leadList(params: {
  workspace_id?: string
  status?: string
  pipeline_id?: string
  stage_id?: string
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
      .from('leads')
      .select(`
        *,
        pipeline:lead_pipelines(id, name),
        stage:lead_pipeline_stages(id, name, color)
      `)
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false })

    if (params.status) {
      query = query.eq('status', params.status)
    }

    if (params.pipeline_id) {
      query = query.eq('pipeline_id', params.pipeline_id)
    }

    if (params.stage_id) {
      query = query.eq('stage_id', params.stage_id)
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
      leads: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list leads: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function leadGet(params: {
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
    const { data, error: dbError } = await supabase
      .from('leads')
      .select(`
        *,
        pipeline:lead_pipelines(id, name, description),
        stage:lead_pipeline_stages(id, name, color, position),
        contacts:contacts(id, first_name, last_name, email, phone, title),
        opportunities:lead_opportunities(id, name, value, stage, probability, status),
        tasks:lead_tasks(id, title, due_date, is_completed)
      `)
      .eq('id', params.lead_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Lead not found', 'not_found')
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success(data)
  } catch (err) {
    return error(`Failed to get lead: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function leadCreate(params: {
  workspace_id?: string
  name: string
  website?: string
  industry?: string
  status?: string
  notes?: string
  pipeline_id?: string
  stage_id?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // If pipeline_id or stage_id provided, verify they exist
    if (params.pipeline_id) {
      const { data: pipeline, error: pipelineError } = await supabase
        .from('lead_pipelines')
        .select('id')
        .eq('id', params.pipeline_id)
        .single()

      if (pipelineError || !pipeline) {
        return error('Pipeline not found')
      }
    }

    if (params.stage_id) {
      const { data: stage, error: stageError } = await supabase
        .from('lead_pipeline_stages')
        .select('id, pipeline_id')
        .eq('id', params.stage_id)
        .single()

      if (stageError || !stage) {
        return error('Stage not found')
      }

      // Verify stage belongs to the specified pipeline
      if (params.pipeline_id && stage.pipeline_id !== params.pipeline_id) {
        return error('Stage does not belong to the specified pipeline')
      }
    }

    // Check if we're in service mode (no real user) - leads require a user owner
    if (member.profile_id === '00000000-0000-0000-0000-000000000000') {
      return success({
        message: 'Creating leads requires a real user context. This operation is not available in service mode.',
        lead: null,
        created: false,
      })
    }

    const { data, error: dbError } = await supabase
      .from('leads')
      .insert({
        workspace_id: workspace_id,
        user_id: member.profile_id,
        name: params.name,
        website: params.website || null,
        industry: params.industry || null,
        status: params.status || 'new',
        notes: params.notes || null,
        pipeline_id: params.pipeline_id || null,
        stage_id: params.stage_id || null,
      })
      .select(`
        *,
        pipeline:lead_pipelines(id, name),
        stage:lead_pipeline_stages(id, name, color)
      `)
      .single()

    if (dbError) {
      return error(`Failed to create lead: ${dbError.message}`)
    }

    return success({
      message: 'Lead created successfully',
      lead: data,
    })
  } catch (err) {
    return error(`Failed to create lead: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function leadUpdate(params: {
  workspace_id?: string
  lead_id: string
  name?: string
  website?: string
  industry?: string
  status?: string
  notes?: string
  pipeline_id?: string
  stage_id?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the lead belongs to this workspace
    const { data: existing, error: getError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', params.lead_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Lead not found', 'not_found')
    }

    const updateData: Record<string, unknown> = {}
    if (params.name !== undefined) updateData.name = params.name
    if (params.website !== undefined) updateData.website = params.website
    if (params.industry !== undefined) updateData.industry = params.industry
    if (params.status !== undefined) updateData.status = params.status
    if (params.notes !== undefined) updateData.notes = params.notes
    if (params.pipeline_id !== undefined) updateData.pipeline_id = params.pipeline_id
    if (params.stage_id !== undefined) updateData.stage_id = params.stage_id

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update', 'validation')
    }

    const { data, error: dbError } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', params.lead_id)
      .select(`
        *,
        pipeline:lead_pipelines(id, name),
        stage:lead_pipeline_stages(id, name, color)
      `)
      .single()

    if (dbError) {
      return error(`Failed to update lead: ${dbError.message}`)
    }

    return success({
      message: 'Lead updated successfully',
      lead: data,
    })
  } catch (err) {
    return error(`Failed to update lead: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function leadDelete(params: {
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
    const { data: existing, error: getError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', params.lead_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Lead not found', 'not_found')
    }

    const { error: dbError } = await supabase
      .from('leads')
      .delete()
      .eq('id', params.lead_id)

    if (dbError) {
      return error(`Failed to delete lead: ${dbError.message}`)
    }

    return success({
      message: 'Lead deleted successfully',
      lead_id: params.lead_id,
    })
  } catch (err) {
    return error(`Failed to delete lead: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function leadChangeStatus(params: {
  workspace_id?: string
  lead_id: string
  status: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the lead belongs to this workspace
    const { data: existing, error: getError } = await supabase
      .from('leads')
      .select('id, status')
      .eq('id', params.lead_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Lead not found', 'not_found')
    }

    const oldStatus = existing.status

    const { data, error: dbError } = await supabase
      .from('leads')
      .update({ status: params.status })
      .eq('id', params.lead_id)
      .select(`
        *,
        pipeline:lead_pipelines(id, name),
        stage:lead_pipeline_stages(id, name, color)
      `)
      .single()

    if (dbError) {
      return error(`Failed to change status: ${dbError.message}`)
    }

    return success({
      message: 'Lead status changed successfully',
      old_status: oldStatus,
      new_status: params.status,
      lead: data,
    })
  } catch (err) {
    return error(`Failed to change status: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function leadMoveStage(params: {
  workspace_id?: string
  lead_id: string
  stage_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the lead belongs to this workspace
    const { data: existing, error: getError } = await supabase
      .from('leads')
      .select('id, stage_id, pipeline_id')
      .eq('id', params.lead_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Lead not found', 'not_found')
    }

    // Verify the stage exists and get its pipeline
    const { data: stage, error: stageError } = await supabase
      .from('lead_pipeline_stages')
      .select('id, name, pipeline_id')
      .eq('id', params.stage_id)
      .single()

    if (stageError || !stage) {
      return error('Stage not found')
    }

    const oldStageId = existing.stage_id

    // Update lead with new stage (and pipeline if different)
    const { data, error: dbError } = await supabase
      .from('leads')
      .update({
        stage_id: params.stage_id,
        pipeline_id: stage.pipeline_id,
      })
      .eq('id', params.lead_id)
      .select(`
        *,
        pipeline:lead_pipelines(id, name),
        stage:lead_pipeline_stages(id, name, color, position)
      `)
      .single()

    if (dbError) {
      return error(`Failed to move stage: ${dbError.message}`)
    }

    return success({
      message: 'Lead moved to new stage',
      old_stage_id: oldStageId,
      new_stage_id: params.stage_id,
      lead: data,
    })
  } catch (err) {
    return error(`Failed to move stage: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function leadAddTask(params: {
  workspace_id?: string
  lead_id: string
  title: string
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

    const { data, error: dbError } = await supabase
      .from('lead_tasks')
      .insert({
        lead_id: params.lead_id,
        workspace_id: workspace_id,
        user_id: member.profile_id === '00000000-0000-0000-0000-000000000000' ? null : member.profile_id,
        title: params.title,
        description: params.description || null,
        due_date: params.due_date || null,
        is_completed: false,
      })
      .select('*')
      .single()

    if (dbError) {
      return error(`Failed to add task: ${dbError.message}`)
    }

    return success({
      message: 'Task added successfully',
      task: data,
    })
  } catch (err) {
    return error(`Failed to add task: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function leadCompleteTask(params: {
  workspace_id?: string
  lead_id: string
  task_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the task belongs to this lead and workspace
    const { data: task, error: taskError } = await supabase
      .from('lead_tasks')
      .select('id, lead_id')
      .eq('id', params.task_id)
      .eq('lead_id', params.lead_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (taskError || !task) {
      return error('Task not found')
    }

    const { data, error: dbError } = await supabase
      .from('lead_tasks')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', params.task_id)
      .select('*')
      .single()

    if (dbError) {
      return error(`Failed to complete task: ${dbError.message}`)
    }

    return success({
      message: 'Task completed successfully',
      task: data,
    })
  } catch (err) {
    return error(`Failed to complete task: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function leadGetTasks(params: {
  workspace_id?: string
  lead_id: string
  is_completed?: boolean
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

    let query = supabase
      .from('lead_tasks')
      .select('*')
      .eq('lead_id', params.lead_id)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (params.is_completed !== undefined) {
      query = query.eq('is_completed', params.is_completed)
    }

    const { data, error: dbError } = await query

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      tasks: data || [],
      count: data?.length || 0,
      lead_id: params.lead_id,
    })
  } catch (err) {
    return error(`Failed to get tasks: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function leadGetOpportunities(params: {
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
      .select('id')
      .eq('id', params.lead_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (leadError || !lead) {
      return error('Lead not found', 'not_found')
    }

    const { data, error: dbError } = await supabase
      .from('lead_opportunities')
      .select(`
        *,
        contact:contacts(id, first_name, last_name, email)
      `)
      .eq('lead_id', params.lead_id)
      .order('created_at', { ascending: false })

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    // Calculate total value
    const totalValue = (data || []).reduce((sum, opp) => sum + (opp.value || 0), 0)

    return success({
      opportunities: data || [],
      count: data?.length || 0,
      total_value: totalValue,
      lead_id: params.lead_id,
    })
  } catch (err) {
    return error(`Failed to get opportunities: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function leadGetContacts(params: {
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
    return error(`Failed to get contacts: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
