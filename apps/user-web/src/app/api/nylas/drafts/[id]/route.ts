import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getSession } from '@dreamteam/auth/session'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { getDraft, updateDraft, deleteDraft, sendDraft, isNylasConfigured } from '@/lib/nylas'

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/nylas/drafts/[id]
 *
 * Get a specific draft by ID.
 *
 * Query params:
 * - grantId: The internal grant ID (UUID)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
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

    const { id: draftId } = await context.params
    const searchParams = request.nextUrl.searchParams
    const grantId = searchParams.get('grantId')

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

    // Fetch draft from Nylas
    const result = await getDraft(grant.grant_id, draftId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, errorCode: result.errorCode },
        { status: 500 }
      )
    }

    return NextResponse.json({
      draft: result.data,
    })
  } catch (error) {
    console.error('Get draft error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch draft' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/nylas/drafts/[id]
 *
 * Update an existing draft.
 *
 * Body:
 * - grantId: The internal grant ID (UUID)
 * - to: Array of recipients (optional)
 * - cc: Array of CC recipients (optional)
 * - bcc: Array of BCC recipients (optional)
 * - subject: Email subject (optional)
 * - body: Email body HTML (optional)
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
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

    const { id: draftId } = await context.params
    const body = await request.json()
    const { grantId, to, cc, bcc, subject, body: emailBody } = body

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

    // Update draft in Nylas
    const result = await updateDraft(grant.grant_id, draftId, {
      to,
      cc,
      bcc,
      subject,
      body: emailBody,
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
    console.error('Update draft error:', error)
    return NextResponse.json(
      { error: 'Failed to update draft' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/nylas/drafts/[id]
 *
 * Delete a draft.
 *
 * Query params:
 * - grantId: The internal grant ID (UUID)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
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

    const { id: draftId } = await context.params
    const searchParams = request.nextUrl.searchParams
    const grantId = searchParams.get('grantId')

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

    // Delete draft in Nylas
    const result = await deleteDraft(grant.grant_id, draftId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, errorCode: result.errorCode },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete draft error:', error)
    return NextResponse.json(
      { error: 'Failed to delete draft' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/nylas/drafts/[id]
 *
 * Send a draft.
 *
 * Body:
 * - grantId: The internal grant ID (UUID)
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
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

    const { id: draftId } = await context.params
    const body = await request.json()
    const { grantId } = body

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

    // Send draft via Nylas
    const result = await sendDraft(grant.grant_id, draftId)

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
    console.error('Send draft error:', error)
    return NextResponse.json(
      { error: 'Failed to send draft' },
      { status: 500 }
    )
  }
}
