import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getSession } from '@dreamteam/auth/session'
import { formatE164, isValidE164 } from '@/lib/twilio'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('scheduled_calls')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Scheduled call not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching scheduled call:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { scheduledFor, notes, to } = body

    const supabase = createAdminClient()

    // Get existing record
    const { data: existing, error: fetchError } = await supabase
      .from('scheduled_calls')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Scheduled call not found' }, { status: 404 })
    }

    // Can only update pending or reminded calls
    if (!['pending', 'reminded'].includes(existing.status)) {
      return NextResponse.json(
        { error: 'Cannot update a call that is no longer pending' },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = {}

    if (scheduledFor) {
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
      updates.status = 'pending' // Reset status if time changed
      updates.reminder_sent_at = null
    }

    if (notes !== undefined) {
      updates.notes = notes
    }

    if (to) {
      const formattedPhone = formatE164(to)
      if (!isValidE164(formattedPhone)) {
        return NextResponse.json(
          { error: 'Invalid phone number format' },
          { status: 400 }
        )
      }
      updates.to_number = formattedPhone
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('scheduled_calls')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating scheduled call:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating scheduled call:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    // Cancel the scheduled call
    const { data, error } = await supabase
      .from('scheduled_calls')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', session.id)
      .in('status', ['pending', 'reminded'])
      .select()
      .single()

    if (error) {
      console.error('Error cancelling scheduled call:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Scheduled call not found or already completed/cancelled' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, cancelled: data })
  } catch (error) {
    console.error('Error cancelling scheduled call:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
