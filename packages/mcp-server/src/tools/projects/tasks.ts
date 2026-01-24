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

// Task status enum
const taskStatusSchema = z.enum(['todo', 'in_progress', 'review', 'done'])

// Task priority enum
const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])

// Dependency type enum
const dependencyTypeSchema = z.enum(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'])

// Tool definitions for tasks
export const taskTools = {
  task_list: {
    description: 'List tasks with filters',
    inputSchema: workspaceIdSchema.merge(paginationSchema).extend({
      project_id: z.string().uuid().optional().describe('Filter by project'),
      assignee_id: z.string().uuid().optional().describe('Filter by assignee'),
      status: taskStatusSchema.optional().describe('Filter by status'),
      priority: taskPrioritySchema.optional().describe('Filter by priority'),
      milestone_id: z.string().uuid().optional().describe('Filter by milestone'),
    }),
    handler: taskList,
  },

  task_get: {
    description: 'Get a single task with details',
    inputSchema: workspaceIdSchema.extend({
      task_id: z.string().uuid().describe('The task ID'),
    }),
    handler: taskGet,
  },

  task_create: {
    description: 'Create a new task',
    inputSchema: workspaceIdSchema.extend({
      project_id: z.string().uuid().describe('The project ID'),
      title: z.string().min(1).describe('Task title'),
      description: z.string().optional().describe('Task description'),
      status: taskStatusSchema.optional().describe('Task status'),
      priority: taskPrioritySchema.optional().describe('Task priority'),
      start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      due_date: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      estimated_hours: z.number().positive().optional().describe('Estimated hours'),
      parent_id: z.string().uuid().optional().describe('Parent task ID for subtasks'),
    }),
    handler: taskCreate,
  },

  task_update: {
    description: 'Update an existing task',
    inputSchema: workspaceIdSchema.extend({
      task_id: z.string().uuid().describe('The task ID'),
      title: z.string().min(1).optional().describe('Task title'),
      description: z.string().optional().describe('Task description'),
      status: taskStatusSchema.optional().describe('Task status'),
      priority: taskPrioritySchema.optional().describe('Task priority'),
      start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      due_date: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      estimated_hours: z.number().positive().optional().describe('Estimated hours'),
      actual_hours: z.number().nonnegative().optional().describe('Actual hours worked'),
    }),
    handler: taskUpdate,
  },

  task_delete: {
    description: 'Delete a task',
    inputSchema: workspaceIdSchema.extend({
      task_id: z.string().uuid().describe('The task ID to delete'),
    }),
    handler: taskDelete,
  },

  task_assign: {
    description: 'Assign a task to a user',
    inputSchema: workspaceIdSchema.extend({
      task_id: z.string().uuid().describe('The task ID'),
      assignee_id: z.string().uuid().describe('The user ID to assign'),
    }),
    handler: taskAssign,
  },

  task_unassign: {
    description: 'Remove a user from a task',
    inputSchema: workspaceIdSchema.extend({
      task_id: z.string().uuid().describe('The task ID'),
      assignee_id: z.string().uuid().describe('The user ID to remove'),
    }),
    handler: taskUnassign,
  },

  task_change_status: {
    description: 'Change task status',
    inputSchema: workspaceIdSchema.extend({
      task_id: z.string().uuid().describe('The task ID'),
      status: taskStatusSchema.describe('New status'),
    }),
    handler: taskChangeStatus,
  },

  task_add_dependency: {
    description: 'Add a dependency to a task',
    inputSchema: workspaceIdSchema.extend({
      task_id: z.string().uuid().describe('The task ID'),
      depends_on_task_id: z.string().uuid().describe('The task this depends on'),
      dependency_type: dependencyTypeSchema.optional().describe('Type of dependency'),
    }),
    handler: taskAddDependency,
  },

  task_remove_dependency: {
    description: 'Remove a dependency from a task',
    inputSchema: workspaceIdSchema.extend({
      task_id: z.string().uuid().describe('The task ID'),
      depends_on_task_id: z.string().uuid().describe('The dependency task to remove'),
    }),
    handler: taskRemoveDependency,
  },

  task_add_label: {
    description: 'Add a label to a task',
    inputSchema: workspaceIdSchema.extend({
      task_id: z.string().uuid().describe('The task ID'),
      label_id: z.string().uuid().describe('The label ID to add'),
    }),
    handler: taskAddLabel,
  },

  task_remove_label: {
    description: 'Remove a label from a task',
    inputSchema: workspaceIdSchema.extend({
      task_id: z.string().uuid().describe('The task ID'),
      label_id: z.string().uuid().describe('The label ID to remove'),
    }),
    handler: taskRemoveLabel,
  },

  task_add_comment: {
    description: 'Add a comment to a task',
    inputSchema: workspaceIdSchema.extend({
      task_id: z.string().uuid().describe('The task ID'),
      content: z.string().min(1).describe('Comment content'),
      parent_id: z.string().uuid().optional().describe('Parent comment ID for replies'),
    }),
    handler: taskAddComment,
  },

  task_get_comments: {
    description: 'Get all comments for a task',
    inputSchema: workspaceIdSchema.extend({
      task_id: z.string().uuid().describe('The task ID'),
    }),
    handler: taskGetComments,
  },

  task_get_my_tasks: {
    description: 'Get tasks assigned to the current user',
    inputSchema: workspaceIdSchema.extend({
      status: taskStatusSchema.optional().describe('Filter by status'),
      limit: z.number().int().positive().max(100).optional().describe('Maximum results'),
    }),
    handler: taskGetMyTasks,
  },

  task_get_overdue: {
    description: 'Get overdue tasks',
    inputSchema: workspaceIdSchema.extend({
      project_id: z.string().uuid().optional().describe('Filter by project'),
    }),
    handler: taskGetOverdue,
  },
}

// Helper to get project workspace
async function getTaskProject(supabase: ReturnType<typeof getSupabase>, taskId: string, workspaceId: string) {
  const { data: task } = await supabase
    .from('tasks')
    .select('id, project:projects!inner(id, workspace_id)')
    .eq('id', taskId)
    .single()

  if (!task) return null

  const project = task.project as unknown as { id: string; workspace_id: string }
  if (project.workspace_id !== workspaceId) return null

  return task
}

// Handler implementations

async function taskList(params: {
  workspace_id?: string
  project_id?: string
  assignee_id?: string
  status?: string
  priority?: string
  milestone_id?: string
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
      .from('tasks')
      .select(`
        *,
        project:projects!inner(id, name, workspace_id),
        assignees:task_assignees(
          user:profiles(id, name, avatar_url)
        ),
        labels:task_labels(
          label:project_labels(id, name, color)
        )
      `)
      .eq('projects.workspace_id', workspace_id)
      .order('created_at', { ascending: false })

    if (params.project_id) {
      query = query.eq('project_id', params.project_id)
    }

    if (params.status) {
      query = query.eq('status', params.status)
    }

    if (params.priority) {
      query = query.eq('priority', params.priority)
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

    // Filter by assignee if specified (done post-query due to join complexity)
    let tasks = data || []
    if (params.assignee_id) {
      tasks = tasks.filter(t =>
        (t.assignees as { user: { id: string } }[])?.some(a => a.user?.id === params.assignee_id)
      )
    }

    // Filter by milestone if specified
    if (params.milestone_id) {
      const { data: milestoneTasks } = await supabase
        .from('milestone_tasks')
        .select('task_id')
        .eq('milestone_id', params.milestone_id)

      const milestoneTaskIds = new Set(milestoneTasks?.map(mt => mt.task_id) || [])
      tasks = tasks.filter(t => milestoneTaskIds.has(t.id))
    }

    return success({
      tasks,
      count: tasks.length,
    })
  } catch (err) {
    return error(`Failed to list tasks: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function taskGet(params: {
  workspace_id?: string
  task_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('tasks')
      .select(`
        *,
        project:projects!inner(id, name, workspace_id),
        assignees:task_assignees(
          user:profiles(id, name, avatar_url)
        ),
        labels:task_labels(
          label:project_labels(id, name, color)
        )
      `)
      .eq('id', params.task_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return success({
          message: 'No task found with this ID',
          task: null,
        })
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    const project = data.project as unknown as { workspace_id: string }
    if (project.workspace_id !== workspace_id) {
      return success({
        message: 'No task found with this ID in this workspace',
        task: null,
      })
    }

    return success(data)
  } catch (err) {
    return error(`Failed to get task: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function taskCreate(params: {
  workspace_id?: string
  project_id: string
  title: string
  description?: string
  status?: string
  priority?: string
  start_date?: string
  due_date?: string
  estimated_hours?: number
  parent_id?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the project belongs to this workspace
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', params.project_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (projectError || !project) {
      return success({
        message: 'No project found with this ID in this workspace',
        project: null,
      })
    }

    // If parent_id provided, verify it's in the same project
    if (params.parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from('tasks')
        .select('id')
        .eq('id', params.parent_id)
        .eq('project_id', params.project_id)
        .single()

      if (parentError || !parent) {
        return error('Parent task not found in this project')
      }
    }

    // Get max position for ordering
    const { data: existingTasks } = await supabase
      .from('tasks')
      .select('position')
      .eq('project_id', params.project_id)
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = existingTasks && existingTasks.length > 0 ? (existingTasks[0].position || 0) + 1 : 0

    const { data, error: dbError } = await supabase
      .from('tasks')
      .insert({
        project_id: params.project_id,
        title: params.title,
        description: params.description || null,
        status: params.status || 'todo',
        priority: params.priority || 'medium',
        start_date: params.start_date || null,
        due_date: params.due_date || null,
        estimated_hours: params.estimated_hours || null,
        parent_id: params.parent_id || null,
        position: nextPosition,
        created_by: member.profile_id === '00000000-0000-0000-0000-000000000000' ? null : member.profile_id,
      })
      .select()
      .single()

    if (dbError) {
      return error(`Failed to create task: ${dbError.message}`)
    }

    return success({
      message: 'Task created successfully',
      task: data,
    })
  } catch (err) {
    return error(`Failed to create task: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function taskUpdate(params: {
  workspace_id?: string
  task_id: string
  title?: string
  description?: string
  status?: string
  priority?: string
  start_date?: string
  due_date?: string
  estimated_hours?: number
  actual_hours?: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const task = await getTaskProject(supabase, params.task_id, workspace_id)

    if (!task) {
      return success({
        message: 'No task found with this ID in this workspace',
        task: null,
      })
    }

    const updateData: Record<string, unknown> = {}
    if (params.title !== undefined) updateData.title = params.title
    if (params.description !== undefined) updateData.description = params.description
    if (params.status !== undefined) updateData.status = params.status
    if (params.priority !== undefined) updateData.priority = params.priority
    if (params.start_date !== undefined) updateData.start_date = params.start_date
    if (params.due_date !== undefined) updateData.due_date = params.due_date
    if (params.estimated_hours !== undefined) updateData.estimated_hours = params.estimated_hours
    if (params.actual_hours !== undefined) updateData.actual_hours = params.actual_hours

    if (Object.keys(updateData).length === 0) {
      return success({
        message: 'No fields provided to update',
        task: null,
        updated: false,
      })
    }

    const { data, error: dbError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', params.task_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to update task: ${dbError.message}`)
    }

    return success({
      message: 'Task updated successfully',
      task: data,
    })
  } catch (err) {
    return error(`Failed to update task: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function taskDelete(params: {
  workspace_id?: string
  task_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const task = await getTaskProject(supabase, params.task_id, workspace_id)

    if (!task) {
      return success({
        message: 'No task found with this ID in this workspace',
        task: null,
      })
    }

    const { error: dbError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', params.task_id)

    if (dbError) {
      return error(`Failed to delete task: ${dbError.message}`)
    }

    return success({
      message: 'Task deleted successfully',
      task_id: params.task_id,
    })
  } catch (err) {
    return error(`Failed to delete task: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function taskAssign(params: {
  workspace_id?: string
  task_id: string
  assignee_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const task = await getTaskProject(supabase, params.task_id, workspace_id)

    if (!task) {
      return success({
        message: 'No task found with this ID in this workspace',
        task: null,
      })
    }

    // Verify the assignee is a workspace member
    const { data: workspaceMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('profile_id', params.assignee_id)
      .single()

    if (!workspaceMember) {
      return error('User is not a member of this workspace')
    }

    // Check if already assigned
    const { data: existing } = await supabase
      .from('task_assignees')
      .select('id')
      .eq('task_id', params.task_id)
      .eq('user_id', params.assignee_id)
      .single()

    if (existing) {
      return error('User is already assigned to this task')
    }

    const { data, error: dbError } = await supabase
      .from('task_assignees')
      .insert({
        task_id: params.task_id,
        user_id: params.assignee_id,
      })
      .select(`
        *,
        user:profiles(id, name, avatar_url)
      `)
      .single()

    if (dbError) {
      return error(`Failed to assign task: ${dbError.message}`)
    }

    return success({
      message: 'Task assigned successfully',
      assignment: data,
    })
  } catch (err) {
    return error(`Failed to assign task: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function taskUnassign(params: {
  workspace_id?: string
  task_id: string
  assignee_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const task = await getTaskProject(supabase, params.task_id, workspace_id)

    if (!task) {
      return success({
        message: 'No task found with this ID in this workspace',
        task: null,
      })
    }

    const { error: dbError } = await supabase
      .from('task_assignees')
      .delete()
      .eq('task_id', params.task_id)
      .eq('user_id', params.assignee_id)

    if (dbError) {
      return error(`Failed to unassign task: ${dbError.message}`)
    }

    return success({
      message: 'Task unassigned successfully',
      task_id: params.task_id,
      user_id: params.assignee_id,
    })
  } catch (err) {
    return error(`Failed to unassign task: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function taskChangeStatus(params: {
  workspace_id?: string
  task_id: string
  status: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const task = await getTaskProject(supabase, params.task_id, workspace_id)

    if (!task) {
      return success({
        message: 'No task found with this ID in this workspace',
        task: null,
      })
    }

    const { data, error: dbError } = await supabase
      .from('tasks')
      .update({ status: params.status })
      .eq('id', params.task_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to change status: ${dbError.message}`)
    }

    return success({
      message: 'Task status changed successfully',
      task: data,
    })
  } catch (err) {
    return error(`Failed to change status: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function taskAddDependency(params: {
  workspace_id?: string
  task_id: string
  depends_on_task_id: string
  dependency_type?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify both tasks exist and are in this workspace
    const task = await getTaskProject(supabase, params.task_id, workspace_id)
    const dependsOn = await getTaskProject(supabase, params.depends_on_task_id, workspace_id)

    if (!task) {
      return success({
        message: 'No task found with this ID in this workspace',
        task: null,
      })
    }

    if (!dependsOn) {
      return error('Dependency task not found in this workspace')
    }

    if (params.task_id === params.depends_on_task_id) {
      return error('A task cannot depend on itself')
    }

    const { data, error: dbError } = await supabase
      .from('task_dependencies')
      .insert({
        task_id: params.task_id,
        depends_on_id: params.depends_on_task_id,
        dependency_type: params.dependency_type || 'finish_to_start',
      })
      .select()
      .single()

    if (dbError) {
      if (dbError.code === '23505') {
        return error('This dependency already exists')
      }
      return error(`Failed to add dependency: ${dbError.message}`)
    }

    return success({
      message: 'Dependency added successfully',
      dependency: data,
    })
  } catch (err) {
    return error(`Failed to add dependency: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function taskRemoveDependency(params: {
  workspace_id?: string
  task_id: string
  depends_on_task_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const task = await getTaskProject(supabase, params.task_id, workspace_id)

    if (!task) {
      return success({
        message: 'No task found with this ID in this workspace',
        task: null,
      })
    }

    const { error: dbError } = await supabase
      .from('task_dependencies')
      .delete()
      .eq('task_id', params.task_id)
      .eq('depends_on_id', params.depends_on_task_id)

    if (dbError) {
      return error(`Failed to remove dependency: ${dbError.message}`)
    }

    return success({
      message: 'Dependency removed successfully',
      task_id: params.task_id,
      depends_on_task_id: params.depends_on_task_id,
    })
  } catch (err) {
    return error(`Failed to remove dependency: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function taskAddLabel(params: {
  workspace_id?: string
  task_id: string
  label_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get task and verify it's in this workspace
    const { data: task } = await supabase
      .from('tasks')
      .select('id, project_id, project:projects!inner(workspace_id)')
      .eq('id', params.task_id)
      .single()

    if (!task) {
      return success({
          message: 'No task found with this ID',
          task: null,
        })
    }

    const project = task.project as unknown as { workspace_id: string }
    if (project.workspace_id !== workspace_id) {
      return success({
        message: 'No task found with this ID in this workspace',
        task: null,
      })
    }

    // Verify label belongs to the same project
    const { data: label } = await supabase
      .from('project_labels')
      .select('id')
      .eq('id', params.label_id)
      .eq('project_id', task.project_id)
      .single()

    if (!label) {
      return error('Label not found in this project')
    }

    const { data, error: dbError } = await supabase
      .from('task_labels')
      .insert({
        task_id: params.task_id,
        label_id: params.label_id,
      })
      .select(`
        *,
        label:project_labels(id, name, color)
      `)
      .single()

    if (dbError) {
      if (dbError.code === '23505') {
        return error('Label is already on this task')
      }
      return error(`Failed to add label: ${dbError.message}`)
    }

    return success({
      message: 'Label added successfully',
      task_label: data,
    })
  } catch (err) {
    return error(`Failed to add label: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function taskRemoveLabel(params: {
  workspace_id?: string
  task_id: string
  label_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const task = await getTaskProject(supabase, params.task_id, workspace_id)

    if (!task) {
      return success({
        message: 'No task found with this ID in this workspace',
        task: null,
      })
    }

    const { error: dbError } = await supabase
      .from('task_labels')
      .delete()
      .eq('task_id', params.task_id)
      .eq('label_id', params.label_id)

    if (dbError) {
      return error(`Failed to remove label: ${dbError.message}`)
    }

    return success({
      message: 'Label removed successfully',
      task_id: params.task_id,
      label_id: params.label_id,
    })
  } catch (err) {
    return error(`Failed to remove label: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function taskAddComment(params: {
  workspace_id?: string
  task_id: string
  content: string
  parent_id?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const task = await getTaskProject(supabase, params.task_id, workspace_id)

    if (!task) {
      return success({
        message: 'No task found with this ID in this workspace',
        task: null,
      })
    }

    // If parent_id provided, verify it's a comment on this task
    if (params.parent_id) {
      const { data: parent } = await supabase
        .from('task_comments')
        .select('id')
        .eq('id', params.parent_id)
        .eq('task_id', params.task_id)
        .single()

      if (!parent) {
        return error('Parent comment not found on this task')
      }
    }

    const { data, error: dbError } = await supabase
      .from('task_comments')
      .insert({
        task_id: params.task_id,
        user_id: member.profile_id === '00000000-0000-0000-0000-000000000000' ? null : member.profile_id,
        content: params.content,
        parent_id: params.parent_id || null,
      })
      .select(`
        *,
        user:profiles(id, name, avatar_url)
      `)
      .single()

    if (dbError) {
      return error(`Failed to add comment: ${dbError.message}`)
    }

    return success({
      message: 'Comment added successfully',
      comment: data,
    })
  } catch (err) {
    return error(`Failed to add comment: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function taskGetComments(params: {
  workspace_id?: string
  task_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const task = await getTaskProject(supabase, params.task_id, workspace_id)

    if (!task) {
      return success({
        message: 'No task found with this ID in this workspace',
        task: null,
      })
    }

    const { data, error: dbError } = await supabase
      .from('task_comments')
      .select(`
        *,
        user:profiles(id, name, avatar_url)
      `)
      .eq('task_id', params.task_id)
      .order('created_at', { ascending: true })

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      comments: data || [],
      count: data?.length || 0,
      task_id: params.task_id,
    })
  } catch (err) {
    return error(`Failed to get comments: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function taskGetMyTasks(params: {
  workspace_id?: string
  status?: string
  limit?: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get task IDs assigned to user
    const { data: assignments, error: assignError } = await supabase
      .from('task_assignees')
      .select('task_id')
      .eq('user_id', member.profile_id)

    if (assignError) {
      return error(`Database error: ${assignError.message}`)
    }

    const taskIds = assignments?.map(a => a.task_id) || []

    if (taskIds.length === 0) {
      return success({
        tasks: [],
        count: 0,
      })
    }

    let query = supabase
      .from('tasks')
      .select(`
        *,
        project:projects!inner(id, name, workspace_id)
      `)
      .in('id', taskIds)
      .eq('projects.workspace_id', workspace_id)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (params.status) {
      query = query.eq('status', params.status)
    }

    if (params.limit) {
      query = query.limit(params.limit)
    }

    const { data, error: dbError } = await query

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      tasks: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to get my tasks: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function taskGetOverdue(params: {
  workspace_id?: string
  project_id?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const today = new Date().toISOString().split('T')[0]

    let query = supabase
      .from('tasks')
      .select(`
        *,
        project:projects!inner(id, name, workspace_id),
        assignees:task_assignees(
          user:profiles(id, name, avatar_url)
        )
      `)
      .eq('projects.workspace_id', workspace_id)
      .lt('due_date', today)
      .neq('status', 'done')
      .order('due_date', { ascending: true })

    if (params.project_id) {
      query = query.eq('project_id', params.project_id)
    }

    const { data, error: dbError } = await query

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      tasks: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to get overdue tasks: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
