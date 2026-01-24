import { NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getSession } from '@dreamteam/auth/session'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { isNylasConfigured } from '@/lib/nylas'

/**
 * GET /api/nylas/grants
 *
 * List all connected email/calendar accounts for the current user.
 */
export async function GET() {
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

    const supabase = createAdminClient()

    const { data: grants, error } = await supabase
      .from('nylas_grants')
      .select('id, grant_id, provider, email, status, error_code, error_message, last_sync_at, created_at')
      .eq('workspace_id', workspaceId)
      .eq('user_id', session.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch grants:', error)
      return NextResponse.json(
        { error: 'Failed to fetch connected accounts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      grants: grants.map((g: {
        id: string
        grant_id: string
        provider: string
        email: string
        status: string
        error_code: string | null
        error_message: string | null
        last_sync_at: string | null
        created_at: string
      }) => ({
        id: g.id,
        grantId: g.grant_id,
        provider: g.provider,
        email: g.email,
        status: g.status,
        errorCode: g.error_code,
        errorMessage: g.error_message,
        lastSyncAt: g.last_sync_at,
        createdAt: g.created_at,
      })),
    })
  } catch (error) {
    console.error('List grants error:', error)
    return NextResponse.json(
      { error: 'Failed to list connected accounts' },
      { status: 500 }
    )
  }
}
