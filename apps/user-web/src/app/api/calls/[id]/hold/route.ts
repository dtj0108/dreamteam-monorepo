import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getSession } from '@dreamteam/auth/session'
import { holdParticipant } from '@/lib/twilio'

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
    const { hold } = body

    if (typeof hold !== 'boolean') {
      return NextResponse.json({ error: 'hold parameter required' }, { status: 400 })
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
      const result = await holdParticipant(
        call.conference_sid,
        call.participant_sid,
        hold
      )

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to toggle hold' },
          { status: 500 }
        )
      }
    }

    // Update the database
    await supabase
      .from('communications')
      .update({ is_on_hold: hold })
      .eq('id', id)

    return NextResponse.json({ success: true, hold })
  } catch (error) {
    console.error('Error toggling hold:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
