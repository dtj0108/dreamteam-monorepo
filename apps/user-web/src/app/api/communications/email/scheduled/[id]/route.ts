import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getSession } from '@dreamteam/auth/session'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const { isValid } = await validateWorkspaceAccess(workspaceId, session.id)
    if (!isValid) {
      return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { subject, body: emailBody, scheduledFor, status } = body

    const supabase = createAdminClient()

    // First, verify ownership and that the email is still pending
    const { data: existing, error: fetchError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.id)
      .eq('workspace_id', workspaceId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Scheduled email not found' }, { status: 404 })
    }

    if (existing.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot modify a scheduled email that is not pending' },
        { status: 400 }
      )
    }

    // Build update object
    const updates: Record<string, unknown> = {}

    if (subject !== undefined) {
      updates.subject = subject
    }

    if (emailBody !== undefined) {
      updates.body = emailBody
    }

    if (scheduledFor !== undefined) {
      const scheduledDate = new Date(scheduledFor)
      if (isNaN(scheduledDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid scheduled time format' },
          { status: 400 }
        )
      }
      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: 'Scheduled time must be in the future' },
          { status: 400 }
        )
      }
      updates.scheduled_for = scheduledDate.toISOString()
    }

    if (status === 'cancelled') {
      updates.status = 'cancelled'
      updates.cancelled_at = new Date().toISOString()
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('scheduled_emails')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating scheduled email:', updateError)
      return NextResponse.json({ error: 'Failed to update scheduled email' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      scheduledEmail: updated,
    })
  } catch (error) {
    console.error('Error updating scheduled email:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const { isValid } = await validateWorkspaceAccess(workspaceId, session.id)
    if (!isValid) {
      return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
    }

    const { id } = await params

    const supabase = createAdminClient()

    // First, verify ownership and that the email is still pending
    const { data: existing, error: fetchError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.id)
      .eq('workspace_id', workspaceId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Scheduled email not found' }, { status: 404 })
    }

    if (existing.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot cancel a scheduled email that is not pending' },
        { status: 400 }
      )
    }

    // Mark as cancelled instead of deleting (for audit trail)
    const { error: updateError } = await supabase
      .from('scheduled_emails')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error cancelling scheduled email:', updateError)
      return NextResponse.json({ error: 'Failed to cancel scheduled email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error cancelling scheduled email:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
