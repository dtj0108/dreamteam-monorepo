import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getSession } from '@dreamteam/auth/session'
import { muteParticipant } from '@/lib/twilio'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { muted } = body

    if (typeof muted !== 'boolean') {
      return NextResponse.json({ error: 'muted parameter required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get the call record
    const { data: call, error: fetchError } = await supabase
      .from('communications')
      .select('twilio_sid, conference_sid, participant_sid')
      .eq('id', id)
      .eq('user_id', session.id)
      .eq('type', 'call')
      .single()

    if (fetchError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    // For conference-based calls, use the Conference API
    if (call.conference_sid && call.participant_sid) {
      const result = await muteParticipant(
        call.conference_sid,
        call.participant_sid,
        muted
      )

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to mute' },
          { status: 500 }
        )
      }
    }

    // Update the database
    await supabase
      .from('communications')
      .update({ is_muted: muted })
      .eq('id', id)

    return NextResponse.json({ success: true, muted })
  } catch (error) {
    console.error('Error toggling mute:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
