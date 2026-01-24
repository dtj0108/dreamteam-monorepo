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

// Tool definitions for knowledge pages
export const knowledgePageTools = {
  knowledge_page_list: {
    description: 'List knowledge pages in a workspace',
    inputSchema: workspaceIdSchema.merge(paginationSchema).extend({
      parent_id: z.string().uuid().optional().describe('Filter by parent page'),
      is_archived: z.boolean().optional().describe('Include archived pages'),
    }),
    handler: pageList,
  },

  knowledge_page_get: {
    description: 'Get a single page with content',
    inputSchema: workspaceIdSchema.extend({
      page_id: z.string().uuid().describe('The page ID'),
    }),
    handler: pageGet,
  },

  knowledge_page_create: {
    description: 'Create a new knowledge page',
    inputSchema: workspaceIdSchema.extend({
      title: z.string().min(1).describe('Page title'),
      content: z.any().optional().describe('Page content (BlockNote JSON)'),
      parent_id: z.string().uuid().optional().describe('Parent page ID'),
      icon: z.string().optional().describe('Page icon'),
      cover_image: z.string().optional().describe('Cover image URL'),
    }),
    handler: pageCreate,
  },

  knowledge_page_update: {
    description: 'Update a knowledge page',
    inputSchema: workspaceIdSchema.extend({
      page_id: z.string().uuid().describe('The page ID'),
      title: z.string().min(1).optional().describe('Page title'),
      content: z.any().optional().describe('Page content'),
      icon: z.string().optional().describe('Page icon'),
      cover_image: z.string().optional().describe('Cover image URL'),
    }),
    handler: pageUpdate,
  },

  knowledge_page_delete: {
    description: 'Delete a knowledge page',
    inputSchema: workspaceIdSchema.extend({
      page_id: z.string().uuid().describe('The page ID to delete'),
    }),
    handler: pageDelete,
  },

  knowledge_page_archive: {
    description: 'Archive a knowledge page',
    inputSchema: workspaceIdSchema.extend({
      page_id: z.string().uuid().describe('The page ID to archive'),
    }),
    handler: pageArchive,
  },

  knowledge_page_restore: {
    description: 'Restore an archived page',
    inputSchema: workspaceIdSchema.extend({
      page_id: z.string().uuid().describe('The page ID to restore'),
    }),
    handler: pageRestore,
  },

  knowledge_page_move: {
    description: 'Move a page to a new parent',
    inputSchema: workspaceIdSchema.extend({
      page_id: z.string().uuid().describe('The page ID to move'),
      parent_id: z.string().uuid().optional().describe('New parent page ID (null for root)'),
    }),
    handler: pageMove,
  },

  knowledge_page_duplicate: {
    description: 'Duplicate a knowledge page',
    inputSchema: workspaceIdSchema.extend({
      page_id: z.string().uuid().describe('The page ID to duplicate'),
    }),
    handler: pageDuplicate,
  },

  knowledge_page_favorite: {
    description: 'Add a page to favorites',
    inputSchema: workspaceIdSchema.extend({
      page_id: z.string().uuid().describe('The page ID to favorite'),
    }),
    handler: pageFavorite,
  },

  knowledge_page_unfavorite: {
    description: 'Remove a page from favorites',
    inputSchema: workspaceIdSchema.extend({
      page_id: z.string().uuid().describe('The page ID to unfavorite'),
    }),
    handler: pageUnfavorite,
  },

  knowledge_page_search: {
    description: 'Search knowledge pages',
    inputSchema: workspaceIdSchema.extend({
      query: z.string().min(1).describe('Search query'),
      limit: z.number().int().positive().max(50).optional().describe('Maximum results'),
    }),
    handler: pageSearch,
  },

  knowledge_page_get_children: {
    description: 'Get child pages of a page',
    inputSchema: workspaceIdSchema.extend({
      page_id: z.string().uuid().describe('The parent page ID'),
    }),
    handler: pageGetChildren,
  },

  knowledge_page_reorder: {
    description: 'Reorder pages within a parent',
    inputSchema: workspaceIdSchema.extend({
      parent_id: z.string().uuid().optional().describe('Parent page ID (null for root)'),
      page_ids: z.array(z.string().uuid()).describe('Ordered list of page IDs'),
    }),
    handler: pageReorder,
  },

  knowledge_page_add_category: {
    description: 'Add a category to a page',
    inputSchema: workspaceIdSchema.extend({
      page_id: z.string().uuid().describe('The page ID'),
      category_id: z.string().uuid().describe('The category ID to add'),
    }),
    handler: pageAddCategory,
  },

  knowledge_page_remove_category: {
    description: 'Remove a category from a page',
    inputSchema: workspaceIdSchema.extend({
      page_id: z.string().uuid().describe('The page ID'),
      category_id: z.string().uuid().describe('The category ID to remove'),
    }),
    handler: pageRemoveCategory,
  },
}

// Handler implementations

async function pageList(params: {
  workspace_id?: string
  parent_id?: string
  is_archived?: boolean
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
      .from('knowledge_pages')
      .select(`
        id, title, icon, cover_image, is_archived, is_template, position, parent_id,
        created_at, updated_at,
        categories:knowledge_page_categories(
          category:knowledge_categories(id, name, color)
        )
      `)
      .eq('workspace_id', workspace_id)
      .eq('is_template', false)
      .order('position', { ascending: true })

    if (params.parent_id) {
      query = query.eq('parent_id', params.parent_id)
    } else if (params.parent_id === undefined) {
      // By default, get root pages
      query = query.is('parent_id', null)
    }

    if (params.is_archived === true) {
      query = query.eq('is_archived', true)
    } else {
      query = query.eq('is_archived', false)
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
      pages: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list pages: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pageGet(params: {
  workspace_id?: string
  page_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('knowledge_pages')
      .select(`
        *,
        categories:knowledge_page_categories(
          category:knowledge_categories(id, name, color, icon)
        ),
        parent:knowledge_pages!knowledge_pages_parent_id_fkey(id, title),
        created_by_user:profiles!knowledge_pages_created_by_fkey(id, name, avatar_url),
        last_edited_by_user:profiles!knowledge_pages_last_edited_by_fkey(id, name, avatar_url)
      `)
      .eq('id', params.page_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Page not found')
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success(data)
  } catch (err) {
    return error(`Failed to get page: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pageCreate(params: {
  workspace_id?: string
  title: string
  content?: unknown
  parent_id?: string
  icon?: string
  cover_image?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // If parent_id provided, verify it belongs to this workspace
    if (params.parent_id) {
      const { data: parent } = await supabase
        .from('knowledge_pages')
        .select('id')
        .eq('id', params.parent_id)
        .eq('workspace_id', workspace_id)
        .single()

      if (!parent) {
        return error('Parent page not found in this workspace')
      }
    }

    // Get next position
    const { data: siblings } = await supabase
      .from('knowledge_pages')
      .select('position')
      .eq('workspace_id', workspace_id)
      .is('parent_id', params.parent_id || null)
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = siblings && siblings.length > 0 ? (siblings[0].position || 0) + 1 : 0

    const { data, error: dbError } = await supabase
      .from('knowledge_pages')
      .insert({
        workspace_id: workspace_id,
        title: params.title,
        content: params.content || [],
        parent_id: params.parent_id || null,
        icon: params.icon || null,
        cover_image: params.cover_image || null,
        position: nextPosition,
        created_by: member.profile_id === '00000000-0000-0000-0000-000000000000' ? null : member.profile_id,
        last_edited_by: member.profile_id,
      })
      .select()
      .single()

    if (dbError) {
      return error(`Failed to create page: ${dbError.message}`)
    }

    return success({
      message: 'Page created successfully',
      page: data,
    })
  } catch (err) {
    return error(`Failed to create page: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pageUpdate(params: {
  workspace_id?: string
  page_id: string
  title?: string
  content?: unknown
  icon?: string
  cover_image?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify page exists
    const { data: existing } = await supabase
      .from('knowledge_pages')
      .select('id')
      .eq('id', params.page_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (!existing) {
      return error('Page not found in this workspace')
    }

    const updateData: Record<string, unknown> = {
      last_edited_by: member.profile_id,
    }
    if (params.title !== undefined) updateData.title = params.title
    if (params.content !== undefined) updateData.content = params.content
    if (params.icon !== undefined) updateData.icon = params.icon
    if (params.cover_image !== undefined) updateData.cover_image = params.cover_image

    const { data, error: dbError } = await supabase
      .from('knowledge_pages')
      .update(updateData)
      .eq('id', params.page_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to update page: ${dbError.message}`)
    }

    return success({
      message: 'Page updated successfully',
      page: data,
    })
  } catch (err) {
    return error(`Failed to update page: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pageDelete(params: {
  workspace_id?: string
  page_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify page exists
    const { data: existing } = await supabase
      .from('knowledge_pages')
      .select('id')
      .eq('id', params.page_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (!existing) {
      return error('Page not found in this workspace')
    }

    const { error: dbError } = await supabase
      .from('knowledge_pages')
      .delete()
      .eq('id', params.page_id)

    if (dbError) {
      return error(`Failed to delete page: ${dbError.message}`)
    }

    return success({
      message: 'Page deleted successfully',
      page_id: params.page_id,
    })
  } catch (err) {
    return error(`Failed to delete page: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pageArchive(params: {
  workspace_id?: string
  page_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    const { data, error: dbError } = await supabase
      .from('knowledge_pages')
      .update({ is_archived: true, last_edited_by: member.profile_id })
      .eq('id', params.page_id)
      .eq('workspace_id', workspace_id)
      .select()
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Page not found')
      }
      return error(`Failed to archive page: ${dbError.message}`)
    }

    return success({
      message: 'Page archived successfully',
      page: data,
    })
  } catch (err) {
    return error(`Failed to archive page: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pageRestore(params: {
  workspace_id?: string
  page_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    const { data, error: dbError } = await supabase
      .from('knowledge_pages')
      .update({ is_archived: false, last_edited_by: member.profile_id })
      .eq('id', params.page_id)
      .eq('workspace_id', workspace_id)
      .select()
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Page not found')
      }
      return error(`Failed to restore page: ${dbError.message}`)
    }

    return success({
      message: 'Page restored successfully',
      page: data,
    })
  } catch (err) {
    return error(`Failed to restore page: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pageMove(params: {
  workspace_id?: string
  page_id: string
  parent_id?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify page exists
    const { data: existing } = await supabase
      .from('knowledge_pages')
      .select('id')
      .eq('id', params.page_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (!existing) {
      return error('Page not found in this workspace')
    }

    // If parent_id provided, verify it belongs to this workspace and is not the page itself
    if (params.parent_id) {
      if (params.parent_id === params.page_id) {
        return error('Cannot move a page into itself')
      }

      const { data: parent } = await supabase
        .from('knowledge_pages')
        .select('id')
        .eq('id', params.parent_id)
        .eq('workspace_id', workspace_id)
        .single()

      if (!parent) {
        return error('Parent page not found in this workspace')
      }
    }

    // Get next position in new parent
    const { data: siblings } = await supabase
      .from('knowledge_pages')
      .select('position')
      .eq('workspace_id', workspace_id)
      .is('parent_id', params.parent_id || null)
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = siblings && siblings.length > 0 ? (siblings[0].position || 0) + 1 : 0

    const { data, error: dbError } = await supabase
      .from('knowledge_pages')
      .update({
        parent_id: params.parent_id || null,
        position: nextPosition,
        last_edited_by: member.profile_id,
      })
      .eq('id', params.page_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to move page: ${dbError.message}`)
    }

    return success({
      message: 'Page moved successfully',
      page: data,
    })
  } catch (err) {
    return error(`Failed to move page: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pageDuplicate(params: {
  workspace_id?: string
  page_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get original page
    const { data: original, error: getError } = await supabase
      .from('knowledge_pages')
      .select('*')
      .eq('id', params.page_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !original) {
      return error('Page not found in this workspace')
    }

    // Get next position
    const { data: siblings } = await supabase
      .from('knowledge_pages')
      .select('position')
      .eq('workspace_id', workspace_id)
      .is('parent_id', original.parent_id)
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = siblings && siblings.length > 0 ? (siblings[0].position || 0) + 1 : 0

    // Create duplicate
    const { data, error: dbError } = await supabase
      .from('knowledge_pages')
      .insert({
        workspace_id: workspace_id,
        title: `${original.title} (Copy)`,
        content: original.content,
        parent_id: original.parent_id,
        icon: original.icon,
        cover_image: original.cover_image,
        position: nextPosition,
        created_by: member.profile_id === '00000000-0000-0000-0000-000000000000' ? null : member.profile_id,
        last_edited_by: member.profile_id,
      })
      .select()
      .single()

    if (dbError) {
      return error(`Failed to duplicate page: ${dbError.message}`)
    }

    return success({
      message: 'Page duplicated successfully',
      page: data,
    })
  } catch (err) {
    return error(`Failed to duplicate page: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pageFavorite(params: {
  workspace_id?: string
  page_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get current favorites
    const { data: page, error: getError } = await supabase
      .from('knowledge_pages')
      .select('id, is_favorited_by')
      .eq('id', params.page_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !page) {
      return error('Page not found in this workspace')
    }

    const favorites = (page.is_favorited_by as string[]) || []
    if (favorites.includes(member.profile_id)) {
      return error('Page is already in favorites')
    }

    const { data, error: dbError } = await supabase
      .from('knowledge_pages')
      .update({
        is_favorited_by: [...favorites, member.profile_id],
      })
      .eq('id', params.page_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to favorite page: ${dbError.message}`)
    }

    return success({
      message: 'Page added to favorites',
      page: data,
    })
  } catch (err) {
    return error(`Failed to favorite page: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pageUnfavorite(params: {
  workspace_id?: string
  page_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get current favorites
    const { data: page, error: getError } = await supabase
      .from('knowledge_pages')
      .select('id, is_favorited_by')
      .eq('id', params.page_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !page) {
      return error('Page not found in this workspace')
    }

    const favorites = (page.is_favorited_by as string[]) || []
    const newFavorites = favorites.filter(id => id !== member.profile_id)

    const { data, error: dbError } = await supabase
      .from('knowledge_pages')
      .update({ is_favorited_by: newFavorites })
      .eq('id', params.page_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to unfavorite page: ${dbError.message}`)
    }

    return success({
      message: 'Page removed from favorites',
      page: data,
    })
  } catch (err) {
    return error(`Failed to unfavorite page: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pageSearch(params: {
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
      .from('knowledge_pages')
      .select('id, title, icon, parent_id, updated_at')
      .eq('workspace_id', workspace_id)
      .eq('is_archived', false)
      .eq('is_template', false)
      .ilike('title', searchQuery)
      .order('updated_at', { ascending: false })
      .limit(params.limit || 20)

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      pages: data || [],
      count: data?.length || 0,
      query: params.query,
    })
  } catch (err) {
    return error(`Failed to search pages: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pageGetChildren(params: {
  workspace_id?: string
  page_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify parent page exists
    const { data: parent } = await supabase
      .from('knowledge_pages')
      .select('id')
      .eq('id', params.page_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (!parent) {
      return error('Page not found in this workspace')
    }

    const { data, error: dbError } = await supabase
      .from('knowledge_pages')
      .select('id, title, icon, is_archived, position')
      .eq('workspace_id', workspace_id)
      .eq('parent_id', params.page_id)
      .eq('is_template', false)
      .order('position', { ascending: true })

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      children: data || [],
      count: data?.length || 0,
      parent_id: params.page_id,
    })
  } catch (err) {
    return error(`Failed to get children: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pageReorder(params: {
  workspace_id?: string
  parent_id?: string
  page_ids: string[]
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Update positions for each page
    const updates = params.page_ids.map((pageId, index) =>
      supabase
        .from('knowledge_pages')
        .update({ position: index })
        .eq('id', pageId)
        .eq('workspace_id', workspace_id)
        .is('parent_id', params.parent_id || null)
    )

    await Promise.all(updates)

    return success({
      message: 'Pages reordered successfully',
      page_ids: params.page_ids,
    })
  } catch (err) {
    return error(`Failed to reorder pages: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pageAddCategory(params: {
  workspace_id?: string
  page_id: string
  category_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify page exists
    const { data: page } = await supabase
      .from('knowledge_pages')
      .select('id')
      .eq('id', params.page_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (!page) {
      return error('Page not found in this workspace')
    }

    // Verify category exists
    const { data: category } = await supabase
      .from('knowledge_categories')
      .select('id')
      .eq('id', params.category_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (!category) {
      return error('Category not found in this workspace')
    }

    const { data, error: dbError } = await supabase
      .from('knowledge_page_categories')
      .insert({
        page_id: params.page_id,
        category_id: params.category_id,
      })
      .select()
      .single()

    if (dbError) {
      if (dbError.code === '23505') {
        return error('Page already has this category')
      }
      return error(`Failed to add category: ${dbError.message}`)
    }

    return success({
      message: 'Category added to page',
      page_category: data,
    })
  } catch (err) {
    return error(`Failed to add category: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pageRemoveCategory(params: {
  workspace_id?: string
  page_id: string
  category_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    const { error: dbError } = await supabase
      .from('knowledge_page_categories')
      .delete()
      .eq('page_id', params.page_id)
      .eq('category_id', params.category_id)

    if (dbError) {
      return error(`Failed to remove category: ${dbError.message}`)
    }

    return success({
      message: 'Category removed from page',
      page_id: params.page_id,
      category_id: params.category_id,
    })
  } catch (err) {
    return error(`Failed to remove category: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
