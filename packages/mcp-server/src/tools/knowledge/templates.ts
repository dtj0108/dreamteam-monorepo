import { z } from 'zod'
import { getSupabase, validateWorkspaceAccess } from '../../auth.js'
import { resolveWorkspaceId } from '../../lib/context.js'
import {
  workspaceIdSchema,
  success,
  error,
  type ToolResult,
} from '../../types.js'

// Tool definitions for knowledge templates
export const knowledgeTemplateTools = {
  knowledge_template_list: {
    description: 'List available knowledge templates',
    inputSchema: workspaceIdSchema.extend({
      include_system: z.boolean().optional().describe('Include system templates'),
      category: z.string().optional().describe('Filter by category'),
    }),
    handler: templateList,
  },

  knowledge_template_get: {
    description: 'Get a single template',
    inputSchema: workspaceIdSchema.extend({
      template_id: z.string().uuid().describe('The template ID'),
    }),
    handler: templateGet,
  },

  knowledge_template_create: {
    description: 'Create a new knowledge template',
    inputSchema: workspaceIdSchema.extend({
      name: z.string().min(1).describe('Template name'),
      description: z.string().optional().describe('Template description'),
      icon: z.string().optional().describe('Template icon'),
      category: z.string().optional().describe('Template category'),
      content: z.any().describe('Template content (BlockNote JSON)'),
    }),
    handler: templateCreate,
  },

  knowledge_template_update: {
    description: 'Update a knowledge template',
    inputSchema: workspaceIdSchema.extend({
      template_id: z.string().uuid().describe('The template ID'),
      name: z.string().min(1).optional().describe('Template name'),
      description: z.string().optional().describe('Template description'),
      icon: z.string().optional().describe('Template icon'),
      category: z.string().optional().describe('Template category'),
      content: z.any().optional().describe('Template content'),
    }),
    handler: templateUpdate,
  },

  knowledge_template_delete: {
    description: 'Delete a knowledge template (cannot delete system templates)',
    inputSchema: workspaceIdSchema.extend({
      template_id: z.string().uuid().describe('The template ID to delete'),
    }),
    handler: templateDelete,
  },

  knowledge_template_use: {
    description: 'Create a new page from a template',
    inputSchema: workspaceIdSchema.extend({
      template_id: z.string().uuid().describe('The template ID to use'),
      title: z.string().min(1).describe('Title for the new page'),
      parent_id: z.string().uuid().optional().describe('Parent page ID'),
    }),
    handler: templateUse,
  },
}

// Handler implementations

async function templateList(params: {
  workspace_id?: string
  include_system?: boolean
  category?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    let query = supabase
      .from('knowledge_templates')
      .select('*')
      .order('name', { ascending: true })

    // Filter by workspace or include system templates
    if (params.include_system !== false) {
      query = query.or(`workspace_id.eq.${workspace_id},is_system.eq.true`)
    } else {
      query = query.eq('workspace_id', workspace_id)
    }

    if (params.category) {
      query = query.eq('category', params.category)
    }

    const { data, error: dbError } = await query

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      templates: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list templates: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function templateGet(params: {
  workspace_id?: string
  template_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('knowledge_templates')
      .select('*')
      .eq('id', params.template_id)
      .or(`workspace_id.eq.${workspace_id},is_system.eq.true`)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Template not found')
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success(data)
  } catch (err) {
    return error(`Failed to get template: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function templateCreate(params: {
  workspace_id?: string
  name: string
  description?: string
  icon?: string
  category?: string
  content: unknown
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('knowledge_templates')
      .insert({
        workspace_id: workspace_id,
        name: params.name,
        description: params.description || null,
        icon: params.icon || null,
        category: params.category || 'general',
        content: params.content,
        is_system: false,
        usage_count: 0,
        created_by: member.profile_id === '00000000-0000-0000-0000-000000000000' ? null : member.profile_id,
      })
      .select()
      .single()

    if (dbError) {
      return error(`Failed to create template: ${dbError.message}`)
    }

    return success({
      message: 'Template created successfully',
      template: data,
    })
  } catch (err) {
    return error(`Failed to create template: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function templateUpdate(params: {
  workspace_id?: string
  template_id: string
  name?: string
  description?: string
  icon?: string
  category?: string
  content?: unknown
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify template exists and is not a system template
    const { data: existing, error: getError } = await supabase
      .from('knowledge_templates')
      .select('id, is_system')
      .eq('id', params.template_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Template not found in this workspace')
    }

    if (existing.is_system) {
      return error('Cannot modify system templates')
    }

    const updateData: Record<string, unknown> = {}
    if (params.name !== undefined) updateData.name = params.name
    if (params.description !== undefined) updateData.description = params.description
    if (params.icon !== undefined) updateData.icon = params.icon
    if (params.category !== undefined) updateData.category = params.category
    if (params.content !== undefined) updateData.content = params.content

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update')
    }

    const { data, error: dbError } = await supabase
      .from('knowledge_templates')
      .update(updateData)
      .eq('id', params.template_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to update template: ${dbError.message}`)
    }

    return success({
      message: 'Template updated successfully',
      template: data,
    })
  } catch (err) {
    return error(`Failed to update template: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function templateDelete(params: {
  workspace_id?: string
  template_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify template exists and is not a system template
    const { data: existing, error: getError } = await supabase
      .from('knowledge_templates')
      .select('id, is_system')
      .eq('id', params.template_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Template not found in this workspace')
    }

    if (existing.is_system) {
      return error('Cannot delete system templates')
    }

    const { error: dbError } = await supabase
      .from('knowledge_templates')
      .delete()
      .eq('id', params.template_id)

    if (dbError) {
      return error(`Failed to delete template: ${dbError.message}`)
    }

    return success({
      message: 'Template deleted successfully',
      template_id: params.template_id,
    })
  } catch (err) {
    return error(`Failed to delete template: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function templateUse(params: {
  workspace_id?: string
  template_id: string
  title: string
  parent_id?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('knowledge_templates')
      .select('*')
      .eq('id', params.template_id)
      .or(`workspace_id.eq.${workspace_id},is_system.eq.true`)
      .single()

    if (templateError || !template) {
      return error('Template not found')
    }

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

    // Create page from template
    const { data: page, error: pageError } = await supabase
      .from('knowledge_pages')
      .insert({
        workspace_id: workspace_id,
        title: params.title,
        icon: template.icon,
        content: template.content,
        template_id: template.id,
        parent_id: params.parent_id || null,
        position: nextPosition,
        created_by: member.profile_id === '00000000-0000-0000-0000-000000000000' ? null : member.profile_id,
        last_edited_by: member.profile_id,
      })
      .select()
      .single()

    if (pageError) {
      return error(`Failed to create page: ${pageError.message}`)
    }

    // Increment template usage count
    await supabase
      .from('knowledge_templates')
      .update({ usage_count: (template.usage_count || 0) + 1 })
      .eq('id', template.id)

    return success({
      message: 'Page created from template successfully',
      page,
    })
  } catch (err) {
    return error(`Failed to use template: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
