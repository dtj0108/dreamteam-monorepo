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

    // Get recording with ownership check through communications
    const { data: recording, error } = await supabase
      .from('call_recordings')
      .select(`
        *,
        communication:communications!inner(user_id)
      `)
      .eq('id', id)
      .single()

    if (error || !recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 })
    }

    // Check ownership
    const comm = recording.communication as { user_id: string }
    if (comm.user_id !== session.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Generate signed URL for playback if stored in Supabase
    if (recording.storage_path) {
      const { data: signedUrl } = await supabase.storage
        .from('call-recordings')
        .createSignedUrl(recording.storage_path, 3600) // 1 hour expiry

      return NextResponse.json({
        ...recording,
        playback_url: signedUrl?.signedUrl,
      })
    }

    // Fall back to Twilio URL
    return NextResponse.json({
      ...recording,
      playback_url: recording.twilio_recording_url,
    })
  } catch (error) {
    console.error('Error fetching recording:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
