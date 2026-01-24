import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@dreamteam/database/server'
import { sendVerificationCode } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Sign in with Supabase Auth
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    })

    if (signInError) {
      console.error('Login error:', signInError)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Get user profile to get phone number
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, phone, pending_2fa')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile?.phone) {
      return NextResponse.json(
        { error: 'User profile not found. Please contact support.' },
        { status: 500 }
      )
    }

    // Mark user as pending 2FA
    await supabase
      .from('profiles')
      .update({ pending_2fa: true })
      .eq('id', authData.user.id)

    // Send 2FA code to phone
    const otpResult = await sendVerificationCode(profile.phone)

    if (!otpResult.success) {
      console.error('Failed to send OTP:', otpResult.error)
      return NextResponse.json(
        { error: 'Failed to send verification code. Please try again.' },
        { status: 500 }
      )
    }

    // Return user info for 2FA verification
    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your phone',
      userId: authData.user.id,
      phone: profile.phone,
      name: profile.name,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
