import { NextRequest, NextResponse } from 'next/server'
import { validateTwilioWebhook, VoiceResponse } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const params = Object.fromEntries(formData.entries()) as Record<string, string>

    // Validate Twilio signature in production
    if (process.env.NODE_ENV === 'production') {
      const signature = request.headers.get('x-twilio-signature') || ''
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/outbound`

      if (!validateTwilioWebhook(url, params, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    }

    const { To, From } = params

    // Generate TwiML to connect the outbound call
    const twiml = new VoiceResponse()

    // Dial the destination number
    const dial = twiml.dial({
      callerId: From,
      record: 'record-from-answer-dual',
      recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/recording`,
      recordingStatusCallbackEvent: ['completed'],
    })
    dial.number(To)

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (error) {
    console.error('Error handling outbound call TwiML:', error)
    const twiml = new VoiceResponse()
    twiml.say('Sorry, we could not connect your call. Please try again later.')
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}
