import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getSession } from '@dreamteam/auth/session'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Check for incoming calls that are ringing
    const { data, error } = await supabase
      .from('communications')
      .select(`
        id,
        twilio_sid,
        from_number,
        to_number,
        lead_id,
        contact_id,
        leads (
          id,
          company_name
        ),
        contacts (
          id,
          first_name,
          last_name
        )
      `)
      .eq('user_id', session.id)
      .eq('type', 'call')
      .eq('direction', 'inbound')
      .eq('twilio_status', 'ringing')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error checking for incoming calls:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ call: null })
    }

    // Format contact name
    let contactName: string | undefined
    if (data.contacts) {
      const contact = data.contacts as { first_name: string; last_name?: string }
      contactName = contact.last_name
        ? `${contact.first_name} ${contact.last_name}`
        : contact.first_name
    } else if (data.leads) {
      const lead = data.leads as { company_name?: string }
      contactName = lead.company_name || undefined
    }

    return NextResponse.json({
      call: {
        id: data.id,
        twilioSid: data.twilio_sid,
        from: data.from_number,
        to: data.to_number,
        contactName,
        leadId: data.lead_id,
        contactId: data.contact_id,
      },
    })
  } catch (error) {
    console.error('Error checking for incoming calls:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
