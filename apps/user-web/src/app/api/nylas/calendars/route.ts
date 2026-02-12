import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getSession } from '@dreamteam/auth/session'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { listCalendars, isNylasConfigured, requireActiveGrant } from '@/lib/nylas'

/**
 * GET /api/nylas/calendars
 *
 * List calendars for a connected account.
 *
 * Query params:
 * - grantId: The internal grant ID (UUID)
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

    const grantId = request.nextUrl.searchParams.get('grantId')
    if (!grantId) {
      return NextResponse.json(
        { error: 'grantId is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Verify grant access and status
    const { grant, errorResponse } = await requireActiveGrant(supabase, grantId, workspaceId)
    if (errorResponse) return errorResponse

    // Fetch calendars from Nylas
    const result = await listCalendars(grant!.grant_id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, errorCode: result.errorCode },
        { status: 500 }
      )
    }

    return NextResponse.json({ calendars: result.data })
  } catch (error) {
    console.error('List calendars error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendars' },
      { status: 500 }
    )
  }
}
