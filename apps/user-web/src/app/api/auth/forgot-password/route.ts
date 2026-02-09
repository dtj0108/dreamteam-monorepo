import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { sendVerificationCode } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // Look up user by email in profiles
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('id, phone')
      .eq('email', email.toLowerCase())
      .single()

    if (profileError || !profile) {
      // Don't leak whether email exists — return generic success
      return NextResponse.json({
        success: true,
        message: 'If an account exists with that email, a verification code has been sent.',
      })
    }

    if (!profile.phone) {
      // User exists but has no phone — can't send OTP
      return NextResponse.json(
        { error: 'No phone number on file. Please contact support.' },
        { status: 400 }
      )
    }

    // Send OTP via Twilio Verify
    const result = await sendVerificationCode(profile.phone)

    if (!result.success) {
      console.error('Failed to send reset OTP:', result.error)
      return NextResponse.json(
        { error: 'Failed to send verification code. Please try again.' },
        { status: 500 }
      )
    }

    // Mask phone: show only last 4 digits
    const masked = '****' + profile.phone.slice(-4)

    return NextResponse.json({
      success: true,
      phone: masked,
      message: 'Verification code sent.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
