import { z } from 'zod'
import { getSupabase, validateWorkspaceAccess } from '../../auth.js'
import { resolveWorkspaceId } from '../../lib/context.js'
import {
  workspaceIdSchema,
  success,
  error,
  type ToolResult,
} from '../../types.js'

// Tool definitions for knowledge categories
export const knowledgeCategoryTools = {
  knowledge_category_list: {
    description: 'List all knowledge categories in a workspace',
    inputSchema: workspaceIdSchema,
    handler: categoryList,
  },

  knowledge_category_get: {
    description: 'Get a single category with its pages',
    inputSchema: workspaceIdSchema.extend({
      category_id: z.string().uuid().describe('The category ID'),
    }),
    handler: categoryGet,
  },

  knowledge_category_create: {
    description: 'Create a new knowledge category',
    inputSchema: workspaceIdSchema.extend({
      name: z.string().min(1).describe('Category name'),
      slug: z.string().optional().describe('URL-friendly slug'),
      color: z.string().optional().describe('Color hex code'),
      icon: z.string().optional().describe('Lucide icon name'),
    }),
    handler: categoryCreate,
  },

  knowledge_category_update: {
    description: 'Update a knowledge category',
    inputSchema: workspaceIdSchema.extend({
      category_id: z.string().uuid().describe('The category ID'),
      name: z.string().min(1).optional().describe('Category name'),
      color: z.string().optional().describe('Color hex code'),
      icon: z.string().optional().describe('Lucide icon name'),
      position: z.number().int().nonnegative().optional().describe('Display position'),
    }),
    handler: categoryUpdate,
  },

  knowledge_category_delete: {
    description: 'Delete a knowledge category (cannot delete system categories)',
    inputSchema: workspaceIdSchema.extend({
      category_id: z.string().uuid().describe('The category ID to delete'),
    }),
    handler: categoryDelete,
  },
}

// Handler implementations

async function categoryList(params: {
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
      .from('knowledge_categories')
      .select('*')
      .eq('workspace_id', workspace_id)
      .order('position', { ascending: true })

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      categories: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list categories: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function categoryGet(params: {
  workspace_id?: string
  category_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get category
    const { data: category, error: catError } = await supabase
      .from('knowledge_categories')
      .select('*')
      .eq('id', params.category_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (catError) {
      if (catError.code === 'PGRST116') {
        return error('Category not found')
      }
      return error(`Database error: ${catError.message}`)
    }

    // Get pages in this category
    const { data: pageLinks } = await supabase
      .from('knowledge_page_categories')
      .select(`
        page:knowledge_pages(id, title, icon, is_archived, updated_at)
      `)
      .eq('category_id', params.category_id)

    const pages = pageLinks?.map(pl => pl.page).filter(Boolean) || []

    return success({
      ...category,
      pages,
    })
  } catch (err) {
    return error(`Failed to get category: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function categoryCreate(params: {
  workspace_id?: string
  name: string
  slug?: string
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

    // Generate slug from name if not provided
    const slug = params.slug || params.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    // Get next position
    const { data: existing } = await supabase
      .from('knowledge_categories')
      .select('position')
      .eq('workspace_id', workspace_id)
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = existing && existing.length > 0 ? (existing[0].position || 0) + 1 : 0

    const { data, error: dbError } = await supabase
      .from('knowledge_categories')
      .insert({
        workspace_id: workspace_id,
        name: params.name,
        slug,
        color: params.color || '#6b7280',
        icon: params.icon || 'folder',
        is_system: false,
        position: nextPosition,
        created_by: member.profile_id === '00000000-0000-0000-0000-000000000000' ? null : member.profile_id,
      })
      .select()
      .single()

    if (dbError) {
      if (dbError.code === '23505') {
        return error('A category with this slug already exists in this workspace')
      }
      return error(`Failed to create category: ${dbError.message}`)
    }

    return success({
      message: 'Category created successfully',
      category: data,
    })
  } catch (err) {
    return error(`Failed to create category: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function categoryUpdate(params: {
  workspace_id?: string
  category_id: string
  name?: string
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

    // Verify category exists and belongs to workspace
    const { data: existing, error: getError } = await supabase
      .from('knowledge_categories')
      .select('id, is_system')
      .eq('id', params.category_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Category not found in this workspace')
    }

    const updateData: Record<string, unknown> = {}
    if (params.name !== undefined) updateData.name = params.name
    if (params.color !== undefined) updateData.color = params.color
    if (params.icon !== undefined) updateData.icon = params.icon
    if (params.position !== undefined) updateData.position = params.position

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update', 'validation')
    }

    const { data, error: dbError } = await supabase
      .from('knowledge_categories')
      .update(updateData)
      .eq('id', params.category_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to update category: ${dbError.message}`)
    }

    return success({
      message: 'Category updated successfully',
      category: data,
    })
  } catch (err) {
    return error(`Failed to update category: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function categoryDelete(params: {
  workspace_id?: string
  category_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify category exists and is not a system category
    const { data: existing, error: getError } = await supabase
      .from('knowledge_categories')
      .select('id, is_system')
      .eq('id', params.category_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Category not found in this workspace')
    }

    if (existing.is_system) {
      return error('Cannot delete system categories')
    }

    const { error: dbError } = await supabase
      .from('knowledge_categories')
      .delete()
      .eq('id', params.category_id)

    if (dbError) {
      return error(`Failed to delete category: ${dbError.message}`)
    }

    return success({
      message: 'Category deleted successfully',
      category_id: params.category_id,
    })
  } catch (err) {
    return error(`Failed to delete category: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
