import { NextRequest, NextResponse } from 'next/server'
import { validateTwilioWebhook, VoiceResponse } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const params = Object.fromEntries(formData.entries()) as Record<string, string>

    // Validate Twilio signature in production
    if (process.env.NODE_ENV === 'production') {
      const signature = request.headers.get('x-twilio-signature') || ''
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/fallback`

      if (!validateTwilioWebhook(url, params, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    }

    const { DialCallStatus } = params

    // Generate TwiML response
    const twiml = new VoiceResponse()

    // If call wasn't answered, go to voicemail
    if (DialCallStatus !== 'completed') {
      twiml.say({
        voice: 'Polly.Amy',
      }, 'Sorry, we could not connect you. Please leave a message after the beep.')

      twiml.record({
        maxLength: 120,
        recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/recording`,
        recordingStatusCallbackEvent: ['completed'],
      })

      twiml.say('We did not receive a recording. Goodbye.')
    }

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (error) {
    console.error('Error handling voice fallback:', error)
    const twiml = new VoiceResponse()
    twiml.say('Sorry, an error occurred. Goodbye.')
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}
