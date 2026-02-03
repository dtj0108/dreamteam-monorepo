import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getSession } from '@dreamteam/auth/session'
import { autoDeployTeamForPlan } from '@dreamteam/database'

/**
 * POST /api/admin/deploy-team
 * Manually triggers agent deployment for a workspace.
 *
 * Use cases:
 * - Fix workspaces that missed deployment during signup
 * - Re-deploy after tier change issues
 * - Testing/debugging
 *
 * Body: { workspaceId, planSlug }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, planSlug } = body

    if (!workspaceId || !planSlug) {
      return NextResponse.json(
        { error: 'workspaceId and planSlug are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Verify user is owner/admin of the workspace
    const { data: membership, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('profile_id', session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'Not a member of this workspace' },
        { status: 403 }
      )
    }

    // Only owners and admins can trigger deployments
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only owners and admins can trigger deployments' },
        { status: 403 }
      )
    }

    // Verify the workspace exists
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('id', workspaceId)
      .single()

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    // Call auto-deploy
    console.log(`[admin/deploy-team] Deploying ${planSlug} to workspace ${workspaceId} by user ${session.id}`)
    const result = await autoDeployTeamForPlan(workspaceId, planSlug, session.id)

    if (!result.deployed) {
      console.error(`[admin/deploy-team] Deployment failed:`, result.error)
      return NextResponse.json(
        { error: result.error || 'Deployment failed' },
        { status: 400 }
      )
    }

    console.log(`[admin/deploy-team] Deployment successful: team ${result.teamId}, deployment ${result.deploymentId}`)

    return NextResponse.json({
      success: true,
      deploymentId: result.deploymentId,
      teamId: result.teamId,
      workspace: {
        id: workspace.id,
        name: workspace.name,
      },
    })
  } catch (error) {
    console.error('[admin/deploy-team] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
