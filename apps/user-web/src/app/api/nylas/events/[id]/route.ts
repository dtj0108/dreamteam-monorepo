import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getSession } from '@dreamteam/auth/session'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { getEvent, updateEvent, deleteEvent, isNylasConfigured } from '@/lib/nylas'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/nylas/events/[id]
 *
 * Get a specific calendar event.
 *
 * Query params:
 * - grantId: The internal grant ID (UUID)
 * - calendarId: The calendar ID
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: eventId } = await context.params

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

    // Fetch event from Nylas
    const result = await getEvent(grant.grant_id, calendarId, eventId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, errorCode: result.errorCode },
        { status: 500 }
      )
    }

    return NextResponse.json({ event: result.data })
  } catch (error) {
    console.error('Get event error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/nylas/events/[id]
 *
 * Update a calendar event.
 *
 * Body:
 * - grantId: The internal grant ID (UUID)
 * - calendarId: The calendar ID
 * - title?: New title
 * - description?: New description
 * - location?: New location
 * - when?: { startTime, endTime, startTimezone?, endTimezone? }
 * - participants?: Array of { email, name? }
 * - busy?: Whether the event shows as busy
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: eventId } = await context.params

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

    // Build updates object
    const updates: {
      title?: string
      description?: string
      location?: string
      when?: { startTime: number; endTime: number; startTimezone?: string; endTimezone?: string }
      participants?: Array<{ email: string; name?: string }>
      busy?: boolean
    } = {}

    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (location !== undefined) updates.location = location
    if (when) updates.when = when
    if (participants !== undefined) updates.participants = participants
    if (busy !== undefined) updates.busy = busy

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      )
    }

    // Update event at Nylas
    const result = await updateEvent(grant.grant_id, calendarId, eventId, updates)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, errorCode: result.errorCode },
        { status: 500 }
      )
    }

    return NextResponse.json({ event: result.data })
  } catch (error) {
    console.error('Update event error:', error)
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/nylas/events/[id]
 *
 * Delete a calendar event.
 *
 * Query params:
 * - grantId: The internal grant ID (UUID)
 * - calendarId: The calendar ID
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: eventId } = await context.params

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

    // Delete event at Nylas
    const result = await deleteEvent(grant.grant_id, calendarId, eventId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, errorCode: result.errorCode },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete event error:', error)
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    )
  }
}
