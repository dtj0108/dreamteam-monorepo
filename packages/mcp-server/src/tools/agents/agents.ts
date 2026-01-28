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

// Tool definitions for agents
export const agentTools = {
  agent_list: {
    description: 'List all agents in a workspace',
    inputSchema: workspaceIdSchema.merge(paginationSchema).extend({
      is_active: z.boolean().optional().describe('Filter by active status'),
    }),
    handler: agentList,
  },

  agent_get: {
    description: 'Get a single agent with details',
    inputSchema: workspaceIdSchema.extend({
      agent_id: z.string().uuid().describe('The agent ID'),
    }),
    handler: agentGet,
  },

  agent_create: {
    description: 'Create a new agent',
    inputSchema: workspaceIdSchema.extend({
      name: z.string().min(1).describe('Agent name'),
      description: z.string().optional().describe('Agent description'),
      system_prompt: z.string().optional().describe('System prompt for the agent'),
      model: z.string().optional().describe('Model to use (default: claude-3-sonnet)'),
      tools: z.array(z.string()).optional().describe('List of tool names the agent can use'),
      skill_ids: z.array(z.string().uuid()).optional().describe('Skill IDs to assign to agent'),
    }),
    handler: agentCreate,
  },

  agent_update: {
    description: 'Update an agent',
    inputSchema: workspaceIdSchema.extend({
      agent_id: z.string().uuid().describe('The agent ID'),
      name: z.string().min(1).optional().describe('Agent name'),
      description: z.string().optional().describe('Agent description'),
      system_prompt: z.string().optional().describe('System prompt'),
      model: z.string().optional().describe('Model to use'),
      tools: z.array(z.string()).optional().describe('List of tool names'),
      is_active: z.boolean().optional().describe('Active status'),
    }),
    handler: agentUpdate,
  },

  agent_delete: {
    description: 'Delete an agent',
    inputSchema: workspaceIdSchema.extend({
      agent_id: z.string().uuid().describe('The agent ID to delete'),
    }),
    handler: agentDelete,
  },

  agent_add_skill: {
    description: 'Add a skill to an agent',
    inputSchema: workspaceIdSchema.extend({
      agent_id: z.string().uuid().describe('The agent ID'),
      skill_id: z.string().uuid().describe('The skill ID to add'),
    }),
    handler: agentAddSkill,
  },

  agent_remove_skill: {
    description: 'Remove a skill from an agent',
    inputSchema: workspaceIdSchema.extend({
      agent_id: z.string().uuid().describe('The agent ID'),
      skill_id: z.string().uuid().describe('The skill ID to remove'),
    }),
    handler: agentRemoveSkill,
  },

  agent_get_skills: {
    description: 'Get all skills assigned to an agent',
    inputSchema: workspaceIdSchema.extend({
      agent_id: z.string().uuid().describe('The agent ID'),
    }),
    handler: agentGetSkills,
  },
}

// Handler implementations

async function agentList(params: {
  workspace_id?: string
  is_active?: boolean
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
      .from('agents')
      .select('*')
      .eq('workspace_id', workspace_id)
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
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      agents: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list agents: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function agentGet(params: {
  workspace_id?: string
  agent_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    const { data, error: dbError } = await supabase
      .from('agents')
      .select(`
        *
      `)
      .eq('id', params.agent_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Agent not found', 'not_found')
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    // Flatten skills
    const agent = {
      ...data,
      skills: data.skills?.map((s: { skill: unknown }) => s.skill).filter(Boolean) || [],
    }

    return success(agent)
  } catch (err) {
    return error(`Failed to get agent: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function agentCreate(params: {
  workspace_id?: string
  name: string
  description?: string
  system_prompt?: string
  model?: string
  tools?: string[]
  skill_ids?: string[]
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Create the agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert({
        workspace_id: workspace_id,
        name: params.name,
        description: params.description || null,
        system_prompt: params.system_prompt || 'You are a helpful AI assistant.',
        model: params.model || 'claude-3-sonnet',
        tools: params.tools || [],
        is_active: true,
        created_by: member.profile_id === '00000000-0000-0000-0000-000000000000' ? null : member.profile_id,
      })
      .select()
      .single()

    if (agentError) {
      return error(`Failed to create agent: ${agentError.message}`)
    }

    // Assign skills if provided
    if (params.skill_ids && params.skill_ids.length > 0) {
      const skillAssignments = params.skill_ids.map(skill_id => ({
        agent_id: agent.id,
        skill_id,
      }))

      await supabase
        .from('agent_skill_assignments')
        .insert(skillAssignments)
    }

    return success({
      message: 'Agent created successfully',
      agent,
    })
  } catch (err) {
    return error(`Failed to create agent: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function agentUpdate(params: {
  workspace_id?: string
  agent_id: string
  name?: string
  description?: string
  system_prompt?: string
  model?: string
  tools?: string[]
  is_active?: boolean
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify agent belongs to workspace
    const { data: existing, error: getError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', params.agent_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Agent not found', 'not_found')
    }

    const updateData: Record<string, unknown> = {}
    if (params.name !== undefined) updateData.name = params.name
    if (params.description !== undefined) updateData.description = params.description
    if (params.system_prompt !== undefined) updateData.system_prompt = params.system_prompt
    if (params.model !== undefined) updateData.model = params.model
    if (params.tools !== undefined) updateData.tools = params.tools
    if (params.is_active !== undefined) updateData.is_active = params.is_active

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update', 'validation')
    }

    const { data, error: dbError } = await supabase
      .from('agents')
      .update(updateData)
      .eq('id', params.agent_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to update agent: ${dbError.message}`)
    }

    return success({
      message: 'Agent updated successfully',
      agent: data,
    })
  } catch (err) {
    return error(`Failed to update agent: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function agentDelete(params: {
  workspace_id?: string
  agent_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify agent belongs to workspace
    const { data: existing, error: getError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', params.agent_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !existing) {
      return error('Agent not found', 'not_found')
    }

    const { error: dbError } = await supabase
      .from('agents')
      .delete()
      .eq('id', params.agent_id)

    if (dbError) {
      return error(`Failed to delete agent: ${dbError.message}`)
    }

    return success({
      message: 'Agent deleted successfully',
      agent_id: params.agent_id,
    })
  } catch (err) {
    return error(`Failed to delete agent: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function agentAddSkill(params: {
  workspace_id?: string
  agent_id: string
  skill_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify agent belongs to workspace
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('id', params.agent_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (!agent) {
      return error('Agent not found', 'not_found')
    }

    // Verify skill belongs to workspace or is system skill
    const { data: skill } = await supabase
      .from('agent_skills')
      .select('id')
      .eq('id', params.skill_id)
      .or(`workspace_id.eq.${workspace_id},is_system.eq.true`)
      .single()

    if (!skill) {
      return error('Skill not found', 'not_found')
    }

    // Check if already assigned
    const { data: existing } = await supabase
      .from('agent_skill_assignments')
      .select('agent_id')
      .eq('agent_id', params.agent_id)
      .eq('skill_id', params.skill_id)
      .single()

    if (existing) {
      return error('Skill is already assigned to this agent', 'validation')
    }

    const { error: dbError } = await supabase
      .from('agent_skill_assignments')
      .insert({
        agent_id: params.agent_id,
        skill_id: params.skill_id,
      })

    if (dbError) {
      return error(`Failed to add skill: ${dbError.message}`)
    }

    return success({
      message: 'Skill added to agent successfully',
      agent_id: params.agent_id,
      skill_id: params.skill_id,
    })
  } catch (err) {
    return error(`Failed to add skill: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function agentRemoveSkill(params: {
  workspace_id?: string
  agent_id: string
  skill_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify agent belongs to workspace
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('id', params.agent_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (!agent) {
      return error('Agent not found', 'not_found')
    }

    const { error: dbError } = await supabase
      .from('agent_skill_assignments')
      .delete()
      .eq('agent_id', params.agent_id)
      .eq('skill_id', params.skill_id)

    if (dbError) {
      return error(`Failed to remove skill: ${dbError.message}`)
    }

    return success({
      message: 'Skill removed from agent successfully',
      agent_id: params.agent_id,
      skill_id: params.skill_id,
    })
  } catch (err) {
    return error(`Failed to remove skill: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function agentGetSkills(params: {
  workspace_id?: string
  agent_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify agent belongs to workspace
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('id', params.agent_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (!agent) {
      return error('Agent not found', 'not_found')
    }

    const { data, error: dbError } = await supabase
      .from('agent_skill_assignments')
      .select(`
        skill:agent_skills(*)
      `)
      .eq('agent_id', params.agent_id)

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    const skills = data?.map(d => d.skill).filter(Boolean) || []

    return success({
      skills,
      count: skills.length,
    })
  } catch (err) {
    return error(`Failed to get agent skills: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
