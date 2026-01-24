import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getSession } from '@dreamteam/auth/session'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('communications')
      .select('id, twilio_sid, twilio_status, duration_seconds, is_muted, is_on_hold, answered_at, conference_sid')
      .eq('id', id)
      .eq('user_id', session.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    // Map Twilio status to our status format
    let status = data.twilio_status || 'pending'
    if (data.is_on_hold && status === 'in-progress') {
      status = 'on-hold'
    }

    return NextResponse.json({
      id: data.id,
      twilioSid: data.twilio_sid,
      status,
      duration: data.duration_seconds,
      isMuted: data.is_muted || false,
      isOnHold: data.is_on_hold || false,
      answeredAt: data.answered_at,
      conferenceSid: data.conference_sid,
    })
  } catch (error) {
    console.error('Error getting call status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
