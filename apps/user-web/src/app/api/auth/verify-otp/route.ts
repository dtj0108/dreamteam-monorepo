import { NextRequest, NextResponse } from 'next/server'
import { verifyCode } from '@/lib/twilio'
import { createServerSupabaseClient, createAdminClient } from '@dreamteam/database/server'
import { checkRateLimit, getRateLimitHeaders } from '@dreamteam/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, code, isSignup } = body

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Phone number and code are required' },
        { status: 400 }
      )
    }

    // Per-phone rate limit: 5 attempts per 10 minutes
    const phoneLimit = checkRateLimit(phone, {
      windowMs: 10 * 60 * 1000,
      maxRequests: 5,
      keyPrefix: 'otp-verify-phone',
    })
    if (!phoneLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(phoneLimit) }
      )
    }

    // Per-IP rate limit: 15 attempts per 10 minutes
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const ipLimit = checkRateLimit(clientIp, {
      windowMs: 10 * 60 * 1000,
      maxRequests: 15,
      keyPrefix: 'otp-verify-ip',
    })
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(ipLimit) }
      )
    }

    // Verify the OTP code with Twilio
    const verifyResult = await verifyCode(phone, code)

    if (!verifyResult.success) {
      return NextResponse.json(
        { error: verifyResult.error || 'Invalid verification code' },
        { status: 401 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const adminSupabase = createAdminClient()

    // Try to get current user from Supabase Auth session
    const { data: { user } } = await supabase.auth.getUser()

    let profile

    if (user) {
      // User has active session - verify phone matches
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email, phone')
        .eq('id', user.id)
        .single()

      if (profileError || !profileData) {
        return NextResponse.json(
          { error: 'User profile not found.' },
          { status: 404 }
        )
      }

      if (profileData.phone !== phone) {
        return NextResponse.json(
          { error: 'Phone number does not match.' },
          { status: 400 }
        )
      }

      profile = profileData
    } else {
      // No active session - look up user by phone number
      // This handles the case where session cookies weren't properly set
      const { data: profileData } = await adminSupabase
        .from('profiles')
        .select('id, name, email, phone')
        .eq('phone', phone)
        .single()

      if (!profileData) {
        // Return same error as wrong code to prevent phone enumeration
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 401 }
        )
      }

      profile = profileData

      // Sign in the user using their auth.users record
      // We need to create a session for them
      const { data: authUser } = await adminSupabase.auth.admin.getUserById(profile.id)

      if (!authUser.user) {
        // Return same error as wrong code to prevent phone enumeration
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 401 }
        )
      }
    }

    // Mark 2FA as complete and phone as verified using admin client
    const { error: updateError } = await adminSupabase
      .from('profiles')
      .update({
        pending_2fa: false,
        phone_verified: true
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('Failed to update profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to complete verification.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: isSignup ? 'Account verified successfully' : 'Logged in successfully',
      user: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
      }
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
