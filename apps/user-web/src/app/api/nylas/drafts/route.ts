import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getSession } from '@dreamteam/auth/session'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { listDrafts, createDraft, isNylasConfigured } from '@/lib/nylas'

/**
 * GET /api/nylas/drafts
 *
 * List drafts from a connected account.
 *
 * Query params:
 * - grantId: The internal grant ID (UUID)
 * - limit: Max drafts to return (default 25, max 50)
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
    const limitParam = searchParams.get('limit')

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

    // Fetch drafts from Nylas
    const result = await listDrafts(grant.grant_id, { limit })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, errorCode: result.errorCode },
        { status: 500 }
      )
    }

    return NextResponse.json({
      drafts: result.data!.drafts,
    })
  } catch (error) {
    console.error('List drafts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch drafts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/nylas/drafts
 *
 * Create a new draft.
 *
 * Body:
 * - grantId: The internal grant ID (UUID)
 * - to: Array of recipients
 * - cc: Array of CC recipients (optional)
 * - bcc: Array of BCC recipients (optional)
 * - subject: Email subject (optional)
 * - body: Email body HTML (optional)
 * - replyToMessageId: Message ID to reply to (optional)
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
      return NextResponse.json(
        { error: 'grantId is required' },
        { status: 400 }
      )
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

    // Create draft in Nylas
    const result = await createDraft(grant.grant_id, {
      to,
      cc,
      bcc,
      subject,
      body: emailBody,
      replyToMessageId,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, errorCode: result.errorCode },
        { status: 500 }
      )
    }

    return NextResponse.json({
      id: result.data!.id,
    })
  } catch (error) {
    console.error('Create draft error:', error)
    return NextResponse.json(
      { error: 'Failed to create draft' },
      { status: 500 }
    )
  }
}
