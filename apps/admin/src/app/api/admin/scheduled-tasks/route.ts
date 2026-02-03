import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/scheduled-tasks - List pending approval executions
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireSuperadmin()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending_approval'
    const agentId = searchParams.get('agent_id')
    const workspaceId = searchParams.get('workspace_id')
    const queryText = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const supabase = createAdminClient()

    let query = supabase
      .from('agent_schedule_executions')
      .select(`
        *,
        schedule:agent_schedules(
          id,
          name,
          task_prompt,
          cron_expression,
          timezone,
          requires_approval,
          created_by,
          workspace_id,
          workspace:workspaces(id, name, slug),
          created_by_profile:profiles!agent_schedules_created_by_fkey(id, email, name)
        ),
        agent:ai_agents(id, name, avatar_url, model, provider),
        approved_by_user:profiles!agent_schedule_executions_approved_by_fkey(id, email, name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status === 'pending_approval') {
      query = query.eq('status', 'pending_approval')
    } else if (status === 'all') {
      // No filter
    } else {
      query = query.eq('status', status)
    }

    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    if (workspaceId) {
      query = query.eq('schedule.workspace_id', workspaceId)
    }

    if (queryText && queryText.trim()) {
      const q = queryText.trim()
      query = query.or(
        `schedule.name.ilike.%${q}%,schedule.task_prompt.ilike.%${q}%,agent.name.ilike.%${q}%,error_message.ilike.%${q}%`
      )
    }

    const { data: executions, error: dbError } = await query

    if (dbError) {
      console.error('Fetch scheduled tasks error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ executions: executions || [] })
  } catch (err) {
    console.error('Scheduled tasks GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
