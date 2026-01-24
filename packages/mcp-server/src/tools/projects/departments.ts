import { z } from 'zod'
import { getSupabase, validateWorkspaceAccess } from '../../auth.js'
import { resolveWorkspaceId } from '../../lib/context.js'
import {
  workspaceIdSchema,
  success,
  error,
  type ToolResult,
} from '../../types.js'

// Tool definitions for departments
export const departmentTools = {
  department_list: {
    description: 'List all departments in a workspace',
    inputSchema: workspaceIdSchema,
    handler: departmentList,
  },

  department_get: {
    description: 'Get a single department by ID',
    inputSchema: workspaceIdSchema.extend({
      department_id: z.string().uuid().describe('The department ID'),
    }),
    handler: departmentGet,
  },

  department_create: {
    description: 'Create a new department',
    inputSchema: workspaceIdSchema.extend({
      name: z.string().min(1).describe('Department name'),
      description: z.string().optional().describe('Department description'),
      color: z.string().optional().describe('Color hex code (e.g., #6366f1)'),
      icon: z.string().optional().describe('Icon name (e.g., building-2)'),
    }),
    handler: departmentCreate,
  },

  department_update: {
    description: 'Update an existing department',
    inputSchema: workspaceIdSchema.extend({
      department_id: z.string().uuid().describe('The department ID'),
      name: z.string().min(1).optional().describe('Department name'),
      description: z.string().optional().describe('Department description'),
      color: z.string().optional().describe('Color hex code'),
      icon: z.string().optional().describe('Icon name'),
      position: z.number().int().nonnegative().optional().describe('Display position'),
    }),
    handler: departmentUpdate,
  },

  department_delete: {
    description: 'Delete a department',
    inputSchema: workspaceIdSchema.extend({
      department_id: z.string().uuid().describe('The department ID to delete'),
    }),
    handler: departmentDelete,
  },
}

// Handler implementations

async function departmentList(params: {
  workspace_id?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('departments')
      .select('*')
      .eq('workspace_id', workspace_id)
      .order('position', { ascending: true })

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      departments: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list departments: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function departmentGet(params: {
  workspace_id?: string
  department_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('departments')
      .select(`
        *,
        projects:projects(id, name, status)
      `)
      .eq('id', params.department_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return success({
          message: 'No department found with this ID',
          department: null,
        })
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success(data)
  } catch (err) {
    return error(`Failed to get department: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function departmentCreate(params: {
  workspace_id?: string
  name: string
  description?: string
  color?: string
  icon?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get the next position
    const { data: existing } = await supabase
      .from('departments')
      .select('position')
      .eq('workspace_id', workspace_id)
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = existing && existing.length > 0 ? (existing[0].position || 0) + 1 : 0

    // Use null for created_by if profile_id is the nil UUID (service mode)
    const createdBy = member.profile_id === '00000000-0000-0000-0000-000000000000' 
      ? null 
      : member.profile_id

    const { data, error: dbError } = await supabase
      .from('departments')
      .insert({
        workspace_id: workspace_id,
        name: params.name,
        description: params.description || null,
        color: params.color || '#6366f1',
        icon: params.icon || 'building-2',
        position: nextPosition,
        created_by: createdBy,
      })
      .select()
      .single()

    if (dbError) {
      return error(`Failed to create department: ${dbError.message}`)
    }

    return success({
      message: 'Department created successfully',
      department: data,
    })
  } catch (err) {
    return error(`Failed to create department: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function departmentUpdate(params: {
  workspace_id?: string
  department_id: string
  name?: string
  description?: string
  color?: string
  icon?: string
  position?: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the department belongs to this workspace
    const { data: existing, error: getError } = await supabase
      .from('departments')
      .select('id')
      .eq('id', params.department_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return success({
        message: 'No department found with this ID in this workspace',
        department: null,
        updated: false,
      })
    }

    const updateData: Record<string, unknown> = {}
    if (params.name !== undefined) updateData.name = params.name
    if (params.description !== undefined) updateData.description = params.description
    if (params.color !== undefined) updateData.color = params.color
    if (params.icon !== undefined) updateData.icon = params.icon
    if (params.position !== undefined) updateData.position = params.position

    if (Object.keys(updateData).length === 0) {
      return success({
        message: 'No fields provided to update',
        department: null,
        updated: false,
      })
    }

    const { data, error: dbError } = await supabase
      .from('departments')
      .update(updateData)
      .eq('id', params.department_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to update department: ${dbError.message}`)
    }

    return success({
      message: 'Department updated successfully',
      department: data,
    })
  } catch (err) {
    return error(`Failed to update department: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function departmentDelete(params: {
  workspace_id?: string
  department_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the department belongs to this workspace
    const { data: existing, error: getError } = await supabase
      .from('departments')
      .select('id')
      .eq('id', params.department_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return success({
        message: 'No department found with this ID in this workspace',
        deleted: false,
      })
    }

    const { error: dbError } = await supabase
      .from('departments')
      .delete()
      .eq('id', params.department_id)

    if (dbError) {
      return error(`Failed to delete department: ${dbError.message}`)
    }

    return success({
      message: 'Department deleted successfully',
      department_id: params.department_id,
    })
  } catch (err) {
    return error(`Failed to delete department: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
