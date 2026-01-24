import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getSession } from '@dreamteam/auth/session'
import { makeCall, formatE164, isValidE164 } from '@/lib/twilio'
import { fireWebhooks } from '@/lib/make-webhooks'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { to, leadId, contactId, record = true, fromNumberId } = body

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

    // Create communication record
    const { data: comm, error: insertError } = await supabase
      .from('communications')
      .insert({
        user_id: session.id,
        lead_id: leadId || null,
        contact_id: contactId || null,
        type: 'call',
        direction: 'outbound',
        from_number: ownedNumber.phone_number,
        to_number: formattedPhone,
        twilio_status: 'pending',
        triggered_by: 'manual',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating communication:', insertError)
      return NextResponse.json({ error: 'Failed to create record' }, { status: 500 })
    }

    // Initiate call via Twilio
    const result = await makeCall({
      to: formattedPhone,
      from: ownedNumber.phone_number,
      record,
    })

    // Update with Twilio response
    await supabase
      .from('communications')
      .update({
        twilio_sid: result.sid,
        twilio_status: result.success ? result.status : 'failed',
        error_message: result.error,
      })
      .eq('id', comm.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to initiate call' },
        { status: 500 }
      )
    }

    // Fire call.started webhook
    const { data: profile } = await supabase
      .from('profiles')
      .select('default_workspace_id')
      .eq('id', session.id)
      .single()

    if (profile?.default_workspace_id) {
      fireWebhooks('call.started', {
        id: comm.id,
        twilio_sid: result.sid,
        from: ownedNumber.phone_number,
        to: formattedPhone,
        status: result.status,
        lead_id: leadId,
        contact_id: contactId,
      }, profile.default_workspace_id)
    }

    return NextResponse.json({
      success: true,
      communicationId: comm.id,
      sid: result.sid,
    })
  } catch (error) {
    console.error('Error making call:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
