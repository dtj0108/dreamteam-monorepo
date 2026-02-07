import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperadmin } from '@/lib/admin-auth'

// GET /api/admin/workspaces - List all workspaces
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const supabase = createAdminClient()
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const search = searchParams.get('search') || ''

  let query = supabase
    .from('workspaces')
    .select(
      `
      *,
      owner:profiles!workspaces_owner_id_fkey(id, email, name),
      workspace_members(count)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (search) {
    query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
  }

  const { data: workspaces, count, error: dbError } = await query

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  const workspaceIds = (workspaces || []).map((workspace: { id: string }) => workspace.id)
  const agentCountByWorkspace = new Map<string, number>()

  if (workspaceIds.length > 0) {
    const { data: agentProfiles, error: agentProfilesError } = await supabase
      .from('profiles')
      .select('agent_workspace_id')
      .eq('is_agent', true)
      .in('agent_workspace_id', workspaceIds)

    if (agentProfilesError) {
      console.error('Agent profile count query error:', agentProfilesError)
    } else {
      for (const profile of agentProfiles || []) {
        const workspaceId = profile.agent_workspace_id as string | null
        if (!workspaceId) continue
        const current = agentCountByWorkspace.get(workspaceId) || 0
        agentCountByWorkspace.set(workspaceId, current + 1)
      }
    }
  }

  const enrichedWorkspaces = (workspaces || []).map((workspace: {
    id: string
    workspace_members?: { count: number }[]
  }) => {
    const totalMembershipCount = workspace.workspace_members?.[0]?.count || 0
    const agentCount = agentCountByWorkspace.get(workspace.id) || 0
    const memberCount = Math.max(totalMembershipCount - agentCount, 0)

    return {
      ...workspace,
      member_count: memberCount,
      agent_count: agentCount,
    }
  })

  return NextResponse.json({
    workspaces: enrichedWorkspaces,
    pagination: { page, limit, total: count },
  })
}
