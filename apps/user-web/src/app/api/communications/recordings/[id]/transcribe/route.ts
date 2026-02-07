import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getSession } from '@dreamteam/auth/session'
import OpenAI from 'openai'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Transcription service not configured' },
        { status: 503 }
      )
    }

    const { id } = await params
    const supabase = createAdminClient()

    // Get recording with ownership check
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

    // Check if already transcribed
    if (recording.transcription) {
      return NextResponse.json({
        transcription: recording.transcription,
        status: 'completed',
      })
    }

    // Mark as processing
    await supabase
      .from('call_recordings')
      .update({ transcription_status: 'processing' })
      .eq('id', id)

    try {
      // Get the audio URL
      let audioUrl: string | null = null

      if (recording.storage_path) {
        const { data: signedUrl } = await supabase.storage
          .from('call-recordings')
          .createSignedUrl(recording.storage_path, 3600)
        audioUrl = signedUrl?.signedUrl || null
      }

      if (!audioUrl) {
        audioUrl = recording.twilio_recording_url
      }

      if (!audioUrl) {
        throw new Error('No audio URL available')
      }

      // Fetch the audio file
      const audioResponse = await fetch(audioUrl)
      if (!audioResponse.ok) {
        throw new Error('Failed to fetch audio file')
      }

      const audioBuffer = await audioResponse.arrayBuffer()
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' })

      // Create a File object for OpenAI
      const audioFile = new File([audioBlob], 'recording.wav', {
        type: 'audio/wav',
      })

      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })

      // Transcribe using Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en',
        response_format: 'text',
      })

      // Store the transcription
      const { error: updateError } = await supabase
        .from('call_recordings')
        .update({
          transcription: transcription,
          transcription_status: 'completed',
        })
        .eq('id', id)

      if (updateError) {
        console.error('Failed to save transcription:', updateError)
        throw new Error('Failed to save transcription')
      }

      return NextResponse.json({
        transcription: transcription,
        status: 'completed',
      })
    } catch (transcriptionError) {
      console.error('Transcription error:', transcriptionError)

      // Mark as failed
      await supabase
        .from('call_recordings')
        .update({ transcription_status: 'failed' })
        .eq('id', id)

      return NextResponse.json(
        {
          error: 'Transcription failed',
          details:
            transcriptionError instanceof Error
              ? transcriptionError.message
              : 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in transcription endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    // Get recording with ownership check
    const { data: recording, error } = await supabase
      .from('call_recordings')
      .select(`
        id,
        transcription,
        transcription_status,
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

    return NextResponse.json({
      transcription: recording.transcription,
      status: recording.transcription_status,
    })
  } catch (error) {
    console.error('Error fetching transcription:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
