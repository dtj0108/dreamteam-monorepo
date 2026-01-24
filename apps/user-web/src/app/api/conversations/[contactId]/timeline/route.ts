import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/session'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { searchEmails, isNylasConfigured } from '@/lib/nylas'

export interface TimelineItem {
  id: string
  type: 'email' | 'sms' | 'call'
  direction: 'inbound' | 'outbound'
  timestamp: string
  // Email fields
  subject?: string
  snippet?: string
  body?: string
  email_id?: string
  from?: Array<{ email: string; name?: string }>
  to?: Array<{ email: string; name?: string }>
  // SMS fields (body is shared with email)
  // Call fields
  duration_seconds?: number
  twilio_status?: string
  recordings?: Array<{ id: string; duration_seconds: number; twilio_recording_url: string }>
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const { isValid } = await validateWorkspaceAccess(workspaceId, session.id)
    if (!isValid) {
      return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
    }

    const { contactId } = await params
    const searchParams = request.nextUrl.searchParams
    const grantId = searchParams.get('grantId')
    const limit = parseInt(searchParams.get('limit') || '100')

    const supabase = createAdminClient()

    // Verify contact belongs to user's workspace
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        lead:leads!inner(id, name, user_id, workspace_id)
      `)
      .eq('id', contactId)
      .eq('lead.user_id', session.id)
      .eq('lead.workspace_id', workspaceId)
      .single()

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const timelineItems: TimelineItem[] = []

    // Fetch communications by contact_id
    const { data: communications, error: commsError } = await supabase
      .from('communications')
      .select(`
        id,
        type,
        direction,
        body,
        duration_seconds,
        twilio_status,
        created_at,
        recordings:call_recordings(id, duration_seconds, twilio_recording_url)
      `)
      .eq('contact_id', contactId)
      .eq('user_id', session.id)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (commsError) {
      console.error('Error fetching communications:', commsError)
    }

    // Also fetch communications by phone number if contact has phone
    if (contact.phone) {
      const normalizedPhone = contact.phone.replace(/\D/g, '')

      // Try multiple phone formats
      const { data: phoneComms } = await supabase
        .from('communications')
        .select(`
          id,
          type,
          direction,
          body,
          duration_seconds,
          twilio_status,
          created_at,
          from_number,
          to_number,
          recordings:call_recordings(id, duration_seconds, twilio_recording_url)
        `)
        .eq('user_id', session.id)
        .is('contact_id', null) // Only get ones not already linked to a contact
        .order('created_at', { ascending: true })
        .limit(limit)

      if (phoneComms) {
        // Filter by phone match
        for (const comm of phoneComms) {
          const fromNorm = comm.from_number.replace(/\D/g, '')
          const toNorm = comm.to_number.replace(/\D/g, '')
          if (
            fromNorm.includes(normalizedPhone) ||
            toNorm.includes(normalizedPhone) ||
            normalizedPhone.includes(fromNorm) ||
            normalizedPhone.includes(toNorm)
          ) {
            // Add to communications if not already included (by ID)
            if (!communications?.find((c: { id: string }) => c.id === comm.id)) {
              const item: TimelineItem = {
                id: comm.id,
                type: comm.type as 'sms' | 'call',
                direction: comm.direction as 'inbound' | 'outbound',
                timestamp: comm.created_at,
                body: comm.body || undefined,
                duration_seconds: comm.duration_seconds || undefined,
                twilio_status: comm.twilio_status || undefined,
                recordings: comm.recordings?.map((r: { id: string; duration_seconds: number; twilio_recording_url: string }) => ({
                  id: r.id,
                  duration_seconds: r.duration_seconds,
                  twilio_recording_url: r.twilio_recording_url,
                })) || undefined,
              }
              timelineItems.push(item)
            }
          }
        }
      }
    }

    // Add communications to timeline
    if (communications) {
      for (const comm of communications) {
        const item: TimelineItem = {
          id: comm.id,
          type: comm.type as 'sms' | 'call',
          direction: comm.direction as 'inbound' | 'outbound',
          timestamp: comm.created_at,
          body: comm.body || undefined,
          duration_seconds: comm.duration_seconds || undefined,
          twilio_status: comm.twilio_status || undefined,
          recordings: comm.recordings?.map((r: { id: string; duration_seconds: number; twilio_recording_url: string }) => ({
            id: r.id,
            duration_seconds: r.duration_seconds,
            twilio_recording_url: r.twilio_recording_url,
          })) || undefined,
        }
        timelineItems.push(item)
      }
    }

    // Fetch emails from Nylas if grantId is provided and contact has email
    if (grantId && contact.email && isNylasConfigured()) {
      // Get the Nylas grant_id from our internal ID
      const { data: grant } = await supabase
        .from('nylas_grants')
        .select('grant_id')
        .eq('id', grantId)
        .eq('workspace_id', workspaceId)
        .single()

      if (grant) {
        // Search for emails to/from this contact
        const query = `from:${contact.email} OR to:${contact.email}`
        const result = await searchEmails(grant.grant_id, query, { limit })

        if (result.success && result.data?.emails) {
          for (const email of result.data.emails) {
            // Determine direction based on from address
            const isInbound = email.from.some(
              (f) => f.email.toLowerCase() === contact.email?.toLowerCase()
            )

            const item: TimelineItem = {
              id: `email-${email.id}`,
              type: 'email',
              direction: isInbound ? 'inbound' : 'outbound',
              timestamp: new Date(email.date * 1000).toISOString(),
              subject: email.subject || undefined,
              snippet: email.snippet || undefined,
              email_id: email.id,
              from: email.from,
              to: email.to,
            }
            timelineItems.push(item)
          }
        }
      }
    }

    // Sort by timestamp ascending (oldest first, like a chat)
    timelineItems.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    return NextResponse.json({
      timeline: timelineItems,
      contact: {
        id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        lead: Array.isArray(contact.lead) ? contact.lead[0] : contact.lead,
      },
    })
  } catch (error) {
    console.error('Error in timeline GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
