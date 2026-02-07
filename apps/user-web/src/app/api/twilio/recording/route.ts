import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { validateTwilioWebhook, downloadRecording } from '@/lib/twilio'
import { fireWebhooks } from "@/lib/make-webhooks"
import { triggerVoicemailReceived, type Call, type Lead, type Contact } from '@/lib/workflow-trigger-service'

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

    // Trigger voicemail_received workflow
    // Fetch full communication details to get lead_id and contact_id
    const { data: fullComm } = await supabase
      .from('communications')
      .select('id, lead_id, contact_id, direction, twilio_status, from_number, to_number')
      .eq('id', communication.id)
      .single()

    if (fullComm) {
      const callData: Call = {
        id: fullComm.id,
        twilio_sid: CallSid,
        direction: fullComm.direction as 'inbound' | 'outbound',
        status: fullComm.twilio_status || 'completed',
        from_number: fullComm.from_number,
        to_number: fullComm.to_number,
        duration_seconds: parseInt(RecordingDuration),
        recording_url: RecordingUrl,
        recording_sid: RecordingSid,
      }

      let leadData: Lead | null = null
      let contactData: Contact | null = null

      if (fullComm.lead_id) {
        const { data: lead } = await supabase
          .from('leads')
          .select('id, name, status, notes, user_id, workspace_id')
          .eq('id', fullComm.lead_id)
          .single()
        leadData = lead as Lead | null
      }

      if (fullComm.contact_id) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email, phone')
          .eq('id', fullComm.contact_id)
          .single()
        contactData = contact as Contact | null
      }

      // Resolve workspace for workflow scoping
      let recordingWorkspaceId: string | undefined = leadData?.workspace_id || undefined
      if (!recordingWorkspaceId) {
        const { data: numLookup } = await supabase
          .from('twilio_numbers')
          .select('workspace_id')
          .or(`phone_number.eq.${fullComm.from_number},phone_number.eq.${fullComm.to_number}`)
          .limit(1)
          .single()
        recordingWorkspaceId = (numLookup?.workspace_id as string) || undefined
      }

      // Trigger voicemail workflow
      triggerVoicemailReceived(callData, leadData, contactData, communication.user_id, recordingWorkspaceId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8)
    console.error(`[twilio/recording] Error [${errorId}]:`, error)
    return NextResponse.json({ error: 'Internal server error', errorId }, { status: 500 })
  }
}
