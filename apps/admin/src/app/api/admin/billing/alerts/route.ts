import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/billing/alerts
 * Get billing alerts with pagination and filters
 */
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const supabase = createAdminClient()
  const searchParams = request.nextUrl.searchParams

  // Pagination
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  // Filters
  const status = searchParams.get('status')
  const alertType = searchParams.get('alert_type')
  const severity = searchParams.get('severity')
  const workspaceId = searchParams.get('workspace_id')

  try {
    let query = supabase
      .from('billing_alerts')
      .select(
        `
        *,
        workspace:workspaces(id, name),
        billing_event:billing_events(id, event_type, event_data),
        acknowledged_by_user:profiles!billing_alerts_acknowledged_by_fkey(id, email, name),
        resolved_by_user:profiles!billing_alerts_resolved_by_fkey(id, email, name)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      if (status === 'open') {
        query = query.in('status', ['new', 'acknowledged'])
      } else {
        query = query.eq('status', status)
      }
    }
    if (alertType) {
      query = query.eq('alert_type', alertType)
    }
    if (severity) {
      query = query.eq('severity', severity)
    }
    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }

    const { data: alerts, count, error: dbError } = await query

    if (dbError) {
      console.error('[billing/alerts] Database error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Get counts by status for summary
    const { data: statusCounts } = await supabase
      .from('billing_alerts')
      .select('status')

    const summary = {
      new: 0,
      acknowledged: 0,
      resolved: 0,
      dismissed: 0,
    }
    for (const alert of statusCounts || []) {
      summary[alert.status as keyof typeof summary]++
    }

    return NextResponse.json({
      alerts: alerts || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      summary,
    })
  } catch (err) {
    console.error('[billing/alerts] Error fetching alerts:', err)
    return NextResponse.json(
      { error: 'Failed to fetch billing alerts' },
      { status: 500 }
    )
  }
}
