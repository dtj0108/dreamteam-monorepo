import { NextResponse } from 'next/server'
import { getSession } from '@dreamteam/auth/session'
import { generateVoiceAccessToken } from '@/lib/twilio'

export async function GET() {
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/f4f05322-bb7d-4d7a-b25d-8aaed8531e84',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/twilio/token:GET:entry',message:'Token API called',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate a token with the user's ID as the identity
    const result = generateVoiceAccessToken(session.id)

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/f4f05322-bb7d-4d7a-b25d-8aaed8531e84',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/twilio/token:GET:result',message:'Token generation result',data:{success:result.success,hasToken:!!result.token,error:result.error||null,tokenLength:result.token?.length||0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H3'})}).catch(()=>{});
    // #endregion

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
