import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { validateTwilioWebhook, downloadRecording } from '@/lib/twilio'
import { fireWebhooks } from "@/lib/make-webhooks"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const params = Object.fromEntries(formData.entries()) as Record<string, string>

    // Validate Twilio signature in production
    if (process.env.NODE_ENV === 'production') {
      const signature = request.headers.get('x-twilio-signature') || ''
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/recording`

      if (!validateTwilioWebhook(url, params, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    }

    const {
      CallSid,
      RecordingSid,
      RecordingUrl,
      RecordingDuration,
      RecordingStatus,
    } = params

    // Only process completed recordings
    if (RecordingStatus !== 'completed') {
      return NextResponse.json({ success: true })
    }

    const supabase = createAdminClient()

    // Find the communication record
    const { data: communication } = await supabase
      .from('communications')
      .select('id, user_id')
      .eq('twilio_sid', CallSid)
      .single()

    if (!communication) {
      console.error('Communication not found for CallSid:', CallSid)
      return NextResponse.json({ error: 'Communication not found' }, { status: 404 })
    }

    // Update communication with recording info
    await supabase
      .from('communications')
      .update({
        recording_url: RecordingUrl,
        recording_sid: RecordingSid,
        duration_seconds: parseInt(RecordingDuration),
      })
      .eq('id', communication.id)

    // Download and store recording in Supabase storage
    let storagePath: string | null = null
    const audioBuffer = await downloadRecording(RecordingSid)

    if (audioBuffer) {
      const filePath = `recordings/${communication.user_id}/${RecordingSid}.mp3`

      const { error: uploadError } = await supabase.storage
        .from('call-recordings')
        .upload(filePath, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        })

      if (!uploadError) {
        storagePath = filePath
      } else {
        console.error('Failed to upload recording:', uploadError)
      }
    }

    // Create recording record
    await supabase.from('call_recordings').insert({
      communication_id: communication.id,
      twilio_recording_sid: RecordingSid,
      twilio_recording_url: RecordingUrl,
      storage_path: storagePath,
      duration_seconds: parseInt(RecordingDuration),
    })

    // Fire webhook for Make.com integrations
    const { data: profile } = await supabase
      .from("profiles")
      .select("default_workspace_id")
      .eq("id", communication.user_id)
      .single()

    if (profile?.default_workspace_id) {
      fireWebhooks("call.recording_ready", {
        communication_id: communication.id,
        recording_sid: RecordingSid,
        recording_url: RecordingUrl,
        duration_seconds: parseInt(RecordingDuration),
        storage_path: storagePath,
      }, profile.default_workspace_id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error handling recording callback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
