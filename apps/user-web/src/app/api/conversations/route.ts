import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/session'
import { getCurrentWorkspaceId } from '@/lib/workspace-auth'
import { listEmails, isNylasConfigured } from '@/lib/nylas'

export interface ConversationContact {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  lead: { id: string; name: string }
  last_communication: {
    type: 'sms' | 'call' | 'email'
    preview: string
    timestamp: string
    direction: 'inbound' | 'outbound'
  } | null
  unread_count: number
}

interface ContactRow {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  lead: { id: string; name: string } | Array<{ id: string; name: string }>
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const grantId = searchParams.get('grantId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch contacts with their leads, filtered by workspace
    let contactsQuery = supabase
      .from('contacts')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        lead:leads!inner(id, name, user_id, workspace_id)
      `)
      .eq('lead.user_id', session.id)
      .eq('lead.workspace_id', workspaceId)

    if (search) {
      contactsQuery = contactsQuery.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      )
    }

    const { data: contacts, error: contactsError } = await contactsQuery

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError)
      return NextResponse.json({ error: contactsError.message }, { status: 500 })
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ contacts: [], total: 0 })
    }

    // Get contact IDs
    const contactIds = (contacts as ContactRow[]).map((c: ContactRow) => c.id)

    // Fetch communications for all contacts
    // We'll get the most recent communication per contact
    const { data: communications, error: commsError } = await supabase
      .from('communications')
      .select('id, contact_id, type, direction, body, created_at')
      .in('contact_id', contactIds)
      .eq('user_id', session.id)
      .order('created_at', { ascending: false })

    if (commsError) {
      console.error('Error fetching communications:', commsError)
      // Continue without communications data
    }

    // Also check communications by phone number for contacts that have phone
    const phonesToCheck = (contacts as ContactRow[])
      .filter((c: ContactRow) => c.phone)
      .map((c: ContactRow) => c.phone as string)

    let phoneComms: Array<{
      id: string
      from_number: string
      to_number: string
      type: string
      direction: string
      body: string | null
      created_at: string
    }> = []

    if (phonesToCheck.length > 0) {
      const { data: phoneData } = await supabase
        .from('communications')
        .select('id, from_number, to_number, type, direction, body, created_at')
        .eq('user_id', session.id)
        .or(`from_number.in.(${phonesToCheck.join(',')}),to_number.in.(${phonesToCheck.join(',')})`)
        .order('created_at', { ascending: false })

      if (phoneData) {
        phoneComms = phoneData
      }
    }

    // Fetch unread counts from conversation_threads
    const { data: threads } = await supabase
      .from('conversation_threads')
      .select('contact_id, phone_number, unread_count')
      .eq('user_id', session.id)
      .gt('unread_count', 0)

    // Build a map of contact_id -> latest communication
    const latestCommByContact = new Map<
      string,
      { type: 'sms' | 'call'; preview: string; timestamp: string; direction: 'inbound' | 'outbound' }
    >()

    // First, process communications that have contact_id
    if (communications) {
      for (const comm of communications) {
        if (comm.contact_id && !latestCommByContact.has(comm.contact_id)) {
          latestCommByContact.set(comm.contact_id, {
            type: comm.type as 'sms' | 'call',
            preview: comm.type === 'sms' ? (comm.body || '').substring(0, 100) : `${comm.direction === 'inbound' ? 'Incoming' : 'Outgoing'} call`,
            timestamp: comm.created_at,
            direction: comm.direction as 'inbound' | 'outbound',
          })
        }
      }
    }

    // Then, for contacts without communications by contact_id, try to match by phone
    for (const contact of contacts as ContactRow[]) {
      if (!latestCommByContact.has(contact.id) && contact.phone) {
        const normalizedPhone = contact.phone.replace(/\D/g, '')
        const phoneComm = phoneComms.find((pc) => {
          const fromNorm = pc.from_number.replace(/\D/g, '')
          const toNorm = pc.to_number.replace(/\D/g, '')
          return fromNorm.includes(normalizedPhone) || toNorm.includes(normalizedPhone) ||
                 normalizedPhone.includes(fromNorm) || normalizedPhone.includes(toNorm)
        })
        if (phoneComm) {
          latestCommByContact.set(contact.id, {
            type: phoneComm.type as 'sms' | 'call',
            preview: phoneComm.type === 'sms' ? (phoneComm.body || '').substring(0, 100) : `${phoneComm.direction === 'inbound' ? 'Incoming' : 'Outgoing'} call`,
            timestamp: phoneComm.created_at,
            direction: phoneComm.direction as 'inbound' | 'outbound',
          })
        }
      }
    }

    // Check for email conversations if grantId is provided
    const emailsByContact = new Map<string, {
      preview: string
      timestamp: string
      direction: 'inbound' | 'outbound'
    }>()

    if (grantId && isNylasConfigured()) {
      // Get the nylas grant_id from our database
      const { data: grant } = await supabase
        .from('nylas_grants')
        .select('grant_id')
        .eq('id', grantId)
        .eq('workspace_id', workspaceId)
        .single()

      if (grant) {
        const contactsWithEmail = (contacts as ContactRow[]).filter(c => c.email)

        // Fetch recent emails (single query for performance)
        const emailResult = await listEmails(grant.grant_id, { limit: 100 })

        if (emailResult.success && emailResult.data?.emails) {
          for (const contact of contactsWithEmail) {
            const contactEmail = contact.email!.toLowerCase()
            const matchingEmail = emailResult.data.emails.find(email =>
              email.from.some(f => f.email.toLowerCase() === contactEmail) ||
              email.to.some(t => t.email.toLowerCase() === contactEmail)
            )

            if (matchingEmail) {
              const isInbound = matchingEmail.from.some(f =>
                f.email.toLowerCase() === contactEmail
              )
              emailsByContact.set(contact.id, {
                preview: matchingEmail.subject || '(No subject)',
                timestamp: new Date(matchingEmail.date * 1000).toISOString(),
                direction: isInbound ? 'inbound' : 'outbound',
              })
            }
          }
        }
      }
    }

    // Build unread count map
    const unreadByContact = new Map<string, number>()
    if (threads) {
      for (const thread of threads) {
        if (thread.contact_id) {
          unreadByContact.set(thread.contact_id, thread.unread_count)
        } else if (thread.phone_number) {
          // Match by phone
          const contact = (contacts as ContactRow[]).find((c: ContactRow) => {
            if (!c.phone) return false
            const normalizedPhone = c.phone.replace(/\D/g, '')
            const threadPhone = thread.phone_number.replace(/\D/g, '')
            return normalizedPhone.includes(threadPhone) || threadPhone.includes(normalizedPhone)
          })
          if (contact && !unreadByContact.has(contact.id)) {
            unreadByContact.set(contact.id, thread.unread_count)
          }
        }
      }
    }

    // Build the response, merging SMS/call and email data
    const result: ConversationContact[] = (contacts as ContactRow[]).map((contact: ContactRow) => {
      const smsCall = latestCommByContact.get(contact.id)
      const emailData = emailsByContact.get(contact.id)

      let last_communication: ConversationContact['last_communication'] = null

      if (smsCall && emailData) {
        // Use whichever is more recent
        const smsTime = new Date(smsCall.timestamp).getTime()
        const emailTime = new Date(emailData.timestamp).getTime()
        last_communication = emailTime > smsTime
          ? { type: 'email' as const, ...emailData }
          : smsCall
      } else if (smsCall) {
        last_communication = smsCall
      } else if (emailData) {
        last_communication = { type: 'email' as const, ...emailData }
      }

      return {
        id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        lead: Array.isArray(contact.lead) ? contact.lead[0] : contact.lead,
        last_communication,
        unread_count: unreadByContact.get(contact.id) || 0,
      }
    })

    // Filter to only contacts that have conversations
    const contactsWithConversations = result.filter(
      (contact) => contact.last_communication !== null
    )

    // Sort by last_communication timestamp (most recent first)
    contactsWithConversations.sort((a, b) => {
      // Both have last_communication since we filtered
      return new Date(b.last_communication!.timestamp).getTime() - new Date(a.last_communication!.timestamp).getTime()
    })

    // Apply pagination to filtered list
    const paginatedResult = contactsWithConversations.slice(offset, offset + limit)

    return NextResponse.json({
      contacts: paginatedResult,
      total: contactsWithConversations.length,
    })
  } catch (error) {
    console.error('Error in conversations GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
