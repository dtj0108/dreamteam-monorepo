import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getSession } from '@dreamteam/auth/session'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { deleteGrant as deleteNylasGrant, isNylasConfigured } from '@/lib/nylas'
import { decryptToken } from '@/lib/encryption'
import { logNylasEvent } from '@/lib/audit'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/nylas/grants/[id]
 *
 * Get details about a specific connected account.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

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

    const { data: grant, error } = await supabase
      .from('nylas_grants')
      .select('id, grant_id, provider, email, scopes, status, error_code, error_message, last_sync_at, created_at')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (error || !grant) {
      return NextResponse.json(
        { error: 'Connected account not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      grant: {
        id: grant.id,
        grantId: grant.grant_id,
        provider: grant.provider,
        email: grant.email,
        scopes: grant.scopes,
        status: grant.status,
        errorCode: grant.error_code,
        errorMessage: grant.error_message,
        lastSyncAt: grant.last_sync_at,
        createdAt: grant.created_at,
      },
    })
  } catch (error) {
    console.error('Get grant error:', error)
    return NextResponse.json(
      { error: 'Failed to get connected account' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/nylas/grants/[id]
 *
 * Disconnect an email/calendar account.
 * This revokes the grant at Nylas and deletes the local record.
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

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

    // Fetch the grant to get the Nylas grant ID
    const { data: grant, error: fetchError } = await supabase
      .from('nylas_grants')
      .select('id, grant_id, provider, email')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (fetchError || !grant) {
      return NextResponse.json(
        { error: 'Connected account not found' },
        { status: 404 }
      )
    }

    // Revoke the grant at Nylas (best effort - continue even if this fails)
    const revokeResult = await deleteNylasGrant(grant.grant_id)
    if (!revokeResult.success) {
      console.warn('Failed to revoke Nylas grant:', revokeResult.error)
      // Continue anyway - the user wants to disconnect
    }

    // Delete the local record (this will cascade delete sync cursors)
    const { error: deleteError } = await supabase
      .from('nylas_grants')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Failed to delete grant:', deleteError)
      return NextResponse.json(
        { error: 'Failed to disconnect account' },
        { status: 500 }
      )
    }

    // Audit log
    await logNylasEvent(
      'nylas.disconnected',
      grant.id,
      workspaceId,
      session.id,
      request,
      { provider: grant.provider, email: grant.email }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete grant error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect account' },
      { status: 500 }
    )
  }
}
