/**
 * Workspace utilities for API routes
 */

import { cookies } from 'next/headers'
import { createAdminClient } from '@dreamteam/database/server'

/**
 * Get the current workspace ID for the authenticated user
 * Checks cookie first, then falls back to default workspace
 */
export async function getCurrentWorkspaceId(userId: string): Promise<string | null> {
  const cookieStore = await cookies()
  const cookieWorkspaceId = cookieStore.get('current_workspace_id')?.value

  if (cookieWorkspaceId) {
    return cookieWorkspaceId
  }

  // Fall back to default workspace
  const adminSupabase = createAdminClient()
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('default_workspace_id')
    .eq('id', userId)
    .single()

  return profile?.default_workspace_id || null
}

/**
 * Verify user has access to a workspace
 */
export async function verifyWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const adminSupabase = createAdminClient()
  const { data } = await adminSupabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('profile_id', userId)
    .single()

  return !!data
}
