import { NextRequest, NextResponse } from 'next/server'
import { sendVerificationCode } from '@/lib/twilio'
import { checkRateLimit, getRateLimitHeaders } from '@dreamteam/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone } = body

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+[1-9]\d{1,14}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)' },
        { status: 400 }
      )
    }

    // Per-phone rate limit: 3 sends per 10 minutes
    const phoneLimit = checkRateLimit(phone, {
      windowMs: 10 * 60 * 1000,
      maxRequests: 3,
      keyPrefix: 'otp-send-phone',
    })
    if (!phoneLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(phoneLimit) }
      )
    }

    // Per-IP rate limit: 10 sends per 10 minutes
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const ipLimit = checkRateLimit(clientIp, {
      windowMs: 10 * 60 * 1000,
      maxRequests: 10,
      keyPrefix: 'otp-send-ip',
    })
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(ipLimit) }
      )
    }

    const result = await sendVerificationCode(phone)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send verification code' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Verification code sent' })
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
