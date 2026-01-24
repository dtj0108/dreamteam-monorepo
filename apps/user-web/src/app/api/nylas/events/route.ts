import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getSession } from '@dreamteam/auth/session'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { listEvents, createEvent, isNylasConfigured } from '@/lib/nylas'

/**
 * GET /api/nylas/events
 *
 * List events from a calendar.
 *
 * Query params:
 * - grantId: The internal grant ID (UUID)
 * - calendarId: The calendar ID to fetch events from
 * - startTime: Unix timestamp for start of range (optional)
 * - endTime: Unix timestamp for end of range (optional)
 * - limit: Max events to return (default 25, max 50)
 * - pageToken: Cursor for pagination
 */
export async function GET(request: NextRequest) {
  try {
    if (!isNylasConfigured()) {
      return NextResponse.json(
        { error: 'Nylas is not configured' },
        { status: 503 }
      )
    }

    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const { isValid } = await validateWorkspaceAccess(workspaceId, session.id)
    if (!isValid) {
      return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const grantId = searchParams.get('grantId')
    const calendarId = searchParams.get('calendarId')
    const startTimeParam = searchParams.get('startTime')
    const endTimeParam = searchParams.get('endTime')
    const limitParam = searchParams.get('limit')
    const pageToken = searchParams.get('pageToken') || undefined

    if (!grantId) {
      return NextResponse.json(
        { error: 'grantId is required' },
        { status: 400 }
      )
    }

    if (!calendarId) {
      return NextResponse.json(
        { error: 'calendarId is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Verify grant access
    const { data: grant, error: grantError } = await supabase
      .from('nylas_grants')
      .select('grant_id')
      .eq('id', grantId)
      .eq('workspace_id', workspaceId)
      .single()

    if (grantError || !grant) {
      return NextResponse.json(
        { error: 'Connected account not found' },
        { status: 404 }
      )
    }

    // Parse options
    const limit = Math.min(parseInt(limitParam || '25', 10), 50)
    const startTime = startTimeParam ? parseInt(startTimeParam, 10) : undefined
    const endTime = endTimeParam ? parseInt(endTimeParam, 10) : undefined

    // Fetch events from Nylas
    const result = await listEvents(grant.grant_id, calendarId, {
      startTime,
      endTime,
      limit,
      pageToken,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, errorCode: result.errorCode },
        { status: 500 }
      )
    }

    return NextResponse.json({
      events: result.data!.events,
      nextCursor: result.data!.nextCursor,
    })
  } catch (error) {
    console.error('List events error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/nylas/events
 *
 * Create a new calendar event.
 *
 * Body:
 * - grantId: The internal grant ID (UUID)
 * - calendarId: The calendar ID to create the event in
 * - title: Event title
 * - description?: Event description
 * - location?: Event location
 * - when: { startTime, endTime, startTimezone?, endTimezone? }
 * - participants?: Array of { email, name? }
 * - busy?: Whether the event shows as busy (default true)
 */
export async function POST(request: NextRequest) {
  try {
    if (!isNylasConfigured()) {
      return NextResponse.json(
        { error: 'Nylas is not configured' },
        { status: 503 }
      )
    }

    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const { isValid } = await validateWorkspaceAccess(workspaceId, session.id)
    if (!isValid) {
      return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
    }

    const body = await request.json()
    const { grantId, calendarId, title, description, location, when, participants, busy } = body

    if (!grantId) {
      return NextResponse.json(
        { error: 'grantId is required' },
        { status: 400 }
      )
    }

    if (!calendarId) {
      return NextResponse.json(
        { error: 'calendarId is required' },
        { status: 400 }
      )
    }

    if (!title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      )
    }

    if (!when?.startTime || !when?.endTime) {
      return NextResponse.json(
        { error: 'when.startTime and when.endTime are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Verify grant access
    const { data: grant, error: grantError } = await supabase
      .from('nylas_grants')
      .select('grant_id')
      .eq('id', grantId)
      .eq('workspace_id', workspaceId)
      .single()

    if (grantError || !grant) {
      return NextResponse.json(
        { error: 'Connected account not found' },
        { status: 404 }
      )
    }

    // Create event at Nylas
    const result = await createEvent(grant.grant_id, calendarId, {
      title,
      description,
      location,
      when: {
        startTime: when.startTime,
        endTime: when.endTime,
        startTimezone: when.startTimezone,
        endTimezone: when.endTimezone,
      },
      participants,
      busy,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, errorCode: result.errorCode },
        { status: 500 }
      )
    }

    return NextResponse.json({ event: result.data }, { status: 201 })
  } catch (error) {
    console.error('Create event error:', error)
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    )
  }
}
