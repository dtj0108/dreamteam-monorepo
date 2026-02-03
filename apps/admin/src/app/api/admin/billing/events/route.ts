import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/billing/events
 * Get billing events with pagination and filters
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
  const eventType = searchParams.get('event_type')
  const eventCategory = searchParams.get('event_category')
  const workspaceId = searchParams.get('workspace_id')
  const source = searchParams.get('source')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const minAmount = searchParams.get('min_amount')
  const maxAmount = searchParams.get('max_amount')
  const search = searchParams.get('search')

  try {
    // Build query
    let query = supabase
      .from('billing_events')
      .select(
        `
        *,
        workspace:workspaces(id, name, owner_id),
        user:profiles!billing_events_user_id_fkey(id, email, name)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (eventType) {
      query = query.eq('event_type', eventType)
    }
    if (eventCategory) {
      query = query.eq('event_category', eventCategory)
    }
    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }
    if (source) {
      query = query.eq('source', source)
    }
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }
    if (minAmount) {
      query = query.gte('amount_cents', parseInt(minAmount))
    }
    if (maxAmount) {
      query = query.lte('amount_cents', parseInt(maxAmount))
    }

    const { data: events, count, error: dbError } = await query

    if (dbError) {
      console.error('[billing/events] Database error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // If search is provided, filter results by workspace name (post-query for simplicity)
    let filteredEvents = events || []
    if (search) {
      const searchLower = search.toLowerCase()
      filteredEvents = filteredEvents.filter(event => {
        const workspace = event.workspace as { name?: string } | null
        return workspace?.name?.toLowerCase().includes(searchLower)
      })
    }

    return NextResponse.json({
      events: filteredEvents,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (err) {
    console.error('[billing/events] Error fetching events:', err)
    return NextResponse.json(
      { error: 'Failed to fetch billing events' },
      { status: 500 }
    )
  }
}
