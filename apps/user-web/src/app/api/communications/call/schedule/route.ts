import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getSession } from '@dreamteam/auth/session'
import { formatE164, isValidE164 } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { to, leadId, contactId, fromNumberId, scheduledFor, notes } = body

    if (!to) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    if (!fromNumberId) {
      return NextResponse.json(
        { error: 'A phone number is required to make calls. Please purchase a number first.' },
        { status: 400 }
      )
    }

    if (!scheduledFor) {
      return NextResponse.json(
        { error: 'Scheduled time is required' },
        { status: 400 }
      )
    }

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

    const formattedPhone = formatE164(to)
    if (!isValidE164(formattedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get the user's owned phone number
    const { data: ownedNumber, error: numberError } = await supabase
      .from('twilio_numbers')
      .select('phone_number')
      .eq('id', fromNumberId)
      .eq('user_id', session.id)
      .single()

    if (numberError || !ownedNumber) {
      return NextResponse.json(
        { error: 'Phone number not found or not owned by you' },
        { status: 403 }
      )
    }

    // Create scheduled call record
    const { data: scheduled, error: insertError } = await supabase
      .from('scheduled_calls')
      .insert({
        user_id: session.id,
        lead_id: leadId || null,
        contact_id: contactId || null,
        from_number: ownedNumber.phone_number,
        to_number: formattedPhone,
        scheduled_for: scheduledDate.toISOString(),
        status: 'pending',
        notes: notes || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating scheduled call:', insertError)
      return NextResponse.json({
        error: `Failed to schedule call: ${insertError.message}`,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      scheduledCall: scheduled,
    })
  } catch (error) {
    console.error('Error scheduling call:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
