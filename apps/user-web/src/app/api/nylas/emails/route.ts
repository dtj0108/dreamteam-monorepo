import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getSession } from '@dreamteam/auth/session'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { listEmails, isNylasConfigured } from '@/lib/nylas'
import { decryptToken } from '@/lib/encryption'

/**
 * GET /api/nylas/emails
 *
 * List emails from a connected account.
 *
 * Query params:
 * - grantId: The internal grant ID (UUID)
 * - folder: Filter by folder (inbox, sent, etc.)
 * - unread: Filter by unread status (true/false)
 * - limit: Max emails to return (default 25, max 50)
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
    const folder = searchParams.get('folder') || undefined
    const unreadParam = searchParams.get('unread')
    const limitParam = searchParams.get('limit')
    const pageToken = searchParams.get('pageToken') || undefined

    if (!grantId) {
      return NextResponse.json(
        { error: 'grantId is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Fetch the grant to verify access and get the Nylas grant ID
    const { data: grant, error: grantError } = await supabase
      .from('nylas_grants')
      .select('grant_id, encrypted_access_token')
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
    const unread = unreadParam === 'true' ? true : unreadParam === 'false' ? false : undefined

    // Fetch emails from Nylas
    const result = await listEmails(grant.grant_id, {
      limit,
      pageToken,
      unread,
      in: folder,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, errorCode: result.errorCode },
        { status: 500 }
      )
    }

    return NextResponse.json({
      emails: result.data!.emails,
      nextCursor: result.data!.nextCursor,
    })
  } catch (error) {
    console.error('List emails error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    )
  }
}
