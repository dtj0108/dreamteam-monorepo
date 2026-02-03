import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getSession } from '@dreamteam/auth/session'

interface CommunicationRecord {
  id: string
  type: string
  direction: string
  duration_seconds: number | null
  recordings?: Array<{ id: string }>
  [key: string]: unknown
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const contactId = searchParams.get('contactId')
    const type = searchParams.get('type')
    const direction = searchParams.get('direction')
    const status = searchParams.get('status')
    const hasRecording = searchParams.get('hasRecording')
    const isVoicemail = searchParams.get('isVoicemail')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = createAdminClient()

    let query = supabase
      .from('communications')
      .select(`
        *,
        recordings:call_recordings(*)
      `)
      .eq('user_id', session.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (leadId) query = query.eq('lead_id', leadId)
    if (contactId) query = query.eq('contact_id', contactId)
    if (type) query = query.eq('type', type)
    if (direction) query = query.eq('direction', direction)

    // Status filter: "completed" or "missed" (no-answer, busy, failed)
    if (status === 'completed') {
      query = query.eq('twilio_status', 'completed')
    } else if (status === 'missed') {
      query = query.in('twilio_status', ['no-answer', 'busy', 'failed'])
    }

    // Search by phone number
    if (search) {
      query = query.or(`from_number.ilike.%${search}%,to_number.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching communications:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Post-query filtering for hasRecording and isVoicemail
    let filteredData = (data || []) as CommunicationRecord[]

    if (hasRecording === 'true') {
      filteredData = filteredData.filter(
        (comm: CommunicationRecord) => comm.recordings && comm.recordings.length > 0
      )
    }

    // Voicemail: inbound calls with recordings and typically short duration (< 120s)
    if (isVoicemail === 'true') {
      filteredData = filteredData.filter(
        (comm: CommunicationRecord) =>
          comm.type === 'call' &&
          comm.direction === 'inbound' &&
          comm.recordings &&
          comm.recordings.length > 0 &&
          (comm.duration_seconds === null || comm.duration_seconds < 120)
      )
    }

    return NextResponse.json(filteredData)
  } catch (error) {
    console.error('Error fetching communications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
