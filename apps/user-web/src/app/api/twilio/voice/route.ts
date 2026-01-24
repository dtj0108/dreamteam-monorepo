import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { validateTwilioWebhook, VoiceResponse } from '@/lib/twilio'
import { fireWebhooks } from "@/lib/make-webhooks"

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

    const { CallSid, From, To, CallStatus } = params

    const supabase = createAdminClient()

    // Find the associated contact/lead
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, lead_id, first_name, leads!inner(user_id)')
      .eq('phone', From)
      .single()

    if (contact) {
      const userId = (contact.leads as unknown as { user_id: string }).user_id

      // Log the incoming call
      await supabase.from('communications').insert({
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
      })

      // Fire webhook for Make.com integrations
      const { data: profile } = await supabase
        .from("profiles")
        .select("default_workspace_id")
        .eq("id", userId)
        .single()

      if (profile?.default_workspace_id) {
        fireWebhooks("call.received", {
          id: CallSid,
          from: From,
          to: To,
          status: CallStatus,
          contact_id: contact.id,
          lead_id: contact.lead_id,
        }, profile.default_workspace_id)
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
    console.error('Error handling incoming call:', error)
    const twiml = new VoiceResponse()
    twiml.say('Sorry, an error occurred. Please try again later.')
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}
