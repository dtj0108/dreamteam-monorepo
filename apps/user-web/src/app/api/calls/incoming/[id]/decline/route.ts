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

    // Verify the call belongs to this user
    const { data: call, error: fetchError } = await supabase
      .from('communications')
      .select('id, twilio_sid')
      .eq('id', id)
      .eq('user_id', session.id)
      .eq('type', 'call')
      .eq('direction', 'inbound')
      .single()

    if (fetchError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    // End the call via Twilio (this will send to voicemail if configured)
    if (call.twilio_sid) {
      await endCall(call.twilio_sid)
    }

    // Update the database
    await supabase
      .from('communications')
      .update({ twilio_status: 'no-answer' })
      .eq('id', id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error declining call:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
