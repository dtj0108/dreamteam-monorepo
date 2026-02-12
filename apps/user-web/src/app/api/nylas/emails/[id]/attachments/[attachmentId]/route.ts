import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getSession } from '@dreamteam/auth/session'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { downloadAttachment, isNylasConfigured, requireActiveGrant } from '@/lib/nylas'

interface RouteContext {
  params: Promise<{ id: string; attachmentId: string }>
}

/**
 * GET /api/nylas/emails/[id]/attachments/[attachmentId]
 *
 * Download an attachment from an email.
 *
 * Query params:
 * - grantId: The internal grant ID (UUID)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: messageId, attachmentId } = await context.params

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

    // Download attachment from Nylas
    const result = await downloadAttachment(grant!.grant_id, messageId, attachmentId)

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error, errorCode: result.errorCode },
        { status: 500 }
      )
    }

    // Return the attachment as a file download
    const headers = new Headers()
    headers.set('Content-Type', result.data.contentType)
    headers.set('Content-Length', result.data.data.length.toString())

    if (result.data.filename) {
      headers.set('Content-Disposition', `attachment; filename="${result.data.filename}"`)
    }

    // Convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(result.data.data), {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('Download attachment error:', error)
    return NextResponse.json(
      { error: 'Failed to download attachment' },
      { status: 500 }
    )
  }
}
