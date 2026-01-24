import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getSession } from '@dreamteam/auth/session'

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

    // Verify the call belongs to this user and is ringing
    const { data: call, error: fetchError } = await supabase
      .from('communications')
      .select('id, twilio_sid, twilio_status')
      .eq('id', id)
      .eq('user_id', session.id)
      .eq('type', 'call')
      .eq('direction', 'inbound')
      .single()

    if (fetchError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    if (call.twilio_status !== 'ringing') {
      return NextResponse.json(
        { error: 'Call is no longer ringing' },
        { status: 400 }
      )
    }

    // Update the call status to accepted
    // Note: In a full implementation, this would also trigger Twilio
    // to route the call to the user's browser via Twilio Client SDK
    await supabase
      .from('communications')
      .update({
        twilio_status: 'in-progress',
        answered_at: new Date().toISOString(),
      })
      .eq('id', id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error accepting call:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
