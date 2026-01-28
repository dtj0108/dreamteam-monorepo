import { z } from 'zod'
import { getSupabase, validateWorkspaceAccess } from '../../auth.js'
import { resolveWorkspaceId } from '../../lib/context.js'
import {
  workspaceIdSchema,
  success,
  error,
  type ToolResult,
} from '../../types.js'

// Member role schema
const memberRoleSchema = z.enum(['owner', 'admin', 'member'])

// Member status schema
const memberStatusSchema = z.enum(['active', 'away', 'dnd'])

// Tool definitions for workspace management
export const workspaceTools = {
  workspace_get: {
    description: 'Get workspace details',
    inputSchema: workspaceIdSchema,
    handler: workspaceGet,
  },

  workspace_update: {
    description: 'Update workspace settings',
    inputSchema: workspaceIdSchema.extend({
      name: z.string().min(1).optional().describe('Workspace name'),
      avatar_url: z.string().url().optional().describe('Workspace avatar URL'),
      description: z.string().optional().describe('Workspace description'),
    }),
    handler: workspaceUpdate,
  },

  workspace_member_list: {
    description: 'List all workspace members',
    inputSchema: workspaceIdSchema.extend({
      role: memberRoleSchema.optional().describe('Filter by role'),
    }),
    handler: workspaceMemberList,
  },

  workspace_member_get: {
    description: 'Get a single member\'s details',
    inputSchema: workspaceIdSchema.extend({
      member_id: z.string().uuid().describe('The member ID'),
    }),
    handler: workspaceMemberGet,
  },

  workspace_member_invite: {
    description: 'Invite a user to the workspace by email',
    inputSchema: workspaceIdSchema.extend({
      email: z.string().email().describe('Email address to invite'),
      role: memberRoleSchema.optional().describe('Role for the new member'),
    }),
    handler: workspaceMemberInvite,
  },

  workspace_member_update_role: {
    description: 'Update a member\'s role',
    inputSchema: workspaceIdSchema.extend({
      member_id: z.string().uuid().describe('The member ID'),
      role: memberRoleSchema.describe('New role'),
    }),
    handler: workspaceMemberUpdateRole,
  },

  workspace_member_remove: {
    description: 'Remove a member from the workspace',
    inputSchema: workspaceIdSchema.extend({
      member_id: z.string().uuid().describe('The member ID to remove'),
    }),
    handler: workspaceMemberRemove,
  },

  workspace_member_set_status: {
    description: 'Set a member\'s status',
    inputSchema: workspaceIdSchema.extend({
      member_id: z.string().uuid().describe('The member ID'),
      status: memberStatusSchema.describe('New status'),
      status_text: z.string().max(100).optional().describe('Custom status text'),
    }),
    handler: workspaceMemberSetStatus,
  },
}

// Handler implementations

async function workspaceGet(params: {
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
      .from('workspaces')
      .select(`
        *,
        owner:profiles!workspaces_owner_id_fkey(id, name, avatar_url)
      `)
      .eq('id', workspace_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Workspace not found')
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    // Get member count
    const { count: memberCount } = await supabase
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace_id)

    return success({
      ...data,
      member_count: memberCount || 0,
    })
  } catch (err) {
    return error(`Failed to get workspace: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function workspaceUpdate(params: {
  workspace_id?: string
  name?: string
  avatar_url?: string
  description?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    // Check if user has admin or owner role
    if (member.role !== 'admin' && member.role !== 'owner') {
      return error('Only admins and owners can update workspace settings')
    }

    const supabase = getSupabase()

    const updateData: Record<string, unknown> = {}
    if (params.name !== undefined) updateData.name = params.name
    if (params.avatar_url !== undefined) updateData.avatar_url = params.avatar_url
    if (params.description !== undefined) updateData.description = params.description

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update', 'validation')
    }

    const { data, error: dbError } = await supabase
      .from('workspaces')
      .update(updateData)
      .eq('id', workspace_id)
      .select('*')
      .single()

    if (dbError) {
      return error(`Failed to update workspace: ${dbError.message}`)
    }

    return success({
      message: 'Workspace updated successfully',
      workspace: data,
    })
  } catch (err) {
    return error(`Failed to update workspace: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function workspaceMemberList(params: {
  workspace_id?: string
  role?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    let query = supabase
      .from('workspace_members')
      .select(`
        *,
        profile:profiles(id, name, avatar_url, email)
      `)
      .eq('workspace_id', workspace_id)
      .order('joined_at', { ascending: true })

    if (params.role) {
      query = query.eq('role', params.role)
    }

    const { data, error: dbError } = await query

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      members: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list members: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function workspaceMemberGet(params: {
  workspace_id?: string
  member_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('workspace_members')
      .select(`
        *,
        profile:profiles(id, name, avatar_url, email, phone)
      `)
      .eq('id', params.member_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Member not found')
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success(data)
  } catch (err) {
    return error(`Failed to get member: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function workspaceMemberInvite(params: {
  workspace_id?: string
  email: string
  role?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    // Check if user has admin or owner role
    if (member.role !== 'admin' && member.role !== 'owner') {
      return error('Only admins and owners can invite members')
    }

    const supabase = getSupabase()

    // Find the user by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('email', params.email)
      .single()

    if (profileError || !profile) {
      return error('User not found with this email address')
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('profile_id', profile.id)
      .single()

    if (existingMember) {
      return error('User is already a member of this workspace')
    }

    // Add the member
    const { data, error: dbError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace_id,
        profile_id: profile.id,
        role: params.role || 'member',
        status: 'active',
      })
      .select(`
        *,
        profile:profiles(id, name, avatar_url, email)
      `)
      .single()

    if (dbError) {
      return error(`Failed to invite member: ${dbError.message}`)
    }

    return success({
      message: 'Member invited successfully',
      member: data,
    })
  } catch (err) {
    return error(`Failed to invite member: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function workspaceMemberUpdateRole(params: {
  workspace_id?: string
  member_id: string
  role: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    // Check if user has admin or owner role
    if (member.role !== 'admin' && member.role !== 'owner') {
      return error('Only admins and owners can update member roles')
    }

    const supabase = getSupabase()

    // Get the target member
    const { data: targetMember, error: getError } = await supabase
      .from('workspace_members')
      .select('id, role, profile_id')
      .eq('id', params.member_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !targetMember) {
      return error('Member not found')
    }

    // Cannot change owner's role (unless you're the owner changing your own role)
    if (targetMember.role === 'owner' && targetMember.profile_id !== member.profile_id) {
      return error('Cannot change the owner\'s role')
    }

    // Only owner can promote to owner
    if (params.role === 'owner' && member.role !== 'owner') {
      return error('Only the owner can transfer ownership')
    }

    const oldRole = targetMember.role

    const { data, error: dbError } = await supabase
      .from('workspace_members')
      .update({ role: params.role })
      .eq('id', params.member_id)
      .select(`
        *,
        profile:profiles(id, name, avatar_url, email)
      `)
      .single()

    if (dbError) {
      return error(`Failed to update role: ${dbError.message}`)
    }

    return success({
      message: 'Member role updated successfully',
      old_role: oldRole,
      new_role: params.role,
      member: data,
    })
  } catch (err) {
    return error(`Failed to update role: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function workspaceMemberRemove(params: {
  workspace_id?: string
  member_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    // Check if user has admin or owner role
    if (member.role !== 'admin' && member.role !== 'owner') {
      return error('Only admins and owners can remove members')
    }

    const supabase = getSupabase()

    // Get the target member
    const { data: targetMember, error: getError } = await supabase
      .from('workspace_members')
      .select('id, role')
      .eq('id', params.member_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !targetMember) {
      return error('Member not found')
    }

    // Cannot remove the owner
    if (targetMember.role === 'owner') {
      return error('Cannot remove the workspace owner')
    }

    // Admins cannot remove other admins
    if (targetMember.role === 'admin' && member.role !== 'owner') {
      return error('Only the owner can remove admins')
    }

    const { error: dbError } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', params.member_id)

    if (dbError) {
      return error(`Failed to remove member: ${dbError.message}`)
    }

    return success({
      message: 'Member removed successfully',
      member_id: params.member_id,
    })
  } catch (err) {
    return error(`Failed to remove member: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function workspaceMemberSetStatus(params: {
  workspace_id?: string
  member_id: string
  status: string
  status_text?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the member exists
    const { data: targetMember, error: getError } = await supabase
      .from('workspace_members')
      .select('id, profile_id')
      .eq('id', params.member_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (getError || !targetMember) {
      return error('Member not found')
    }

    // Only the member themselves or admins/owners can change status
    if (targetMember.profile_id !== member.profile_id && member.role !== 'admin' && member.role !== 'owner') {
      return error('You can only change your own status')
    }

    const { data, error: dbError } = await supabase
      .from('workspace_members')
      .update({
        status: params.status,
        status_text: params.status_text || null,
      })
      .eq('id', params.member_id)
      .select(`
        *,
        profile:profiles(id, name, avatar_url)
      `)
      .single()

    if (dbError) {
      return error(`Failed to set status: ${dbError.message}`)
    }

    return success({
      message: 'Status updated successfully',
      member: data,
    })
  } catch (err) {
    return error(`Failed to set status: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
