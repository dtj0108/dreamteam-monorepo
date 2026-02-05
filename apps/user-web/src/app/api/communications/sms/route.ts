import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getSession } from '@dreamteam/auth/session'
import { formatE164, isValidE164 } from '@/lib/twilio'
import { sendSMSWithCredits } from '@/lib/sms-with-credits'
import { getCurrentWorkspaceId } from '@/lib/workspace-auth'
import { fireWebhooks } from "@/lib/make-webhooks"

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
    const { to, message, leadId, contactId, fromNumberId } = body

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      )
    }

    if (!fromNumberId) {
      return NextResponse.json(
        { error: 'A phone number is required to send SMS. Please purchase a number first.' },
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

    // Create communication record first
    const { data: comm, error: insertError } = await supabase
      .from('communications')
      .insert({
        user_id: session.id,
        lead_id: leadId || null,
        contact_id: contactId || null,
        type: 'sms',
        direction: 'outbound',
        from_number: ownedNumber.phone_number,
        to_number: formattedPhone,
        body: message,
        twilio_status: 'pending',
        triggered_by: 'manual',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating communication:', insertError)
      return NextResponse.json({
        error: `Failed to create record: ${insertError.message}`,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      }, { status: 500 })
    }

    // Send SMS via Twilio with credit check and deduction
    const result = await sendSMSWithCredits({
      workspaceId,
      to: formattedPhone,
      from: ownedNumber.phone_number,
      body: message,
    })

    // Update with Twilio response
    await supabase
      .from('communications')
      .update({
        twilio_sid: result.messageSid || null,
        twilio_status: result.success ? 'queued' : 'failed',
        error_message: result.error,
      })
      .eq('id', comm.id)

    if (!result.success) {
      const status = result.errorCode === 'INSUFFICIENT_CREDITS' ? 402 : 500
      return NextResponse.json(
        { error: result.error || 'Failed to send SMS', errorCode: result.errorCode },
        { status }
      )
    }

    // Update or create conversation thread
    await supabase
      .from('conversation_threads')
      .upsert({
        user_id: session.id,
        lead_id: leadId || null,
        contact_id: contactId || null,
        phone_number: formattedPhone,
        last_message_at: new Date().toISOString(),
        unread_count: 0,
      }, {
        onConflict: 'user_id,phone_number',
      })

    // Fire webhook for Make.com integrations
    fireWebhooks("sms.sent", {
      id: comm.id,
      twilio_sid: result.messageSid,
      from: ownedNumber.phone_number,
      to: formattedPhone,
      body: message,
      status: 'queued',
      lead_id: leadId,
      contact_id: contactId,
    }, workspaceId)

    return NextResponse.json({
      success: true,
      communicationId: comm.id,
      sid: result.messageSid,
    })
  } catch (error) {
    console.error('Error sending SMS:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
