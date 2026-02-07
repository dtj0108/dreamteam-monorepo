import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { validateTwilioWebhook, VoiceResponse } from '@/lib/twilio'
import { fireWebhooks } from "@/lib/make-webhooks"
import { triggerCallReceived, type Call, type Lead, type Contact } from '@/lib/workflow-trigger-service'
import { getJoinedField } from '@/lib/supabase-utils'
import { reserveCallMinutes } from '@/lib/call-with-minutes'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const params = Object.fromEntries(formData.entries()) as Record<string, string>

    // Validate Twilio signature in production
    if (process.env.NODE_ENV === 'production') {
      const signature = request.headers.get('x-twilio-signature') || ''
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice`

      if (!validateTwilioWebhook(url, params, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    }

    const { CallSid, From, To, Called, CallStatus } = params

    const supabase = createAdminClient()

    // Look up the receiving phone number to determine workspace
    const calledNumber = Called || To
    const { data: twilioNumber } = await supabase
      .from('twilio_numbers')
      .select('workspace_id')
      .eq('phone_number', calledNumber)
      .single()

    const callWorkspaceId = twilioNumber?.workspace_id as string | null

    // Find the associated contact/lead, scoped to workspace if known
    let contactQuery = supabase
      .from('contacts')
      .select('id, lead_id, first_name, leads!inner(user_id, workspace_id)')
      .eq('phone', From)

    if (callWorkspaceId) {
      contactQuery = contactQuery.eq('leads.workspace_id', callWorkspaceId)
    }

    const { data: contact } = await contactQuery.single()

    if (contact) {
      const userId = getJoinedField<string>(contact.leads, 'user_id')
      const leadsWorkspaceId = getJoinedField<string>(contact.leads, 'workspace_id')
      if (!userId) {
        console.error('Unexpected leads join shape in inbound call:', contact.leads)
        const twiml = new VoiceResponse()
        twiml.say('Sorry, an error occurred. Please try again later.')
        return new NextResponse(twiml.toString(), {
          headers: { 'Content-Type': 'text/xml' },
        })
      }

      // Log the incoming call
      const { data: commRecord } = await supabase.from('communications').insert({
        user_id: userId,
        lead_id: contact.lead_id,
        contact_id: contact.id,
        type: 'call',
        direction: 'inbound',
        twilio_sid: CallSid,
        twilio_status: CallStatus,
        from_number: From,
        to_number: To,
        triggered_by: 'inbound',
        workspace_id: callWorkspaceId || leadsWorkspaceId || null,
      }).select('id').single()

      // Reserve call minutes for inbound call (non-blocking — don't reject callers)
      const resolvedWorkspaceId = callWorkspaceId || leadsWorkspaceId || null
      if (resolvedWorkspaceId && commRecord?.id) {
        reserveCallMinutes(resolvedWorkspaceId, commRecord.id, From, To, 'inbound')
          .then((reservation) => {
            if (!reservation.success) {
              console.warn(`Inbound call minute reservation failed for workspace ${resolvedWorkspaceId}: ${reservation.error}`)
            }
          })
          .catch((err) => {
            console.warn('Failed to reserve inbound call minutes:', err)
          })
      }

      // Fire webhook for Make.com integrations — use workspace from twilio_numbers or lead
      const voiceWebhookWorkspaceId = callWorkspaceId || leadsWorkspaceId || null
      if (!voiceWebhookWorkspaceId) {
        console.warn(`[twilio/voice] No workspace resolved for call ${CallSid} from ${From} — skipping webhook`)
      }

      if (voiceWebhookWorkspaceId) {
        fireWebhooks("call.received", {
          id: CallSid,
          from: From,
          to: To,
          status: CallStatus,
          contact_id: contact.id,
          lead_id: contact.lead_id,
        }, voiceWebhookWorkspaceId)
      }

      // Trigger call_received workflows
      const { data: lead } = await supabase
        .from('leads')
        .select('id, name, status, notes, user_id, workspace_id')
        .eq('id', contact.lead_id)
        .single()

      if (lead) {
        const callData: Call = {
          id: commRecord?.id || CallSid,
          twilio_sid: CallSid,
          direction: 'inbound',
          status: CallStatus,
          from_number: From,
          to_number: To,
        }
        const contactData: Contact = {
          id: contact.id,
          first_name: contact.first_name,
        }
        triggerCallReceived(callData, lead as Lead, contactData, userId, resolvedWorkspaceId || undefined)
      }
    }

    // Generate TwiML response
    const twiml = new VoiceResponse()

    // Try to forward to configured phone number first
    const forwardToNumber = process.env.TWILIO_FORWARD_TO_NUMBER

    if (forwardToNumber) {
      // Forward call with timeout, fallback to voicemail
      const dial = twiml.dial({
        timeout: 20,
        action: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/fallback`,
        method: 'POST',
      })
      dial.number(forwardToNumber)
    } else {
      // No forwarding number configured, go directly to voicemail
      twiml.say({
        voice: 'Polly.Amy',
      }, 'Thank you for calling. Please leave a message after the beep.')

      twiml.record({
        maxLength: 120,
        recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/recording`,
        recordingStatusCallbackEvent: ['completed'],
      })

      twiml.say('We did not receive a recording. Goodbye.')
    }

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8)
    console.error(`[twilio/voice] Error [${errorId}]:`, error)
    const twiml = new VoiceResponse()
    twiml.say('Sorry, an error occurred. Please try again later.')
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}
