import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { validateTwilioWebhook, MessagingResponse } from '@/lib/twilio'
import { fireWebhooks } from "@/lib/make-webhooks"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const params = Object.fromEntries(formData.entries()) as Record<string, string>

    // Validate Twilio signature in production
    if (process.env.NODE_ENV === 'production') {
      const signature = request.headers.get('x-twilio-signature') || ''
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/sms`

      if (!validateTwilioWebhook(url, params, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    }

    const {
      MessageSid,
      From,
      To,
      Body,
      NumMedia,
    } = params

    const supabase = createAdminClient()

    // Collect media URLs (MMS attachments)
    const mediaUrls: string[] = []
    const numMedia = parseInt(NumMedia || '0')
    for (let i = 0; i < numMedia; i++) {
      const url = params[`MediaUrl${i}`]
      if (url) mediaUrls.push(url)
    }

    // Find existing conversation thread for this phone number
    const { data: thread } = await supabase
      .from('conversation_threads')
      .select('id, user_id, lead_id, contact_id, unread_count')
      .eq('phone_number', From)
      .single()

    if (thread) {
      // Log the incoming message
      await supabase.from('communications').insert({
        user_id: thread.user_id,
        lead_id: thread.lead_id,
        contact_id: thread.contact_id,
        type: 'sms',
        direction: 'inbound',
        twilio_sid: MessageSid,
        twilio_status: 'received',
        from_number: From,
        to_number: To,
        body: Body,
        media_urls: mediaUrls,
        triggered_by: 'inbound',
      })

      // Update conversation thread
      await supabase
        .from('conversation_threads')
        .update({
          last_message_at: new Date().toISOString(),
          unread_count: (thread.unread_count || 0) + 1,
        })
        .eq('id', thread.id)

      // Fire webhook for Make.com integrations
      const { data: profile } = await supabase
        .from("profiles")
        .select("default_workspace_id")
        .eq("id", thread.user_id)
        .single()

      if (profile?.default_workspace_id) {
        fireWebhooks("sms.received", {
          id: MessageSid,
          from: From,
          to: To,
          body: Body,
          media_urls: mediaUrls,
          contact_id: thread.contact_id,
          lead_id: thread.lead_id,
        }, profile.default_workspace_id)
      }
    } else {
      // Try to find contact by phone number
      const { data: contact } = await supabase
        .from('contacts')
        .select('id, lead_id, leads!inner(user_id)')
        .eq('phone', From)
        .single()

      if (contact) {
        const userId = (contact.leads as unknown as { user_id: string }).user_id

        // Create conversation thread
        await supabase
          .from('conversation_threads')
          .insert({
            user_id: userId,
            lead_id: contact.lead_id,
            contact_id: contact.id,
            phone_number: From,
            last_message_at: new Date().toISOString(),
            unread_count: 1,
          })

        // Log the message
        await supabase.from('communications').insert({
          user_id: userId,
          lead_id: contact.lead_id,
          contact_id: contact.id,
          type: 'sms',
          direction: 'inbound',
          twilio_sid: MessageSid,
          twilio_status: 'received',
          from_number: From,
          to_number: To,
          body: Body,
          media_urls: mediaUrls,
          triggered_by: 'inbound',
        })

        // Fire webhook for Make.com integrations
        const { data: profile } = await supabase
          .from("profiles")
          .select("default_workspace_id")
          .eq("id", userId)
          .single()

        if (profile?.default_workspace_id) {
          fireWebhooks("sms.received", {
            id: MessageSid,
            from: From,
            to: To,
            body: Body,
            media_urls: mediaUrls,
            contact_id: contact.id,
            lead_id: contact.lead_id,
          }, profile.default_workspace_id)
        }
      }
      // If no contact found, we can't associate the message - skip logging
    }

    // Return empty TwiML (no auto-reply)
    const twiml = new MessagingResponse()

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (error) {
    console.error('Error handling incoming SMS:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
