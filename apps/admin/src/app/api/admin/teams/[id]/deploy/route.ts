import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { deployTeamWithAgentResources } from '@/lib/deployment'
import { autoDeployTeamToAllPlanWorkspaces } from '@/lib/auto-deploy'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/admin/teams/[id]/deploy - Deploy team to workspaces
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const { id: teamId } = await context.params
    const body = await request.json()
    const { workspace_ids, plan_slug } = body

    // Verify team exists
    const supabase = createAdminClient()
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, is_active')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (!team.is_active) {
      return NextResponse.json({ error: 'Cannot deploy inactive team' }, { status: 400 })
    }

    let result: { success: string[]; failed: Array<{ workspaceId: string; error: string }> }

    // Deploy by plan slug (all workspaces with that plan)
    if (plan_slug) {
      const { data: plan } = await supabase
        .from('plans')
        .select('id')
        .eq('slug', plan_slug)
        .single()

      if (!plan) {
        return NextResponse.json({ error: `Plan not found: ${plan_slug}` }, { status: 404 })
      }

      const planResult = await autoDeployTeamToAllPlanWorkspaces(plan.id, user!.id)

      await logAdminAction(
        user!.id,
        'team_deployed_to_plan',
        'team',
        teamId,
        { plan_slug, successCount: planResult.successCount, failureCount: planResult.failureCount },
        request
      )

      return NextResponse.json({
        success: true,
        plan_slug,
        deployed_count: planResult.successCount,
        failed_count: planResult.failureCount,
        errors: planResult.errors,
      })
    }

    // Deploy to specific workspaces
    if (!workspace_ids || !Array.isArray(workspace_ids) || workspace_ids.length === 0) {
      return NextResponse.json(
        { error: 'Either workspace_ids array or plan_slug is required' },
        { status: 400 }
      )
    }

    const { data: workspaces, error: workspacesError } = await supabase
      .from('workspaces')
      .select('id, owner_id')
      .in('id', workspace_ids)

    if (workspacesError) {
      console.error('Failed to fetch workspace owners:', workspacesError)
    }

    const channelCreatorByWorkspaceId = new Map<string, string>()
    for (const workspace of workspaces || []) {
      const record = workspace as { id: string; owner_id: string | null }
      if (record.owner_id) {
        channelCreatorByWorkspaceId.set(record.id, record.owner_id)
      }
    }

    const deployResult = await deployTeamWithAgentResources(
      teamId,
      workspace_ids,
      user!.id,
      channelCreatorByWorkspaceId
    )

    result = {
      success: deployResult.deployments.map(d => d.workspace_id),
      failed: deployResult.failed,
    }

    await logAdminAction(
      user!.id,
      'team_deployed',
      'team',
      teamId,
      { workspace_ids: result.success, failed: result.failed },
      request
    )

    return NextResponse.json({
      success: true,
      deployed: result.success,
      failed: result.failed,
    })
  } catch (err) {
    console.error('Team deploy error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
