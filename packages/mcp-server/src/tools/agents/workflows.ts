import { z } from 'zod'
import { getSupabase } from '../../auth.js'
import {
  paginationSchema,
  success,
  error,
  type ToolResult,
} from '../../types.js'

// User ID schema for user-scoped tools (workflows are per-user)
const userIdSchema = z.object({
  user_id: z.string().uuid().describe('The user ID'),
})

// Trigger type enum
const triggerTypeSchema = z.enum([
  'schedule',
  'webhook',
  'event',
  'manual',
])

// Workflow status enum
const workflowStatusSchema = z.enum(['pending', 'running', 'completed', 'failed'])

// Tool definitions for workflows
export const workflowTools = {
  workflow_list: {
    description: 'List all workflows for a user',
    inputSchema: userIdSchema.merge(paginationSchema).extend({
      is_active: z.boolean().optional().describe('Filter by active status'),
    }),
    handler: workflowList,
  },

  workflow_get: {
    description: 'Get a single workflow',
    inputSchema: userIdSchema.extend({
      workflow_id: z.string().uuid().describe('The workflow ID'),
    }),
    handler: workflowGet,
  },

  workflow_create: {
    description: 'Create a new workflow',
    inputSchema: userIdSchema.extend({
      name: z.string().min(1).describe('Workflow name'),
      description: z.string().optional().describe('Workflow description'),
      trigger_type: triggerTypeSchema.describe('Type of trigger'),
      trigger_config: z.any().optional().describe('Trigger configuration (JSON)'),
      actions: z.array(z.any()).describe('Array of action configurations'),
      is_active: z.boolean().default(true).describe('Whether workflow is active'),
    }),
    handler: workflowCreate,
  },

  workflow_update: {
    description: 'Update a workflow',
    inputSchema: userIdSchema.extend({
      workflow_id: z.string().uuid().describe('The workflow ID'),
      name: z.string().min(1).optional().describe('Workflow name'),
      description: z.string().optional().describe('Workflow description'),
      trigger_type: triggerTypeSchema.optional().describe('Type of trigger'),
      trigger_config: z.any().optional().describe('Trigger configuration'),
      actions: z.array(z.any()).optional().describe('Array of action configurations'),
      is_active: z.boolean().optional().describe('Whether workflow is active'),
    }),
    handler: workflowUpdate,
  },

  workflow_delete: {
    description: 'Delete a workflow',
    inputSchema: userIdSchema.extend({
      workflow_id: z.string().uuid().describe('The workflow ID to delete'),
    }),
    handler: workflowDelete,
  },

  workflow_execute: {
    description: 'Manually execute a workflow',
    inputSchema: userIdSchema.extend({
      workflow_id: z.string().uuid().describe('The workflow ID to execute'),
      input: z.any().optional().describe('Optional input data for the workflow'),
    }),
    handler: workflowExecute,
  },

  workflow_get_executions: {
    description: 'Get execution history for a workflow',
    inputSchema: userIdSchema.merge(paginationSchema).extend({
      workflow_id: z.string().uuid().describe('The workflow ID'),
    }),
    handler: workflowGetExecutions,
  },

  workflow_enable: {
    description: 'Enable a workflow',
    inputSchema: userIdSchema.extend({
      workflow_id: z.string().uuid().describe('The workflow ID to enable'),
    }),
    handler: workflowEnable,
  },

  workflow_disable: {
    description: 'Disable a workflow',
    inputSchema: userIdSchema.extend({
      workflow_id: z.string().uuid().describe('The workflow ID to disable'),
    }),
    handler: workflowDisable,
  },
}

// Handler implementations

async function workflowList(params: {
  user_id: string
  is_active?: boolean
  limit?: number
  offset?: number
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    let query = supabase
      .from('workflows')
      .select('*')
      .eq('user_id', params.user_id)
      .order('created_at', { ascending: false })

    if (params.is_active !== undefined) {
      query = query.eq('is_active', params.is_active)
    }

    if (params.limit) {
      query = query.limit(params.limit)
    }

    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1)
    }

    const { data, error: dbError } = await query

    if (dbError) {
      return error(`Database error: ${dbError.message}`)
    }

    return success({
      workflows: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list workflows: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function workflowGet(params: {
  user_id: string
  workflow_id: string
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    const { data, error: dbError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', params.workflow_id)
      .eq('user_id', params.user_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Workflow not found', 'not_found')
      }
      return error(`Database error: ${dbError.message}`)
    }

    return success(data)
  } catch (err) {
    return error(`Failed to get workflow: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function workflowCreate(params: {
  user_id: string
  name: string
  description?: string
  trigger_type: 'schedule' | 'webhook' | 'event' | 'manual'
  trigger_config?: unknown
  actions: unknown[]
  is_active?: boolean
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    const { data, error: dbError } = await supabase
      .from('workflows')
      .insert({
        user_id: params.user_id,
        name: params.name,
        description: params.description || null,
        trigger_type: params.trigger_type,
        trigger_config: params.trigger_config || {},
        actions: params.actions,
        is_active: params.is_active ?? true,
      })
      .select()
      .single()

    if (dbError) {
      return error(`Failed to create workflow: ${dbError.message}`)
    }

    return success({
      message: 'Workflow created successfully',
      workflow: data,
    })
  } catch (err) {
    return error(`Failed to create workflow: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function workflowUpdate(params: {
  user_id: string
  workflow_id: string
  name?: string
  description?: string
  trigger_type?: string
  trigger_config?: unknown
  actions?: unknown[]
  is_active?: boolean
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    // Verify workflow belongs to this user
    const { data: existing, error: getError } = await supabase
      .from('workflows')
      .select('id')
      .eq('id', params.workflow_id)
      .eq('user_id', params.user_id)
      .single()

    if (getError || !existing) {
      return error('Workflow not found', 'not_found')
    }

    const updateData: Record<string, unknown> = {}
    if (params.name !== undefined) updateData.name = params.name
    if (params.description !== undefined) updateData.description = params.description
    if (params.trigger_type !== undefined) updateData.trigger_type = params.trigger_type
    if (params.trigger_config !== undefined) updateData.trigger_config = params.trigger_config
    if (params.actions !== undefined) updateData.actions = params.actions
    if (params.is_active !== undefined) updateData.is_active = params.is_active

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update')
    }

    const { data, error: dbError } = await supabase
      .from('workflows')
      .update(updateData)
      .eq('id', params.workflow_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to update workflow: ${dbError.message}`)
    }

    return success({
      message: 'Workflow updated successfully',
      workflow: data,
    })
  } catch (err) {
    return error(`Failed to update workflow: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function workflowDelete(params: {
  user_id: string
  workflow_id: string
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    // Verify workflow belongs to this user
    const { data: existing, error: getError } = await supabase
      .from('workflows')
      .select('id')
      .eq('id', params.workflow_id)
      .eq('user_id', params.user_id)
      .single()

    if (getError || !existing) {
      return error('Workflow not found', 'not_found')
    }

    const { error: dbError } = await supabase
      .from('workflows')
      .delete()
      .eq('id', params.workflow_id)

    if (dbError) {
      return error(`Failed to delete workflow: ${dbError.message}`)
    }

    return success({
      message: 'Workflow deleted successfully',
      workflow_id: params.workflow_id,
    })
  } catch (err) {
    return error(`Failed to delete workflow: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function workflowExecute(params: {
  user_id: string
  workflow_id: string
  input?: unknown
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    // Verify workflow belongs to this user
    const { data: workflow, error: getError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', params.workflow_id)
      .eq('user_id', params.user_id)
      .single()

    if (getError || !workflow) {
      return error('Workflow not found', 'not_found')
    }

    if (!workflow.is_active) {
      return error('Workflow is disabled. Enable it first to execute.')
    }

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_id: params.workflow_id,
        user_id: params.user_id,
        trigger_type: 'manual',
        trigger_context: params.input || {},
        status: 'pending',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (execError) {
      return error(`Failed to create execution: ${execError.message}`)
    }

    // Note: In a real implementation, this would trigger the actual workflow execution
    // via a queue/job system. For now, we just create the record.

    return success({
      message: 'Workflow execution started',
      execution_id: execution.id,
      status: 'pending',
      note: 'The workflow will execute asynchronously. Check execution status for updates.',
    })
  } catch (err) {
    return error(`Failed to execute workflow: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function workflowGetExecutions(params: {
  user_id: string
  workflow_id: string
  limit?: number
  offset?: number
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    // Verify workflow belongs to this user
    const { data: workflow } = await supabase
      .from('workflows')
      .select('id')
      .eq('id', params.workflow_id)
      .eq('user_id', params.user_id)
      .single()

    if (!workflow) {
      return error('Workflow not found', 'not_found')
    }

    let query = supabase
      .from('workflow_executions')
      .select('*')
      .eq('workflow_id', params.workflow_id)
      .order('started_at', { ascending: false })

    if (params.limit) {
      query = query.limit(params.limit)
    }

    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1)
    }

    const { data, error: dbError } = await query

    if (dbError) {
      return error(`Database error: ${dbError.message}`)
    }

    return success({
      executions: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to get executions: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function workflowEnable(params: {
  user_id: string
  workflow_id: string
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    const { data, error: dbError } = await supabase
      .from('workflows')
      .update({ is_active: true })
      .eq('id', params.workflow_id)
      .eq('user_id', params.user_id)
      .select()
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Workflow not found', 'not_found')
      }
      return error(`Failed to enable workflow: ${dbError.message}`)
    }

    return success({
      message: 'Workflow enabled successfully',
      workflow: data,
    })
  } catch (err) {
    return error(`Failed to enable workflow: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function workflowDisable(params: {
  user_id: string
  workflow_id: string
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    const { data, error: dbError } = await supabase
      .from('workflows')
      .update({ is_active: false })
      .eq('id', params.workflow_id)
      .eq('user_id', params.user_id)
      .select()
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Workflow not found', 'not_found')
      }
      return error(`Failed to disable workflow: ${dbError.message}`)
    }

    return success({
      message: 'Workflow disabled successfully',
      workflow: data,
    })
  } catch (err) {
    return error(`Failed to disable workflow: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
