import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getAuthenticatedUserId } from './lib/context.js'

// Supabase client singleton for the MCP server
let supabaseClient: SupabaseClient | null = null

/**
 * Initialize the Supabase client with service role key
 * This should be called once when the MCP server starts
 */
export function initializeSupabase(url: string, serviceRoleKey: string): void {
  supabaseClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Get the initialized Supabase client
 * Throws if not initialized
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    throw new Error(
      'Supabase client not initialized. Call initializeSupabase() first.'
    )
  }
  return supabaseClient
}

/**
 * Validate that a profile has access to a workspace
 * Returns the workspace member record if valid
 *
 * If no profileId is passed, uses USER_ID from environment (set by agent-server).
 * This ensures proper per-user authorization when MCP server is spawned for a session.
 */
export async function validateWorkspaceAccess(
  workspaceId: string,
  profileId?: string
): Promise<{ role: string; profile_id: string } | null> {
  const supabase = getSupabase()

  // Use explicitly passed profileId, or fall back to USER_ID from environment
  const userId = profileId || getAuthenticatedUserId()

  // If we have a user ID (from param or env), validate their workspace membership
  if (userId) {
    // First, check if user is a superadmin (they have access to all workspaces)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_superadmin')
      .eq('id', userId)
      .single()

    if (profile?.is_superadmin) {
      // Superadmins have full access to all workspaces with owner-level permissions
      return { role: 'owner', profile_id: userId }
    }

    // Regular user: check workspace membership
    const { data: member, error } = await supabase
      .from('workspace_members')
      .select('role, profile_id')
      .eq('workspace_id', workspaceId)
      .eq('profile_id', userId)
      .single()

    if (error || !member) {
      return null // User doesn't have access to this workspace
    }
    return member
  }

  // No user context (standalone MCP usage without agent-server)
  // Just verify workspace exists - this is a fallback for development/testing
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .single()

  if (error || !workspace) {
    return null
  }

  // Return service-level access (only when no user context is available)
  // Use a valid nil UUID to avoid "invalid input syntax for type uuid" errors
  return { role: 'admin', profile_id: '00000000-0000-0000-0000-000000000000' }
}

/**
 * Check if a role has a specific permission level
 */
export function hasPermission(
  role: string,
  required: 'member' | 'admin' | 'owner'
): boolean {
  const hierarchy = ['member', 'admin', 'owner']
  const roleIndex = hierarchy.indexOf(role)
  const requiredIndex = hierarchy.indexOf(required)

  return roleIndex >= requiredIndex
}
