import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getSession } from '@dreamteam/auth/session'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { sendEmail, isNylasConfigured, requireActiveGrant } from '@/lib/nylas'

/**
 * POST /api/nylas/emails/send
 *
 * Send an email through a connected account.
 *
 * Body:
 * - grantId: The internal grant ID (UUID)
 * - to: Array of { email, name? }
 * - cc?: Array of { email, name? }
 * - bcc?: Array of { email, name? }
 * - subject: string
 * - body: string (HTML)
 * - replyToMessageId?: string (for threading)
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
    const { grantId, to, cc, bcc, subject, body: emailBody, replyToMessageId } = body

    if (!grantId) {
      return NextResponse.json({ error: 'grantId is required' }, { status: 400 })
    }

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ error: 'At least one recipient is required' }, { status: 400 })
    }

    if (!subject) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify grant access and status
    const { grant, errorResponse } = await requireActiveGrant(supabase, grantId, workspaceId)
    if (errorResponse) return errorResponse

    // Send email via Nylas
    const result = await sendEmail(grant!.grant_id, {
      to,
      cc,
      bcc,
      subject,
      body: emailBody || '',
      replyToMessageId,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, errorCode: result.errorCode },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: result.data!.id,
    })
  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
