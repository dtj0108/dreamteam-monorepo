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

    return NextResponse.json({
      billing,
      invoices,
      isOwner: workspace?.owner_id === user.id,
    })
  } catch (error) {
    console.error('Get billing error:', error)
    return NextResponse.json({ error: 'Failed to get billing info' }, { status: 500 })
  }
}
