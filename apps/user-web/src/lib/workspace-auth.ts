import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@dreamteam/database/server'

export type WorkspaceRole = 'owner' | 'admin' | 'member'

export interface WorkspaceAccess {
  isValid: boolean
  role: WorkspaceRole | null
  workspaceId: string | null
}

/**
 * Validate that a user has access to a workspace
 */
export async function validateWorkspaceAccess(
  workspaceId: string,
  userId: string
): Promise<{ isValid: boolean; role: WorkspaceRole | null }> {
  const supabase = await createServerSupabaseClient()

  const { data: membership, error } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('profile_id', userId)
    .single()

  if (error || !membership) {
    return { isValid: false, role: null }
  }

  return { isValid: true, role: membership.role as WorkspaceRole }
}

/**
 * Get the current workspace ID from cookie or default
 */
export async function getCurrentWorkspaceId(userId: string): Promise<string | null> {
  const cookieStore = await cookies()
  const cookieWorkspaceId = cookieStore.get('current_workspace_id')?.value

  if (cookieWorkspaceId) {
    // Validate the user is still a member
    const { isValid } = await validateWorkspaceAccess(cookieWorkspaceId, userId)
    if (isValid) {
      return cookieWorkspaceId
    }
  }

  // Fallback to default workspace
  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('default_workspace_id')
    .eq('id', userId)
    .single()

  return profile?.default_workspace_id || null
}

/**
 * Get the current workspace with validation
 * Returns the workspace ID and role if valid, or null if not
 */
export async function getWorkspaceContext(userId: string): Promise<WorkspaceAccess> {
  const workspaceId = await getCurrentWorkspaceId(userId)

  if (!workspaceId) {
    return { isValid: false, role: null, workspaceId: null }
  }

  const { isValid, role } = await validateWorkspaceAccess(workspaceId, userId)

  return { isValid, role, workspaceId: isValid ? workspaceId : null }
}

/**
 * Require workspace access for an API route
 * Returns workspace context or throws an error response
 */
export async function requireWorkspaceAccess(userId: string): Promise<{
  workspaceId: string
  role: WorkspaceRole
}> {
  const context = await getWorkspaceContext(userId)

  if (!context.isValid || !context.workspaceId || !context.role) {
    throw new Error('No workspace access')
  }

  return {
    workspaceId: context.workspaceId,
    role: context.role,
  }
}

/**
 * Check if user has a specific role or higher in the workspace
 */
export function hasRole(userRole: WorkspaceRole, requiredRole: WorkspaceRole): boolean {
  const roleHierarchy: WorkspaceRole[] = ['member', 'admin', 'owner']
  const userRoleIndex = roleHierarchy.indexOf(userRole)
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole)

  return userRoleIndex >= requiredRoleIndex
}

/**
 * Check if user is an admin or owner
 */
export function isAdmin(role: WorkspaceRole): boolean {
  return role === 'admin' || role === 'owner'
}

/**
 * Check if user is the owner
 */
export function isOwner(role: WorkspaceRole): boolean {
  return role === 'owner'
}
