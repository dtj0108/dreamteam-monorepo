import { z } from 'zod'
import { getSupabase, validateWorkspaceAccess } from '../../auth.js'
import { resolveWorkspaceId } from '../../lib/context.js'
import {
  workspaceIdSchema,
  success,
  error,
  type ToolResult,
} from '../../types.js'

// Milestone status enum
const milestoneStatusSchema = z.enum(['upcoming', 'at_risk', 'completed', 'missed'])

// Tool definitions for milestones
export const milestoneTools = {
  milestone_list: {
    description: 'List milestones for a project',
    inputSchema: workspaceIdSchema.extend({
      project_id: z.string().uuid().describe('The project ID'),
      status: milestoneStatusSchema.optional().describe('Filter by status'),
    }),
    handler: milestoneList,
  },

  milestone_get: {
    description: 'Get a single milestone with its tasks',
    inputSchema: workspaceIdSchema.extend({
      milestone_id: z.string().uuid().describe('The milestone ID'),
    }),
    handler: milestoneGet,
  },

  milestone_create: {
    description: 'Create a new milestone',
    inputSchema: workspaceIdSchema.extend({
      project_id: z.string().uuid().describe('The project ID'),
      name: z.string().min(1).describe('Milestone name'),
      description: z.string().optional().describe('Milestone description'),
      target_date: z.string().describe('Target date (YYYY-MM-DD)'),
    }),
    handler: milestoneCreate,
  },

  milestone_update: {
    description: 'Update an existing milestone',
    inputSchema: workspaceIdSchema.extend({
      milestone_id: z.string().uuid().describe('The milestone ID'),
      name: z.string().min(1).optional().describe('Milestone name'),
      description: z.string().optional().describe('Milestone description'),
      target_date: z.string().optional().describe('Target date (YYYY-MM-DD)'),
      status: milestoneStatusSchema.optional().describe('Milestone status'),
    }),
    handler: milestoneUpdate,
  },

  milestone_delete: {
    description: 'Delete a milestone',
    inputSchema: workspaceIdSchema.extend({
      milestone_id: z.string().uuid().describe('The milestone ID to delete'),
    }),
    handler: milestoneDelete,
  },

  milestone_add_task: {
    description: 'Add a task to a milestone',
    inputSchema: workspaceIdSchema.extend({
      milestone_id: z.string().uuid().describe('The milestone ID'),
      task_id: z.string().uuid().describe('The task ID to add'),
    }),
    handler: milestoneAddTask,
  },

  milestone_remove_task: {
    description: 'Remove a task from a milestone',
    inputSchema: workspaceIdSchema.extend({
      milestone_id: z.string().uuid().describe('The milestone ID'),
      task_id: z.string().uuid().describe('The task ID to remove'),
    }),
    handler: milestoneRemoveTask,
  },

  milestone_get_progress: {
    description: 'Get progress statistics for a milestone',
    inputSchema: workspaceIdSchema.extend({
      milestone_id: z.string().uuid().describe('The milestone ID'),
    }),
    handler: milestoneGetProgress,
  },
}

// Helper to verify milestone access
async function getMilestoneWithProject(
  supabase: ReturnType<typeof getSupabase>,
  milestoneId: string,
  workspaceId: string
) {
  const { data } = await supabase
    .from('milestones')
    .select('*, project:projects!inner(id, workspace_id)')
    .eq('id', milestoneId)
    .single()

  if (!data) return null

  const project = data.project as unknown as { workspace_id: string }
  if (project.workspace_id !== workspaceId) return null

  return data
}

// Handler implementations

async function milestoneList(params: {
  workspace_id?: string
  project_id: string
  status?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify project belongs to workspace
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', params.project_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (!project) {
      return success({
        message: 'No project found with this ID in this workspace',
        project: null,
      })
    }

    let query = supabase
      .from('milestones')
      .select('*')
      .eq('project_id', params.project_id)
      .order('target_date', { ascending: true })

    if (params.status) {
      query = query.eq('status', params.status)
    }

    const { data, error: dbError } = await query

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      milestones: data || [],
      count: data?.length || 0,
      project_id: params.project_id,
    })
  } catch (err) {
    return error(`Failed to list milestones: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function milestoneGet(params: {
  workspace_id?: string
  milestone_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    const { data: milestone, error: dbError } = await supabase
      .from('milestones')
      .select(`
        *,
        project:projects!inner(id, name, workspace_id),
        tasks:milestone_tasks(
          task:tasks(id, title, status, priority, due_date)
        )
      `)
      .eq('id', params.milestone_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return success({
          message: 'No milestone found with this ID',
          milestone: null,
        })
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    const project = milestone.project as unknown as { workspace_id: string }
    if (project.workspace_id !== workspace_id) {
      return success({
        message: 'No milestone found with this ID in this workspace',
        milestone: null,
      })
    }

    return success(milestone)
  } catch (err) {
    return error(`Failed to get milestone: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function milestoneCreate(params: {
  workspace_id?: string
  project_id: string
  name: string
  description?: string
  target_date: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify project belongs to workspace
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', params.project_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (!project) {
      return success({
        message: 'No project found with this ID in this workspace',
        project: null,
      })
    }

    const { data, error: dbError } = await supabase
      .from('milestones')
      .insert({
        project_id: params.project_id,
        name: params.name,
        description: params.description || null,
        target_date: params.target_date,
        status: 'upcoming',
      })
      .select()
      .single()

    if (dbError) {
      return error(`Failed to create milestone: ${dbError.message}`)
    }

    return success({
      message: 'Milestone created successfully',
      milestone: data,
    })
  } catch (err) {
    return error(`Failed to create milestone: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function milestoneUpdate(params: {
  workspace_id?: string
  milestone_id: string
  name?: string
  description?: string
  target_date?: string
  status?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const milestone = await getMilestoneWithProject(supabase, params.milestone_id, workspace_id)

    if (!milestone) {
      return success({
        message: 'No milestone found with this ID in this workspace',
        milestone: null,
      })
    }

    const updateData: Record<string, unknown> = {}
    if (params.name !== undefined) updateData.name = params.name
    if (params.description !== undefined) updateData.description = params.description
    if (params.target_date !== undefined) updateData.target_date = params.target_date
    if (params.status !== undefined) updateData.status = params.status

    if (Object.keys(updateData).length === 0) {
      return success({
        message: 'No fields provided to update',
        milestone: null,
        updated: false,
      })
    }

    const { data, error: dbError } = await supabase
      .from('milestones')
      .update(updateData)
      .eq('id', params.milestone_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to update milestone: ${dbError.message}`)
    }

    return success({
      message: 'Milestone updated successfully',
      milestone: data,
    })
  } catch (err) {
    return error(`Failed to update milestone: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function milestoneDelete(params: {
  workspace_id?: string
  milestone_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const milestone = await getMilestoneWithProject(supabase, params.milestone_id, workspace_id)

    if (!milestone) {
      return success({
        message: 'No milestone found with this ID in this workspace',
        milestone: null,
      })
    }

    const { error: dbError } = await supabase
      .from('milestones')
      .delete()
      .eq('id', params.milestone_id)

    if (dbError) {
      return error(`Failed to delete milestone: ${dbError.message}`)
    }

    return success({
      message: 'Milestone deleted successfully',
      milestone_id: params.milestone_id,
    })
  } catch (err) {
    return error(`Failed to delete milestone: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function milestoneAddTask(params: {
  workspace_id?: string
  milestone_id: string
  task_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get milestone with project info
    const { data: milestone } = await supabase
      .from('milestones')
      .select('id, project_id, project:projects!inner(workspace_id)')
      .eq('id', params.milestone_id)
      .single()

    if (!milestone) {
      return success({
          message: 'No milestone found with this ID',
          milestone: null,
        })
    }

    const project = milestone.project as unknown as { workspace_id: string }
    if (project.workspace_id !== workspace_id) {
      return success({
        message: 'No milestone found with this ID in this workspace',
        milestone: null,
      })
    }

    // Verify task is in the same project
    const { data: task } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', params.task_id)
      .eq('project_id', milestone.project_id)
      .single()

    if (!task) {
      return success({
        message: 'Task not found in the same project as milestone',
        task: null,
        linked: false,
      })
    }

    // Check if already linked
    const { data: existing } = await supabase
      .from('milestone_tasks')
      .select('id')
      .eq('milestone_id', params.milestone_id)
      .eq('task_id', params.task_id)
      .single()

    if (existing) {
      return success({
        message: 'Task is already linked to this milestone',
        already_linked: true,
      })
    }

    const { data, error: dbError } = await supabase
      .from('milestone_tasks')
      .insert({
        milestone_id: params.milestone_id,
        task_id: params.task_id,
      })
      .select()
      .single()

    if (dbError) {
      return error(`Failed to add task to milestone: ${dbError.message}`)
    }

    return success({
      message: 'Task added to milestone successfully',
      milestone_task: data,
    })
  } catch (err) {
    return error(`Failed to add task: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function milestoneRemoveTask(params: {
  workspace_id?: string
  milestone_id: string
  task_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const milestone = await getMilestoneWithProject(supabase, params.milestone_id, workspace_id)

    if (!milestone) {
      return success({
        message: 'No milestone found with this ID in this workspace',
        milestone: null,
      })
    }

    const { error: dbError } = await supabase
      .from('milestone_tasks')
      .delete()
      .eq('milestone_id', params.milestone_id)
      .eq('task_id', params.task_id)

    if (dbError) {
      return error(`Failed to remove task: ${dbError.message}`)
    }

    return success({
      message: 'Task removed from milestone successfully',
      milestone_id: params.milestone_id,
      task_id: params.task_id,
    })
  } catch (err) {
    return error(`Failed to remove task: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function milestoneGetProgress(params: {
  workspace_id?: string
  milestone_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get milestone with tasks
    const { data: milestone } = await supabase
      .from('milestones')
      .select(`
        *,
        project:projects!inner(workspace_id),
        tasks:milestone_tasks(
          task:tasks(id, status)
        )
      `)
      .eq('id', params.milestone_id)
      .single()

    if (!milestone) {
      return success({
          message: 'No milestone found with this ID',
          milestone: null,
        })
    }

    const project = milestone.project as unknown as { workspace_id: string }
    if (project.workspace_id !== workspace_id) {
      return success({
        message: 'No milestone found with this ID in this workspace',
        milestone: null,
      })
    }

    // Calculate progress
    const tasks = (milestone.tasks as { task: { id: string; status: string } }[]) || []
    const taskStatuses = tasks.map(t => t.task?.status).filter(Boolean)

    const stats = {
      total: taskStatuses.length,
      todo: taskStatuses.filter(s => s === 'todo').length,
      in_progress: taskStatuses.filter(s => s === 'in_progress').length,
      review: taskStatuses.filter(s => s === 'review').length,
      done: taskStatuses.filter(s => s === 'done').length,
    }

    const completionPercentage = stats.total > 0
      ? Math.round((stats.done / stats.total) * 100)
      : 0

    // Determine if at risk
    const today = new Date()
    const targetDate = new Date(milestone.target_date)
    const daysUntilDue = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    let riskLevel = 'on_track'
    if (completionPercentage < 100 && daysUntilDue < 0) {
      riskLevel = 'overdue'
    } else if (completionPercentage < 50 && daysUntilDue < 7) {
      riskLevel = 'high_risk'
    } else if (completionPercentage < 75 && daysUntilDue < 14) {
      riskLevel = 'at_risk'
    }

    return success({
      milestone: {
        id: milestone.id,
        name: milestone.name,
        target_date: milestone.target_date,
        status: milestone.status,
      },
      tasks: stats,
      completion_percentage: completionPercentage,
      days_until_due: daysUntilDue,
      risk_level: riskLevel,
    })
  } catch (err) {
    return error(`Failed to get progress: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
