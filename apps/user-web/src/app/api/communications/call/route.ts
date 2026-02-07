import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getSession } from '@dreamteam/auth/session'
import { makeCall, formatE164, isValidE164 } from '@/lib/twilio'
import { reserveCallMinutes, updateReservationCallSid, cancelReservation } from '@/lib/call-with-minutes'
import { getCurrentWorkspaceId } from '@/lib/workspace-auth'
import { fireWebhooks } from '@/lib/make-webhooks'
import { triggerLeadContacted } from '@/lib/workflow-trigger-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
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
      .eq('workspace_id', workspaceId)
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
        workspace_id: workspaceId,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating communication:', insertError)
      return NextResponse.json({ error: 'Failed to create record' }, { status: 500 })
    }

    // Reserve call minutes before initiating the call
    const reservation = await reserveCallMinutes(
      workspaceId,
      comm.id, // temporary ID until we get Twilio SID
      ownedNumber.phone_number,
      formattedPhone,
      'outbound'
    )

    if (!reservation.success) {
      // Update comm record to reflect the failure
      await supabase
        .from('communications')
        .update({ twilio_status: 'failed', error_message: reservation.error })
        .eq('id', comm.id)

      return NextResponse.json(
        { error: reservation.error || 'Insufficient call minutes', errorCode: 'INSUFFICIENT_MINUTES' },
        { status: 402 }
      )
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
      // Call failed to initiate — cancel reservation and refund minutes
      await cancelReservation(comm.id)
      return NextResponse.json(
        { error: result.error || 'Failed to initiate call' },
        { status: 500 }
      )
    }

    // Call initiated — update reservation with real Twilio SID
    if (result.sid) {
      await updateReservationCallSid(comm.id, result.sid)
    }

    // Fire call.started webhook
    fireWebhooks('call.started', {
      id: comm.id,
      twilio_sid: result.sid,
      from: ownedNumber.phone_number,
      to: formattedPhone,
      status: result.status,
      lead_id: leadId,
      contact_id: contactId,
    }, workspaceId)

    // Trigger lead_contacted workflow for outbound calls (non-blocking)
    if (leadId) {
      const { data: lead } = await supabase
        .from('leads')
        .select('id, name, status, notes, user_id')
        .eq('id', leadId)
        .single()

      if (lead) {
        triggerLeadContacted(lead).catch((err) => {
          console.error("Error triggering lead_contacted workflows:", err)
        })
      }
    }

    return NextResponse.json({
      success: true,
      communicationId: comm.id,
      sid: result.sid,
    })
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8)
    console.error(`Error making call [${errorId}]:`, error)
    return NextResponse.json({
      error: 'Internal server error',
      errorId,
      details: error instanceof Error ? error.message : undefined,
    }, { status: 500 })
  }
}
