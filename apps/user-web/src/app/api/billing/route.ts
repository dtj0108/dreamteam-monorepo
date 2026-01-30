import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@dreamteam/database/server'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { getWorkspaceBilling, getWorkspaceInvoices } from '@/lib/billing-queries'

/**
 * GET /api/billing
 * Get billing status and invoices for the current workspace
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(user.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const { isValid } = await validateWorkspaceAccess(workspaceId, user.id)
    if (!isValid) {
      return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
    }

    // Get billing data
    const billing = await getWorkspaceBilling(workspaceId)
    const invoices = await getWorkspaceInvoices(workspaceId)

    // Check if current user is workspace owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single()

    const isOwner = workspace?.owner_id === user.id

    // Check can_manage_billing permission for non-owners
    let canManageBilling = isOwner // Owners always have billing permission

    if (!isOwner) {
      // Get current user's membership and check for billing permission
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('id, role')
        .eq('workspace_id', workspaceId)
        .eq('profile_id', user.id)
        .single()

      if (membership) {
        // Check for user-specific override first
        const { data: override } = await supabase
          .from('member_permission_overrides')
          .select('is_enabled')
          .eq('member_id', membership.id)
          .eq('permission_key', 'can_manage_billing')
          .single()

        if (override) {
          canManageBilling = override.is_enabled
        } else {
          // Fall back to role default
          const { data: rolePermission } = await supabase
            .from('workspace_permissions')
            .select('is_enabled')
            .eq('workspace_id', workspaceId)
            .eq('role', membership.role)
            .eq('permission_key', 'can_manage_billing')
            .single()

          canManageBilling = rolePermission?.is_enabled ?? false
        }
      }
    }

    return NextResponse.json({
      billing,
      invoices,
      isOwner,
      canManageBilling,
    })
  } catch (error) {
    console.error('Get billing error:', error)
    return NextResponse.json({ error: 'Failed to get billing info' }, { status: 500 })
  }
}
