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

// Tool definitions for knowledge whiteboards
export const knowledgeWhiteboardTools = {
  knowledge_whiteboard_list: {
    description: 'List all whiteboards in a workspace',
    inputSchema: workspaceIdSchema.merge(paginationSchema).extend({
      is_archived: z.boolean().optional().describe('Include archived whiteboards'),
    }),
    handler: whiteboardList,
  },

  knowledge_whiteboard_get: {
    description: 'Get a single whiteboard with content',
    inputSchema: workspaceIdSchema.extend({
      whiteboard_id: z.string().uuid().describe('The whiteboard ID'),
    }),
    handler: whiteboardGet,
  },

  knowledge_whiteboard_create: {
    description: 'Create a new whiteboard',
    inputSchema: workspaceIdSchema.extend({
      title: z.string().min(1).describe('Whiteboard title'),
      icon: z.string().optional().describe('Whiteboard icon'),
      content: z.any().optional().describe('Excalidraw scene data'),
    }),
    handler: whiteboardCreate,
  },

  knowledge_whiteboard_update: {
    description: 'Update a whiteboard',
    inputSchema: workspaceIdSchema.extend({
      whiteboard_id: z.string().uuid().describe('The whiteboard ID'),
      title: z.string().min(1).optional().describe('Whiteboard title'),
      icon: z.string().optional().describe('Whiteboard icon'),
      content: z.any().optional().describe('Excalidraw scene data'),
      thumbnail: z.string().optional().describe('Base64 thumbnail preview'),
    }),
    handler: whiteboardUpdate,
  },

  knowledge_whiteboard_delete: {
    description: 'Delete a whiteboard',
    inputSchema: workspaceIdSchema.extend({
      whiteboard_id: z.string().uuid().describe('The whiteboard ID to delete'),
    }),
    handler: whiteboardDelete,
  },

  knowledge_whiteboard_archive: {
    description: 'Archive a whiteboard',
    inputSchema: workspaceIdSchema.extend({
      whiteboard_id: z.string().uuid().describe('The whiteboard ID to archive'),
    }),
    handler: whiteboardArchive,
  },

  knowledge_whiteboard_restore: {
    description: 'Restore an archived whiteboard',
    inputSchema: workspaceIdSchema.extend({
      whiteboard_id: z.string().uuid().describe('The whiteboard ID to restore'),
    }),
    handler: whiteboardRestore,
  },

  knowledge_whiteboard_favorite: {
    description: 'Add a whiteboard to favorites',
    inputSchema: workspaceIdSchema.extend({
      whiteboard_id: z.string().uuid().describe('The whiteboard ID to favorite'),
    }),
    handler: whiteboardFavorite,
  },

  knowledge_whiteboard_unfavorite: {
    description: 'Remove a whiteboard from favorites',
    inputSchema: workspaceIdSchema.extend({
      whiteboard_id: z.string().uuid().describe('The whiteboard ID to unfavorite'),
    }),
    handler: whiteboardUnfavorite,
  },
}

// Handler implementations

async function whiteboardList(params: {
  workspace_id?: string
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
      .from('knowledge_whiteboards')
      .select('id, title, icon, thumbnail, is_archived, is_favorited_by, position, created_at, updated_at')
      .eq('workspace_id', workspace_id)
      .order('updated_at', { ascending: false })

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
      whiteboards: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list whiteboards: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function whiteboardGet(params: {
  workspace_id?: string
  whiteboard_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('knowledge_whiteboards')
      .select(`
        *,
        created_by_user:profiles!knowledge_whiteboards_created_by_fkey(id, name, avatar_url),
        last_edited_by_user:profiles!knowledge_whiteboards_last_edited_by_fkey(id, name, avatar_url)
      `)
      .eq('id', params.whiteboard_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Whiteboard not found')
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success(data)
  } catch (err) {
    return error(`Failed to get whiteboard: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function whiteboardCreate(params: {
  workspace_id?: string
  title: string
  icon?: string
  content?: unknown
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get next position
    const { data: existing } = await supabase
      .from('knowledge_whiteboards')
      .select('position')
      .eq('workspace_id', workspace_id)
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = existing && existing.length > 0 ? (existing[0].position || 0) + 1 : 0

    const { data, error: dbError } = await supabase
      .from('knowledge_whiteboards')
      .insert({
        workspace_id: workspace_id,
        title: params.title,
        icon: params.icon || null,
        content: params.content || {},
        position: nextPosition,
        created_by: member.profile_id === '00000000-0000-0000-0000-000000000000' ? null : member.profile_id,
        last_edited_by: member.profile_id,
      })
      .select()
      .single()

    if (dbError) {
      return error(`Failed to create whiteboard: ${dbError.message}`)
    }

    return success({
      message: 'Whiteboard created successfully',
      whiteboard: data,
    })
  } catch (err) {
    return error(`Failed to create whiteboard: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function whiteboardUpdate(params: {
  workspace_id?: string
  whiteboard_id: string
  title?: string
  icon?: string
  content?: unknown
  thumbnail?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify whiteboard exists
    const { data: existing } = await supabase
      .from('knowledge_whiteboards')
      .select('id')
      .eq('id', params.whiteboard_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (!existing) {
      return error('Whiteboard not found in this workspace')
    }

    const updateData: Record<string, unknown> = {
      last_edited_by: member.profile_id,
    }
    if (params.title !== undefined) updateData.title = params.title
    if (params.icon !== undefined) updateData.icon = params.icon
    if (params.content !== undefined) updateData.content = params.content
    if (params.thumbnail !== undefined) updateData.thumbnail = params.thumbnail

    const { data, error: dbError } = await supabase
      .from('knowledge_whiteboards')
      .update(updateData)
      .eq('id', params.whiteboard_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to update whiteboard: ${dbError.message}`)
    }

    return success({
      message: 'Whiteboard updated successfully',
      whiteboard: data,
    })
  } catch (err) {
    return error(`Failed to update whiteboard: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function whiteboardDelete(params: {
  workspace_id?: string
  whiteboard_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify whiteboard exists
    const { data: existing } = await supabase
      .from('knowledge_whiteboards')
      .select('id')
      .eq('id', params.whiteboard_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (!existing) {
      return error('Whiteboard not found in this workspace')
    }

    const { error: dbError } = await supabase
      .from('knowledge_whiteboards')
      .delete()
      .eq('id', params.whiteboard_id)

    if (dbError) {
      return error(`Failed to delete whiteboard: ${dbError.message}`)
    }

    return success({
      message: 'Whiteboard deleted successfully',
      whiteboard_id: params.whiteboard_id,
    })
  } catch (err) {
    return error(`Failed to delete whiteboard: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function whiteboardArchive(params: {
  workspace_id?: string
  whiteboard_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    const { data, error: dbError } = await supabase
      .from('knowledge_whiteboards')
      .update({ is_archived: true, last_edited_by: member.profile_id })
      .eq('id', params.whiteboard_id)
      .eq('workspace_id', workspace_id)
      .select()
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Whiteboard not found')
      }
      return error(`Failed to archive whiteboard: ${dbError.message}`)
    }

    return success({
      message: 'Whiteboard archived successfully',
      whiteboard: data,
    })
  } catch (err) {
    return error(`Failed to archive whiteboard: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function whiteboardRestore(params: {
  workspace_id?: string
  whiteboard_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    const { data, error: dbError } = await supabase
      .from('knowledge_whiteboards')
      .update({ is_archived: false, last_edited_by: member.profile_id })
      .eq('id', params.whiteboard_id)
      .eq('workspace_id', workspace_id)
      .select()
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Whiteboard not found')
      }
      return error(`Failed to restore whiteboard: ${dbError.message}`)
    }

    return success({
      message: 'Whiteboard restored successfully',
      whiteboard: data,
    })
  } catch (err) {
    return error(`Failed to restore whiteboard: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function whiteboardFavorite(params: {
  workspace_id?: string
  whiteboard_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get current favorites
    const { data: whiteboard, error: getError } = await supabase
      .from('knowledge_whiteboards')
      .select('id, is_favorited_by')
      .eq('id', params.whiteboard_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !whiteboard) {
      return error('Whiteboard not found in this workspace')
    }

    const favorites = (whiteboard.is_favorited_by as string[]) || []
    if (favorites.includes(member.profile_id)) {
      return error('Whiteboard is already in favorites')
    }

    const { data, error: dbError } = await supabase
      .from('knowledge_whiteboards')
      .update({
        is_favorited_by: [...favorites, member.profile_id],
      })
      .eq('id', params.whiteboard_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to favorite whiteboard: ${dbError.message}`)
    }

    return success({
      message: 'Whiteboard added to favorites',
      whiteboard: data,
    })
  } catch (err) {
    return error(`Failed to favorite whiteboard: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function whiteboardUnfavorite(params: {
  workspace_id?: string
  whiteboard_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get current favorites
    const { data: whiteboard, error: getError } = await supabase
      .from('knowledge_whiteboards')
      .select('id, is_favorited_by')
      .eq('id', params.whiteboard_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !whiteboard) {
      return error('Whiteboard not found in this workspace')
    }

    const favorites = (whiteboard.is_favorited_by as string[]) || []
    const newFavorites = favorites.filter(id => id !== member.profile_id)

    const { data, error: dbError } = await supabase
      .from('knowledge_whiteboards')
      .update({ is_favorited_by: newFavorites })
      .eq('id', params.whiteboard_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to unfavorite whiteboard: ${dbError.message}`)
    }

    return success({
      message: 'Whiteboard removed from favorites',
      whiteboard: data,
    })
  } catch (err) {
    return error(`Failed to unfavorite whiteboard: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
