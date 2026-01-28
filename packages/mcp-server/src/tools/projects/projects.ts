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

// Project status enum
const projectStatusSchema = z.enum(['active', 'on_hold', 'completed', 'archived'])

// Project priority enum
const projectPrioritySchema = z.enum(['low', 'medium', 'high', 'critical'])

// Tool definitions for projects
export const projectTools = {
  project_list: {
    description: 'List all projects in a workspace',
    inputSchema: workspaceIdSchema.merge(paginationSchema).extend({
      status: projectStatusSchema.optional().describe('Filter by status'),
      department_id: z.string().uuid().optional().describe('Filter by department'),
      owner_id: z.string().uuid().optional().describe('Filter by owner'),
    }),
    handler: projectList,
  },

  project_get: {
    description: 'Get a single project by ID with details',
    inputSchema: workspaceIdSchema.extend({
      project_id: z.string().uuid().describe('The project ID'),
    }),
    handler: projectGet,
  },

  project_create: {
    description: 'Create a new project',
    inputSchema: workspaceIdSchema.extend({
      name: z.string().min(1).describe('Project name'),
      description: z.string().optional().describe('Project description'),
      status: projectStatusSchema.optional().describe('Project status'),
      priority: projectPrioritySchema.optional().describe('Project priority'),
      color: z.string().optional().describe('Color hex code'),
      icon: z.string().optional().describe('Icon name'),
      start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      target_end_date: z.string().optional().describe('Target end date (YYYY-MM-DD)'),
      budget: z.number().positive().optional().describe('Project budget'),
      department_id: z.string().uuid().optional().describe('Department ID'),
    }),
    handler: projectCreate,
  },

  project_update: {
    description: 'Update an existing project',
    inputSchema: workspaceIdSchema.extend({
      project_id: z.string().uuid().describe('The project ID'),
      name: z.string().min(1).optional().describe('Project name'),
      description: z.string().optional().describe('Project description'),
      status: projectStatusSchema.optional().describe('Project status'),
      priority: projectPrioritySchema.optional().describe('Project priority'),
      color: z.string().optional().describe('Color hex code'),
      icon: z.string().optional().describe('Icon name'),
      start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      target_end_date: z.string().optional().describe('Target end date (YYYY-MM-DD)'),
      actual_end_date: z.string().optional().describe('Actual end date (YYYY-MM-DD)'),
      budget: z.number().positive().optional().describe('Project budget'),
      department_id: z.string().uuid().optional().describe('Department ID'),
    }),
    handler: projectUpdate,
  },

  project_delete: {
    description: 'Delete a project',
    inputSchema: workspaceIdSchema.extend({
      project_id: z.string().uuid().describe('The project ID to delete'),
    }),
    handler: projectDelete,
  },

  project_archive: {
    description: 'Archive a project (sets status to archived)',
    inputSchema: workspaceIdSchema.extend({
      project_id: z.string().uuid().describe('The project ID to archive'),
    }),
    handler: projectArchive,
  },

  project_add_member: {
    description: 'Add a member to a project',
    inputSchema: workspaceIdSchema.extend({
      project_id: z.string().uuid().describe('The project ID'),
      user_id: z.string().uuid().describe('The user ID to add'),
      role: z.enum(['owner', 'admin', 'member', 'viewer']).optional().describe('Member role'),
      hours_per_week: z.number().positive().optional().describe('Expected hours per week'),
    }),
    handler: projectAddMember,
  },

  project_remove_member: {
    description: 'Remove a member from a project',
    inputSchema: workspaceIdSchema.extend({
      project_id: z.string().uuid().describe('The project ID'),
      user_id: z.string().uuid().describe('The user ID to remove'),
    }),
    handler: projectRemoveMember,
  },

  project_get_members: {
    description: 'Get all members of a project',
    inputSchema: workspaceIdSchema.extend({
      project_id: z.string().uuid().describe('The project ID'),
    }),
    handler: projectGetMembers,
  },

  project_get_progress: {
    description: 'Get project progress statistics',
    inputSchema: workspaceIdSchema.extend({
      project_id: z.string().uuid().describe('The project ID'),
    }),
    handler: projectGetProgress,
  },

  project_get_activity: {
    description: 'Get project activity log',
    inputSchema: workspaceIdSchema.extend({
      project_id: z.string().uuid().describe('The project ID'),
      limit: z.number().int().positive().max(100).optional().describe('Maximum results'),
    }),
    handler: projectGetActivity,
  },
}

// Handler implementations

async function projectList(params: {
  workspace_id?: string
  status?: string
  department_id?: string
  owner_id?: string
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
      .from('projects')
      .select(`
        *,
        department:departments(id, name, color),
        owner:profiles!projects_owner_id_fkey(id, name, avatar_url)
      `)
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false })

    if (params.status) {
      query = query.eq('status', params.status)
    }

    if (params.department_id) {
      query = query.eq('department_id', params.department_id)
    }

    if (params.owner_id) {
      query = query.eq('owner_id', params.owner_id)
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
      projects: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list projects: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function projectGet(params: {
  workspace_id?: string
  project_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('projects')
      .select(`
        *,
        department:departments(id, name, color, icon),
        owner:profiles!projects_owner_id_fkey(id, name, avatar_url),
        members:project_members(
          id,
          role,
          hours_per_week,
          user:profiles(id, name, avatar_url)
        )
      `)
      .eq('id', params.project_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Project not found', 'not_found')
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success(data)
  } catch (err) {
    return error(`Failed to get project: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function projectCreate(params: {
  workspace_id?: string
  name: string
  description?: string
  status?: string
  priority?: string
  color?: string
  icon?: string
  start_date?: string
  target_end_date?: string
  budget?: number
  department_id?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // If department_id provided, verify it belongs to this workspace
    if (params.department_id) {
      const { data: dept, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('id', params.department_id)
        .eq('workspace_id', workspace_id)
        .single()

      if (deptError || !dept) {
        return error('Department not found', 'not_found')
      }
    }

    const { data, error: dbError } = await supabase
      .from('projects')
      .insert({
        workspace_id: workspace_id,
        name: params.name,
        description: params.description || null,
        status: params.status || 'active',
        priority: params.priority || 'medium',
        color: params.color || '#6366f1',
        icon: params.icon || 'folder',
        start_date: params.start_date || null,
        target_end_date: params.target_end_date || null,
        budget: params.budget || null,
        department_id: params.department_id || null,
        owner_id: member.profile_id === '00000000-0000-0000-0000-000000000000' ? null : member.profile_id,
      })
      .select(`
        *,
        department:departments(id, name, color)
      `)
      .single()

    if (dbError) {
      return error(`Failed to create project: ${dbError.message}`)
    }

    // Add creator as owner member
    await supabase.from('project_members').insert({
      project_id: data.id,
      user_id: member.profile_id === '00000000-0000-0000-0000-000000000000' ? null : member.profile_id,
      role: 'owner',
    })

    return success({
      message: 'Project created successfully',
      project: data,
    })
  } catch (err) {
    return error(`Failed to create project: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function projectUpdate(params: {
  workspace_id?: string
  project_id: string
  name?: string
  description?: string
  status?: string
  priority?: string
  color?: string
  icon?: string
  start_date?: string
  target_end_date?: string
  actual_end_date?: string
  budget?: number
  department_id?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the project belongs to this workspace
    const { data: existing, error: getError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', params.project_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Project not found', 'not_found')
    }

    // If updating department_id, verify it belongs to this workspace
    if (params.department_id) {
      const { data: dept, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('id', params.department_id)
        .eq('workspace_id', workspace_id)
        .single()

      if (deptError || !dept) {
        return success({
          message: 'No department found with this ID in this workspace',
          department: null,
          updated: false,
        })
      }
    }

    const updateData: Record<string, unknown> = {}
    if (params.name !== undefined) updateData.name = params.name
    if (params.description !== undefined) updateData.description = params.description
    if (params.status !== undefined) updateData.status = params.status
    if (params.priority !== undefined) updateData.priority = params.priority
    if (params.color !== undefined) updateData.color = params.color
    if (params.icon !== undefined) updateData.icon = params.icon
    if (params.start_date !== undefined) updateData.start_date = params.start_date
    if (params.target_end_date !== undefined) updateData.target_end_date = params.target_end_date
    if (params.actual_end_date !== undefined) updateData.actual_end_date = params.actual_end_date
    if (params.budget !== undefined) updateData.budget = params.budget
    if (params.department_id !== undefined) updateData.department_id = params.department_id

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update', 'validation')
    }

    const { data, error: dbError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', params.project_id)
      .select(`
        *,
        department:departments(id, name, color)
      `)
      .single()

    if (dbError) {
      return error(`Failed to update project: ${dbError.message}`)
    }

    return success({
      message: 'Project updated successfully',
      project: data,
    })
  } catch (err) {
    return error(`Failed to update project: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function projectDelete(params: {
  workspace_id?: string
  project_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the project belongs to this workspace
    const { data: existing, error: getError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', params.project_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Project not found', 'not_found')
    }

    const { error: dbError } = await supabase
      .from('projects')
      .delete()
      .eq('id', params.project_id)

    if (dbError) {
      return error(`Failed to delete project: ${dbError.message}`)
    }

    return success({
      message: 'Project deleted successfully',
      project_id: params.project_id,
    })
  } catch (err) {
    return error(`Failed to delete project: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function projectArchive(params: {
  workspace_id?: string
  project_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the project belongs to this workspace
    const { data: existing, error: getError } = await supabase
      .from('projects')
      .select('id, status')
      .eq('id', params.project_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Project not found', 'not_found')
    }

    if (existing.status === 'archived') {
      return error('Project is already archived', 'validation')
    }

    const { data, error: dbError } = await supabase
      .from('projects')
      .update({ status: 'archived' })
      .eq('id', params.project_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to archive project: ${dbError.message}`)
    }

    return success({
      message: 'Project archived successfully',
      project: data,
    })
  } catch (err) {
    return error(`Failed to archive project: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function projectAddMember(params: {
  workspace_id?: string
  project_id: string
  user_id: string
  role?: string
  hours_per_week?: number
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
      return error('Project not found', 'not_found')
    }

    // Verify the user is a workspace member
    const { data: workspaceMember, error: memberError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('profile_id', params.user_id)
      .single()

    if (memberError || !workspaceMember) {
      return error('User is not a member of this workspace')
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', params.project_id)
      .eq('user_id', params.user_id)
      .single()

    if (existingMember) {
      return error('User is already a member of this project')
    }

    const { data, error: dbError } = await supabase
      .from('project_members')
      .insert({
        project_id: params.project_id,
        user_id: params.user_id,
        role: params.role || 'member',
        hours_per_week: params.hours_per_week || 40,
      })
      .select(`
        *,
        user:profiles(id, name, avatar_url)
      `)
      .single()

    if (dbError) {
      return error(`Failed to add member: ${dbError.message}`)
    }

    return success({
      message: 'Member added to project successfully',
      member: data,
    })
  } catch (err) {
    return error(`Failed to add member: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function projectRemoveMember(params: {
  workspace_id?: string
  project_id: string
  user_id: string
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
      .select('id, owner_id')
      .eq('id', params.project_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (projectError || !project) {
      return error('Project not found', 'not_found')
    }

    // Cannot remove the owner
    if (project.owner_id === params.user_id) {
      return error('Cannot remove the project owner')
    }

    const { error: dbError } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', params.project_id)
      .eq('user_id', params.user_id)

    if (dbError) {
      return error(`Failed to remove member: ${dbError.message}`)
    }

    return success({
      message: 'Member removed from project successfully',
      project_id: params.project_id,
      user_id: params.user_id,
    })
  } catch (err) {
    return error(`Failed to remove member: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function projectGetMembers(params: {
  workspace_id?: string
  project_id: string
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
      return error('Project not found', 'not_found')
    }

    const { data, error: dbError } = await supabase
      .from('project_members')
      .select(`
        *,
        user:profiles(id, name, avatar_url, email)
      `)
      .eq('project_id', params.project_id)
      .order('created_at', { ascending: true })

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      members: data || [],
      count: data?.length || 0,
      project_id: params.project_id,
    })
  } catch (err) {
    return error(`Failed to get members: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function projectGetProgress(params: {
  workspace_id?: string
  project_id: string
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
      .select('id, name, status, start_date, target_end_date')
      .eq('id', params.project_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (projectError || !project) {
      return error('Project not found', 'not_found')
    }

    // Get task statistics
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('status')
      .eq('project_id', params.project_id)

    if (tasksError) {
      return error(`Database error: ${tasksError.message}`)
    }

    const taskStats = {
      total: tasks?.length || 0,
      todo: tasks?.filter(t => t.status === 'todo').length || 0,
      in_progress: tasks?.filter(t => t.status === 'in_progress').length || 0,
      review: tasks?.filter(t => t.status === 'review').length || 0,
      done: tasks?.filter(t => t.status === 'done').length || 0,
    }

    const completionPercentage = taskStats.total > 0
      ? Math.round((taskStats.done / taskStats.total) * 100)
      : 0

    // Get milestone statistics
    const { data: milestones, error: milestonesError } = await supabase
      .from('milestones')
      .select('status')
      .eq('project_id', params.project_id)

    if (milestonesError) {
      return error(`Database error: ${milestonesError.message}`)
    }

    const milestoneStats = {
      total: milestones?.length || 0,
      upcoming: milestones?.filter(m => m.status === 'upcoming').length || 0,
      at_risk: milestones?.filter(m => m.status === 'at_risk').length || 0,
      completed: milestones?.filter(m => m.status === 'completed').length || 0,
      missed: milestones?.filter(m => m.status === 'missed').length || 0,
    }

    return success({
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        start_date: project.start_date,
        target_end_date: project.target_end_date,
      },
      tasks: taskStats,
      milestones: milestoneStats,
      completion_percentage: completionPercentage,
    })
  } catch (err) {
    return error(`Failed to get progress: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function projectGetActivity(params: {
  workspace_id?: string
  project_id: string
  limit?: number
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
      return error('Project not found', 'not_found')
    }

    const { data, error: dbError } = await supabase
      .from('project_activity')
      .select(`
        *,
        user:profiles(id, name, avatar_url)
      `)
      .eq('project_id', params.project_id)
      .order('created_at', { ascending: false })
      .limit(params.limit || 50)

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      activities: data || [],
      count: data?.length || 0,
      project_id: params.project_id,
    })
  } catch (err) {
    return error(`Failed to get activity: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
