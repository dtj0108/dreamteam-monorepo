import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getSession } from '@dreamteam/auth/session'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { body: newBody, scheduledFor, status } = body

    const supabase = createAdminClient()

    // First, verify ownership and that the SMS is still pending
    const { data: existing, error: fetchError } = await supabase
      .from('scheduled_sms')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Scheduled SMS not found' }, { status: 404 })
    }

    if (existing.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot modify a scheduled SMS that is not pending' },
        { status: 400 }
      )
    }

    // Build update object
    const updates: Record<string, unknown> = {}

    if (newBody !== undefined) {
      updates.body = newBody
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
      .from('scheduled_sms')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating scheduled SMS:', updateError)
      return NextResponse.json({ error: 'Failed to update scheduled SMS' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      scheduledSMS: updated,
    })
  } catch (error) {
    console.error('Error updating scheduled SMS:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const supabase = createAdminClient()

    // First, verify ownership and that the SMS is still pending
    const { data: existing, error: fetchError } = await supabase
      .from('scheduled_sms')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Scheduled SMS not found' }, { status: 404 })
    }

    if (existing.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot cancel a scheduled SMS that is not pending' },
        { status: 400 }
      )
    }

    // Mark as cancelled instead of deleting (for audit trail)
    const { error: updateError } = await supabase
      .from('scheduled_sms')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error cancelling scheduled SMS:', updateError)
      return NextResponse.json({ error: 'Failed to cancel scheduled SMS' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error cancelling scheduled SMS:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
