import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { validateTwilioWebhook } from '@/lib/twilio'
import { handleCallStatusUpdate } from '@/lib/call-with-minutes'
import { fireWebhooks } from "@/lib/make-webhooks"
import { triggerCallCompleted, triggerCallMissed, type Call, type Lead, type Contact } from '@/lib/workflow-trigger-service'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const params = Object.fromEntries(formData.entries()) as Record<string, string>

    // Validate Twilio signature in production
    if (process.env.NODE_ENV === 'production') {
      const signature = request.headers.get('x-twilio-signature') || ''
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/status`

      if (!validateTwilioWebhook(url, params, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    }

    const {
      MessageSid,
      CallSid,
      MessageStatus,
      CallStatus,
      CallDuration,
      ErrorCode,
      ErrorMessage,
    } = params

    const sid = MessageSid || CallSid
    const status = MessageStatus || CallStatus

    if (!sid) {
      return NextResponse.json({ error: 'Missing SID' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const updateData: Record<string, unknown> = {
      twilio_status: status,
      updated_at: new Date().toISOString(),
    }

    if (CallDuration) {
      updateData.duration_seconds = parseInt(CallDuration)
    }

    if (ErrorCode) {
      updateData.error_code = ErrorCode
      updateData.error_message = ErrorMessage
    }

    await supabase
      .from('communications')
      .update(updateData)
      .eq('twilio_sid', sid)

    // Fire webhooks for delivery failures and call endings
    if (MessageSid && (status === 'failed' || status === 'undelivered')) {
      const { data: comm } = await supabase
        .from('communications')
        .select('id, user_id, from_number, to_number, body, lead_id, contact_id')
        .eq('twilio_sid', MessageSid)
        .single()

      if (comm) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("default_workspace_id")
          .eq("id", comm.user_id)
          .single()

        if (profile?.default_workspace_id) {
          fireWebhooks("sms.delivery_failed", {
            id: comm.id,
            twilio_sid: MessageSid,
            from: comm.from_number,
            to: comm.to_number,
            body: comm.body,
            status: status,
            error_code: ErrorCode,
            error_message: ErrorMessage,
            lead_id: comm.lead_id,
            contact_id: comm.contact_id,
          }, profile.default_workspace_id)
        }
      }
    }

    if (CallSid && ['completed', 'busy', 'no-answer', 'canceled', 'failed'].includes(status)) {
      // Reconcile call minute reservations (refund unused minutes)
      try {
        await handleCallStatusUpdate(
          CallSid,
          status,
          CallDuration ? parseInt(CallDuration) : undefined
        )
      } catch (minutesError) {
        console.error('Failed to reconcile call minutes:', minutesError)
      }

      const { data: comm } = await supabase
        .from('communications')
        .select('id, user_id, from_number, to_number, direction, lead_id, contact_id, duration_seconds')
        .eq('twilio_sid', CallSid)
        .single()

      if (comm) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("default_workspace_id")
          .eq("id", comm.user_id)
          .single()

        if (profile?.default_workspace_id) {
          fireWebhooks("call.ended", {
            id: comm.id,
            twilio_sid: CallSid,
            from: comm.from_number,
            to: comm.to_number,
            direction: comm.direction,
            status: status,
            duration_seconds: CallDuration ? parseInt(CallDuration) : comm.duration_seconds,
            lead_id: comm.lead_id,
            contact_id: comm.contact_id,
          }, profile.default_workspace_id)
        }

        // Trigger workflow events for call completion/missed
        const durationSeconds = CallDuration ? parseInt(CallDuration) : comm.duration_seconds
        const callData: Call = {
          id: comm.id,
          twilio_sid: CallSid,
          direction: comm.direction as 'inbound' | 'outbound',
          status: status,
          from_number: comm.from_number,
          to_number: comm.to_number,
          duration_seconds: durationSeconds,
        }

        // Fetch lead and contact if available
        let leadData: Lead | null = null
        let contactData: Contact | null = null

        if (comm.lead_id) {
          const { data: lead } = await supabase
            .from('leads')
            .select('id, name, status, notes, user_id')
            .eq('id', comm.lead_id)
            .single()
          leadData = lead as Lead | null
        }

        if (comm.contact_id) {
          const { data: contact } = await supabase
            .from('contacts')
            .select('id, first_name, last_name, email, phone')
            .eq('id', comm.contact_id)
            .single()
          contactData = contact as Contact | null
        }

        // Trigger call_completed when call ended successfully with duration > 0
        if (status === 'completed' && durationSeconds && durationSeconds > 0) {
          triggerCallCompleted(callData, leadData, contactData, comm.user_id)
        }

        // Trigger call_missed for missed call statuses
        if (['no-answer', 'busy', 'canceled'].includes(status)) {
          triggerCallMissed(callData, leadData, contactData, comm.user_id)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error handling status callback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
