import { NextResponse } from 'next/server'
import { getSession } from '@dreamteam/auth/session'
import { generateVoiceAccessToken } from '@/lib/twilio'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate a token with the user's ID as the identity
    const result = generateVoiceAccessToken(session.id)


    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate token' },
        { status: 500 }
      )
    }

    return NextResponse.json({ token: result.token })
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8)
    console.error(`[twilio/token] Error [${errorId}]:`, error)
    return NextResponse.json({ error: 'Internal server error', errorId }, { status: 500 })
  }
}
