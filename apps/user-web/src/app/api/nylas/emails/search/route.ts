import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getSession } from '@dreamteam/auth/session'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { searchEmails, isNylasConfigured } from '@/lib/nylas'

/**
 * GET /api/nylas/emails/search
 *
 * Search emails in a connected account.
 *
 * Query params:
 * - grantId: The internal grant ID (UUID)
 * - q: Search query string
 * - limit: Max emails to return (default 25, max 50)
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
    const query = searchParams.get('q')
    const limitParam = searchParams.get('limit')

    if (!grantId) {
      return NextResponse.json({ error: 'grantId is required' }, { status: 400 })
    }

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch the grant to verify access and get the Nylas grant ID
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

    const limit = Math.min(parseInt(limitParam || '25', 10), 50)

    // Search emails via Nylas
    const result = await searchEmails(grant.grant_id, query, { limit })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, errorCode: result.errorCode },
        { status: 500 }
      )
    }

    return NextResponse.json({
      emails: result.data!.emails,
    })
  } catch (error) {
    console.error('Search emails error:', error)
    return NextResponse.json(
      { error: 'Failed to search emails' },
      { status: 500 }
    )
  }
}
