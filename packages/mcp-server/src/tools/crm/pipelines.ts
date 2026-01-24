import { z } from 'zod'
import { getSupabase, validateWorkspaceAccess } from '../../auth.js'
import { resolveWorkspaceId } from '../../lib/context.js'
import {
  workspaceIdSchema,
  success,
  error,
  type ToolResult,
} from '../../types.js'

// Tool definitions for pipelines
export const pipelineTools = {
  pipeline_list: {
    description: 'List all lead pipelines',
    inputSchema: workspaceIdSchema,
    handler: pipelineList,
  },

  pipeline_get: {
    description: 'Get a single pipeline with all its stages',
    inputSchema: workspaceIdSchema.extend({
      pipeline_id: z.string().uuid().describe('The pipeline ID'),
    }),
    handler: pipelineGet,
  },

  pipeline_create: {
    description: 'Create a new lead pipeline',
    inputSchema: workspaceIdSchema.extend({
      name: z.string().min(1).describe('Pipeline name'),
      description: z.string().optional().describe('Pipeline description'),
      is_default: z.boolean().optional().describe('Set as default pipeline'),
    }),
    handler: pipelineCreate,
  },

  pipeline_update: {
    description: 'Update an existing pipeline',
    inputSchema: workspaceIdSchema.extend({
      pipeline_id: z.string().uuid().describe('The pipeline ID'),
      name: z.string().min(1).optional().describe('Pipeline name'),
      description: z.string().optional().describe('Pipeline description'),
      is_default: z.boolean().optional().describe('Set as default pipeline'),
    }),
    handler: pipelineUpdate,
  },

  pipeline_delete: {
    description: 'Delete a pipeline',
    inputSchema: workspaceIdSchema.extend({
      pipeline_id: z.string().uuid().describe('The pipeline ID to delete'),
    }),
    handler: pipelineDelete,
  },

  pipeline_add_stage: {
    description: 'Add a new stage to a pipeline',
    inputSchema: workspaceIdSchema.extend({
      pipeline_id: z.string().uuid().describe('The pipeline ID'),
      name: z.string().min(1).describe('Stage name'),
      color: z.string().optional().describe('Stage color (hex code)'),
      position: z.number().int().optional().describe('Stage position (order)'),
      is_won: z.boolean().optional().describe('Mark as won stage'),
      is_lost: z.boolean().optional().describe('Mark as lost stage'),
    }),
    handler: pipelineAddStage,
  },

  pipeline_update_stage: {
    description: 'Update a pipeline stage',
    inputSchema: workspaceIdSchema.extend({
      stage_id: z.string().uuid().describe('The stage ID'),
      name: z.string().min(1).optional().describe('Stage name'),
      color: z.string().optional().describe('Stage color (hex code)'),
      position: z.number().int().optional().describe('Stage position (order)'),
      is_won: z.boolean().optional().describe('Mark as won stage'),
      is_lost: z.boolean().optional().describe('Mark as lost stage'),
    }),
    handler: pipelineUpdateStage,
  },

  pipeline_delete_stage: {
    description: 'Delete a pipeline stage',
    inputSchema: workspaceIdSchema.extend({
      stage_id: z.string().uuid().describe('The stage ID to delete'),
    }),
    handler: pipelineDeleteStage,
  },

  pipeline_reorder_stages: {
    description: 'Reorder stages in a pipeline',
    inputSchema: workspaceIdSchema.extend({
      pipeline_id: z.string().uuid().describe('The pipeline ID'),
      stage_ids: z.array(z.string().uuid()).describe('Ordered array of stage IDs'),
    }),
    handler: pipelineReorderStages,
  },
}

// Handler implementations

async function pipelineList(params: {
  workspace_id?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get pipelines for the user (pipelines are user-scoped via user_id)
    const { data, error: dbError } = await supabase
      .from('lead_pipelines')
      .select(`
        *,
        stages:lead_pipeline_stages(id, name, color, position, is_won, is_lost)
      `)
      .eq('user_id', member.profile_id)
      .order('created_at', { ascending: true })

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    // Sort stages by position within each pipeline
    const pipelinesWithSortedStages = (data || []).map(pipeline => ({
      ...pipeline,
      stages: (pipeline.stages || []).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
    }))

    return success({
      pipelines: pipelinesWithSortedStages,
      count: pipelinesWithSortedStages.length,
    })
  } catch (err) {
    return error(`Failed to list pipelines: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pipelineGet(params: {
  workspace_id?: string
  pipeline_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('lead_pipelines')
      .select(`
        *,
        stages:lead_pipeline_stages(id, name, color, position, is_won, is_lost)
      `)
      .eq('id', params.pipeline_id)
      .eq('user_id', member.profile_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return success({
          message: 'No pipeline found with this ID',
          pipeline: null,
        })
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    // Sort stages by position
    const pipelineWithSortedStages = {
      ...data,
      stages: (data.stages || []).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
    }

    // Get count of leads in each stage
    const stageIds = (data.stages || []).map((s: { id: string }) => s.id)
    if (stageIds.length > 0) {
      const { data: leadCounts, error: countError } = await supabase
        .from('leads')
        .select('stage_id')
        .in('stage_id', stageIds)

      if (!countError && leadCounts) {
        const countByStage = leadCounts.reduce((acc: Record<string, number>, lead) => {
          acc[lead.stage_id] = (acc[lead.stage_id] || 0) + 1
          return acc
        }, {})

        pipelineWithSortedStages.stages = pipelineWithSortedStages.stages.map((stage: { id: string }) => ({
          ...stage,
          lead_count: countByStage[stage.id] || 0,
        }))
      }
    }

    return success(pipelineWithSortedStages)
  } catch (err) {
    return error(`Failed to get pipeline: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pipelineCreate(params: {
  workspace_id?: string
  name: string
  description?: string
  is_default?: boolean
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // If this is set as default, unset other defaults first
    if (params.is_default) {
      await supabase
        .from('lead_pipelines')
        .update({ is_default: false })
        .eq('user_id', member.profile_id)
    }

    const { data, error: dbError } = await supabase
      .from('lead_pipelines')
      .insert({
        user_id: member.profile_id === '00000000-0000-0000-0000-000000000000' ? null : member.profile_id,
        name: params.name,
        description: params.description || null,
        is_default: params.is_default || false,
      })
      .select('*')
      .single()

    if (dbError) {
      return error(`Failed to create pipeline: ${dbError.message}`)
    }

    // Create default stages for the pipeline
    const defaultStages = [
      { name: 'New', color: '#6b7280', position: 0, is_won: false, is_lost: false },
      { name: 'Contacted', color: '#3b82f6', position: 1, is_won: false, is_lost: false },
      { name: 'Qualified', color: '#8b5cf6', position: 2, is_won: false, is_lost: false },
      { name: 'Proposal', color: '#f59e0b', position: 3, is_won: false, is_lost: false },
      { name: 'Won', color: '#10b981', position: 4, is_won: true, is_lost: false },
      { name: 'Lost', color: '#ef4444', position: 5, is_won: false, is_lost: true },
    ]

    const { data: stages, error: stagesError } = await supabase
      .from('lead_pipeline_stages')
      .insert(defaultStages.map(stage => ({
        ...stage,
        pipeline_id: data.id,
      })))
      .select('*')

    if (stagesError) {
      // Pipeline was created but stages failed - still return success with warning
      return success({
        message: 'Pipeline created, but default stages could not be added',
        pipeline: data,
        stages: [],
      })
    }

    return success({
      message: 'Pipeline created successfully',
      pipeline: {
        ...data,
        stages: stages,
      },
    })
  } catch (err) {
    return error(`Failed to create pipeline: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pipelineUpdate(params: {
  workspace_id?: string
  pipeline_id: string
  name?: string
  description?: string
  is_default?: boolean
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the pipeline belongs to this user
    const { data: existing, error: getError } = await supabase
      .from('lead_pipelines')
      .select('id')
      .eq('id', params.pipeline_id)
      .eq('user_id', member.profile_id)
      .single()

    if (getError || !existing) {
      return error('Pipeline not found')
    }

    // If setting as default, unset other defaults first
    if (params.is_default) {
      await supabase
        .from('lead_pipelines')
        .update({ is_default: false })
        .eq('user_id', member.profile_id)
    }

    const updateData: Record<string, unknown> = {}
    if (params.name !== undefined) updateData.name = params.name
    if (params.description !== undefined) updateData.description = params.description
    if (params.is_default !== undefined) updateData.is_default = params.is_default

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update', 'validation')
    }

    const { data, error: dbError } = await supabase
      .from('lead_pipelines')
      .update(updateData)
      .eq('id', params.pipeline_id)
      .select(`
        *,
        stages:lead_pipeline_stages(id, name, color, position, is_won, is_lost)
      `)
      .single()

    if (dbError) {
      return error(`Failed to update pipeline: ${dbError.message}`)
    }

    return success({
      message: 'Pipeline updated successfully',
      pipeline: data,
    })
  } catch (err) {
    return error(`Failed to update pipeline: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pipelineDelete(params: {
  workspace_id?: string
  pipeline_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the pipeline belongs to this user
    const { data: existing, error: getError } = await supabase
      .from('lead_pipelines')
      .select('id')
      .eq('id', params.pipeline_id)
      .eq('user_id', member.profile_id)
      .single()

    if (getError || !existing) {
      return error('Pipeline not found')
    }

    // Check if any leads are using this pipeline
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id')
      .eq('pipeline_id', params.pipeline_id)
      .limit(1)

    if (!leadsError && leads && leads.length > 0) {
      return error('Cannot delete pipeline that has leads. Move or delete the leads first.')
    }

    // Delete stages first (cascade should handle this, but being explicit)
    await supabase
      .from('lead_pipeline_stages')
      .delete()
      .eq('pipeline_id', params.pipeline_id)

    const { error: dbError } = await supabase
      .from('lead_pipelines')
      .delete()
      .eq('id', params.pipeline_id)

    if (dbError) {
      return error(`Failed to delete pipeline: ${dbError.message}`)
    }

    return success({
      message: 'Pipeline deleted successfully',
      pipeline_id: params.pipeline_id,
    })
  } catch (err) {
    return error(`Failed to delete pipeline: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pipelineAddStage(params: {
  workspace_id?: string
  pipeline_id: string
  name: string
  color?: string
  position?: number
  is_won?: boolean
  is_lost?: boolean
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the pipeline belongs to this user
    const { data: pipeline, error: pipelineError } = await supabase
      .from('lead_pipelines')
      .select('id')
      .eq('id', params.pipeline_id)
      .eq('user_id', member.profile_id)
      .single()

    if (pipelineError || !pipeline) {
      return error('Pipeline not found')
    }

    // Get the highest position if not specified
    let position = params.position
    if (position === undefined) {
      const { data: stages } = await supabase
        .from('lead_pipeline_stages')
        .select('position')
        .eq('pipeline_id', params.pipeline_id)
        .order('position', { ascending: false })
        .limit(1)

      position = stages && stages.length > 0 ? stages[0].position + 1 : 0
    }

    const { data, error: dbError } = await supabase
      .from('lead_pipeline_stages')
      .insert({
        pipeline_id: params.pipeline_id,
        name: params.name,
        color: params.color || '#6b7280',
        position: position,
        is_won: params.is_won || false,
        is_lost: params.is_lost || false,
      })
      .select('*')
      .single()

    if (dbError) {
      return error(`Failed to add stage: ${dbError.message}`)
    }

    return success({
      message: 'Stage added successfully',
      stage: data,
    })
  } catch (err) {
    return error(`Failed to add stage: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pipelineUpdateStage(params: {
  workspace_id?: string
  stage_id: string
  name?: string
  color?: string
  position?: number
  is_won?: boolean
  is_lost?: boolean
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the stage belongs to a pipeline owned by this user
    const { data: stage, error: stageError } = await supabase
      .from('lead_pipeline_stages')
      .select(`
        id,
        pipeline:lead_pipelines(id, user_id)
      `)
      .eq('id', params.stage_id)
      .single()

    if (stageError || !stage) {
      return error('Stage not found')
    }

    const pipeline = stage.pipeline as unknown as { id: string; user_id: string } | null
    if (pipeline?.user_id !== member.profile_id) {
      return error('Stage not found')
    }

    const updateData: Record<string, unknown> = {}
    if (params.name !== undefined) updateData.name = params.name
    if (params.color !== undefined) updateData.color = params.color
    if (params.position !== undefined) updateData.position = params.position
    if (params.is_won !== undefined) updateData.is_won = params.is_won
    if (params.is_lost !== undefined) updateData.is_lost = params.is_lost

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update', 'validation')
    }

    const { data, error: dbError } = await supabase
      .from('lead_pipeline_stages')
      .update(updateData)
      .eq('id', params.stage_id)
      .select('*')
      .single()

    if (dbError) {
      return error(`Failed to update stage: ${dbError.message}`)
    }

    return success({
      message: 'Stage updated successfully',
      stage: data,
    })
  } catch (err) {
    return error(`Failed to update stage: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pipelineDeleteStage(params: {
  workspace_id?: string
  stage_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the stage belongs to a pipeline owned by this user
    const { data: stage, error: stageError } = await supabase
      .from('lead_pipeline_stages')
      .select(`
        id,
        pipeline:lead_pipelines(id, user_id)
      `)
      .eq('id', params.stage_id)
      .single()

    if (stageError || !stage) {
      return error('Stage not found')
    }

    const pipeline = stage.pipeline as unknown as { id: string; user_id: string } | null
    if (pipeline?.user_id !== member.profile_id) {
      return error('Stage not found')
    }

    // Check if any leads are in this stage
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id')
      .eq('stage_id', params.stage_id)
      .limit(1)

    if (!leadsError && leads && leads.length > 0) {
      return error('Cannot delete stage that has leads. Move the leads to another stage first.')
    }

    const { error: dbError } = await supabase
      .from('lead_pipeline_stages')
      .delete()
      .eq('id', params.stage_id)

    if (dbError) {
      return error(`Failed to delete stage: ${dbError.message}`)
    }

    return success({
      message: 'Stage deleted successfully',
      stage_id: params.stage_id,
    })
  } catch (err) {
    return error(`Failed to delete stage: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function pipelineReorderStages(params: {
  workspace_id?: string
  pipeline_id: string
  stage_ids: string[]
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the pipeline belongs to this user
    const { data: pipeline, error: pipelineError } = await supabase
      .from('lead_pipelines')
      .select('id')
      .eq('id', params.pipeline_id)
      .eq('user_id', member.profile_id)
      .single()

    if (pipelineError || !pipeline) {
      return error('Pipeline not found')
    }

    // Update positions for each stage
    const updates = params.stage_ids.map((stageId, index) =>
      supabase
        .from('lead_pipeline_stages')
        .update({ position: index })
        .eq('id', stageId)
        .eq('pipeline_id', params.pipeline_id)
    )

    await Promise.all(updates)

    // Fetch the updated pipeline
    const { data, error: dbError } = await supabase
      .from('lead_pipelines')
      .select(`
        *,
        stages:lead_pipeline_stages(id, name, color, position, is_won, is_lost)
      `)
      .eq('id', params.pipeline_id)
      .single()

    if (dbError) {
      return error(`Failed to reorder stages: ${dbError.message}`)
    }

    // Sort stages by position
    const pipelineWithSortedStages = {
      ...data,
      stages: (data.stages || []).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
    }

    return success({
      message: 'Stages reordered successfully',
      pipeline: pipelineWithSortedStages,
    })
  } catch (err) {
    return error(`Failed to reorder stages: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
