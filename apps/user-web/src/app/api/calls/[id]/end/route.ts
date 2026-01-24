import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getSession } from '@dreamteam/auth/session'
import { endCall } from '@/lib/twilio'

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
    const supabase = createAdminClient()

    // Get the call record
    const { data: call, error: fetchError } = await supabase
      .from('communications')
      .select('twilio_sid')
      .eq('id', id)
      .eq('user_id', session.id)
      .eq('type', 'call')
      .single()

    if (fetchError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    if (!call.twilio_sid) {
      return NextResponse.json({ error: 'Call has no Twilio SID' }, { status: 400 })
    }

    // End the call via Twilio
    const result = await endCall(call.twilio_sid)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to end call' },
        { status: 500 }
      )
    }

    // Update the database
    await supabase
      .from('communications')
      .update({ twilio_status: 'completed' })
      .eq('id', id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error ending call:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
