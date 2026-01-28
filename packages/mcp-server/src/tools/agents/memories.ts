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

// Tool definitions for agent memories
export const agentMemoryTools = {
  agent_memory_list: {
    description: 'List all memories for an agent',
    inputSchema: workspaceIdSchema.extend({
      agent_id: z.string().uuid().describe('The agent ID'),
    }).merge(paginationSchema),
    handler: memoryList,
  },

  agent_memory_create: {
    description: 'Create a new memory for an agent',
    inputSchema: workspaceIdSchema.extend({
      agent_id: z.string().uuid().describe('The agent ID'),
      path: z.string().min(1).describe('Memory path/key (e.g., "user_preferences", "conversation_context")'),
      content: z.string().describe('Memory content (markdown format)'),
    }),
    handler: memoryCreate,
  },

  agent_memory_update: {
    description: 'Update an existing agent memory',
    inputSchema: workspaceIdSchema.extend({
      agent_id: z.string().uuid().describe('The agent ID'),
      memory_id: z.string().uuid().describe('The memory ID'),
      content: z.string().describe('Updated memory content'),
    }),
    handler: memoryUpdate,
  },

  agent_memory_delete: {
    description: 'Delete an agent memory',
    inputSchema: workspaceIdSchema.extend({
      agent_id: z.string().uuid().describe('The agent ID'),
      memory_id: z.string().uuid().describe('The memory ID to delete'),
    }),
    handler: memoryDelete,
  },

  agent_memory_search: {
    description: 'Search agent memories by content',
    inputSchema: workspaceIdSchema.extend({
      agent_id: z.string().uuid().describe('The agent ID'),
      query: z.string().min(1).describe('Search query'),
    }),
    handler: memorySearch,
  },
}

// Helper to verify agent access
async function verifyAgentAccess(
  supabase: ReturnType<typeof getSupabase>,
  workspaceId: string,
  agentId: string
): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from('agents')
    .select('id')
    .eq('id', agentId)
    .eq('workspace_id', workspaceId)
    .single()
  return data
}

// Handler implementations

async function memoryList(params: {
  workspace_id?: string
  agent_id: string
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

    // Verify agent belongs to workspace
    const agent = await verifyAgentAccess(supabase, workspace_id, params.agent_id)
    if (!agent) {
      return error('Agent not found', 'not_found')
    }

    let query = supabase
      .from('agent_memories')
      .select('*')
      .eq('agent_id', params.agent_id)
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false })

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
      memories: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list memories: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function memoryCreate(params: {
  workspace_id?: string
  agent_id: string
  path: string
  content: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify agent belongs to workspace
    const agent = await verifyAgentAccess(supabase, workspace_id, params.agent_id)
    if (!agent) {
      return error('Agent not found', 'not_found')
    }

    // Check if memory with this path already exists
    const { data: existing } = await supabase
      .from('agent_memories')
      .select('id')
      .eq('agent_id', params.agent_id)
      .eq('path', params.path)
      .single()

    if (existing) {
      return error(`Memory with path "${params.path}" already exists. Use update to modify it.`)
    }

    const { data, error: dbError } = await supabase
      .from('agent_memories')
      .insert({
        agent_id: params.agent_id,
        workspace_id: workspace_id,
        path: params.path,
        content: params.content,
      })
      .select()
      .single()

    if (dbError) {
      return error(`Failed to create memory: ${dbError.message}`)
    }

    return success({
      message: 'Memory created successfully',
      memory: data,
    })
  } catch (err) {
    return error(`Failed to create memory: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function memoryUpdate(params: {
  workspace_id?: string
  agent_id: string
  memory_id: string
  content: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify agent belongs to workspace
    const agent = await verifyAgentAccess(supabase, workspace_id, params.agent_id)
    if (!agent) {
      return error('Agent not found', 'not_found')
    }

    // Verify memory exists and belongs to agent
    const { data: existing } = await supabase
      .from('agent_memories')
      .select('id')
      .eq('id', params.memory_id)
      .eq('agent_id', params.agent_id)
      .single()

    if (!existing) {
      return error('Memory not found for this agent', 'not_found')
    }

    const { data, error: dbError } = await supabase
      .from('agent_memories')
      .update({ content: params.content })
      .eq('id', params.memory_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to update memory: ${dbError.message}`)
    }

    return success({
      message: 'Memory updated successfully',
      memory: data,
    })
  } catch (err) {
    return error(`Failed to update memory: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function memoryDelete(params: {
  workspace_id?: string
  agent_id: string
  memory_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify agent belongs to workspace
    const agent = await verifyAgentAccess(supabase, workspace_id, params.agent_id)
    if (!agent) {
      return error('Agent not found', 'not_found')
    }

    // Verify memory exists and belongs to agent
    const { data: existing } = await supabase
      .from('agent_memories')
      .select('id')
      .eq('id', params.memory_id)
      .eq('agent_id', params.agent_id)
      .single()

    if (!existing) {
      return error('Memory not found for this agent', 'not_found')
    }

    const { error: dbError } = await supabase
      .from('agent_memories')
      .delete()
      .eq('id', params.memory_id)

    if (dbError) {
      return error(`Failed to delete memory: ${dbError.message}`)
    }

    return success({
      message: 'Memory deleted successfully',
      memory_id: params.memory_id,
    })
  } catch (err) {
    return error(`Failed to delete memory: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function memorySearch(params: {
  workspace_id?: string
  agent_id: string
  query: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify agent belongs to workspace
    const agent = await verifyAgentAccess(supabase, workspace_id, params.agent_id)
    if (!agent) {
      return error('Agent not found', 'not_found')
    }

    // Search in path and content (case-insensitive)
    const { data, error: dbError } = await supabase
      .from('agent_memories')
      .select('*')
      .eq('agent_id', params.agent_id)
      .or(`path.ilike.%${params.query}%,content.ilike.%${params.query}%`)
      .order('updated_at', { ascending: false })

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      memories: data || [],
      count: data?.length || 0,
      query: params.query,
    })
  } catch (err) {
    return error(`Failed to search memories: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
