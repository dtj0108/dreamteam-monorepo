import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { validateTwilioWebhook, MessagingResponse } from '@/lib/twilio'
import { fireWebhooks } from "@/lib/make-webhooks"
import { getJoinedField } from '@/lib/supabase-utils'

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

    // Look up the receiving phone number to determine workspace
    const { data: twilioNumber } = await supabase
      .from('twilio_numbers')
      .select('workspace_id')
      .eq('phone_number', To)
      .single()

    const smsWorkspaceId = twilioNumber?.workspace_id as string | null

    // Find existing conversation thread for this phone number, scoped to workspace
    let threadQuery = supabase
      .from('conversation_threads')
      .select('id, user_id, lead_id, contact_id, unread_count')
      .eq('phone_number', From)

    if (smsWorkspaceId) {
      threadQuery = threadQuery.eq('workspace_id', smsWorkspaceId)
    }

    const { data: thread } = await threadQuery.single()

    if (thread) {
      // Log the incoming message
      const { error: insertCommsError } = await supabase.from('communications').insert({
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
        workspace_id: smsWorkspaceId || null,
      })
      if (insertCommsError) {
        console.warn(`[twilio/sms] Failed to insert communication for thread ${thread.id}:`, insertCommsError.message)
      }

      // Update conversation thread
      const { error: updateThreadError } = await supabase
        .from('conversation_threads')
        .update({
          last_message_at: new Date().toISOString(),
          unread_count: (thread.unread_count || 0) + 1,
        })
        .eq('id', thread.id)
      if (updateThreadError) {
        console.warn(`[twilio/sms] Failed to update thread ${thread.id}:`, updateThreadError.message)
      }

      // Fire webhook for Make.com integrations — use workspace from twilio_numbers
      if (!smsWorkspaceId) {
        console.warn(`[twilio/sms] No workspace resolved from twilio_numbers for ${To} — skipping webhook`)
      }

      if (smsWorkspaceId) {
        fireWebhooks("sms.received", {
          id: MessageSid,
          from: From,
          to: To,
          body: Body,
          media_urls: mediaUrls,
          contact_id: thread.contact_id,
          lead_id: thread.lead_id,
        }, smsWorkspaceId)
      }
    } else {
      // Try to find contact by phone number, scoped to workspace if known
      let contactQuery = supabase
        .from('contacts')
        .select('id, lead_id, leads!inner(user_id, workspace_id)')
        .eq('phone', From)

      if (smsWorkspaceId) {
        contactQuery = contactQuery.eq('leads.workspace_id', smsWorkspaceId)
      }

      const { data: contact } = await contactQuery.single()

      if (contact) {
        const userId = getJoinedField<string>(contact.leads, 'user_id')
        const leadsWorkspaceId = getJoinedField<string>(contact.leads, 'workspace_id')
        if (!userId) {
          console.error('Unexpected leads join shape in inbound SMS:', contact.leads)
          return new NextResponse(new MessagingResponse().toString(), {
            headers: { 'Content-Type': 'text/xml' },
          })
        }

        // Create conversation thread
        const { error: insertThreadError } = await supabase
          .from('conversation_threads')
          .insert({
            user_id: userId,
            lead_id: contact.lead_id,
            contact_id: contact.id,
            phone_number: From,
            last_message_at: new Date().toISOString(),
            unread_count: 1,
          })
        if (insertThreadError) {
          console.warn(`[twilio/sms] Failed to create thread for contact ${contact.id}:`, insertThreadError.message)
        }

        // Log the message
        const { error: insertCommsError2 } = await supabase.from('communications').insert({
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
          workspace_id: smsWorkspaceId || leadsWorkspaceId || null,
        })
        if (insertCommsError2) {
          console.warn(`[twilio/sms] Failed to insert communication for contact ${contact.id}:`, insertCommsError2.message)
        }

        // Fire webhook for Make.com integrations — use workspace from twilio_numbers or lead
        const contactWebhookWorkspaceId = smsWorkspaceId || leadsWorkspaceId || null
        if (!contactWebhookWorkspaceId) {
          console.warn(`[twilio/sms] No workspace resolved for contact ${contact.id} from ${From} — skipping webhook`)
        }

        if (contactWebhookWorkspaceId) {
          fireWebhooks("sms.received", {
            id: MessageSid,
            from: From,
            to: To,
            body: Body,
            media_urls: mediaUrls,
            contact_id: contact.id,
            lead_id: contact.lead_id,
          }, contactWebhookWorkspaceId)
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
    const errorId = crypto.randomUUID().slice(0, 8)
    console.error(`[twilio/sms] Error [${errorId}]:`, error)
    return NextResponse.json({ error: 'Internal server error', errorId }, { status: 500 })
  }
}
