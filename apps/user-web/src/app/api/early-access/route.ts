import { NextRequest, NextResponse } from 'next/server';
import { sendEarlyAccessEmail } from '@/emails';

interface EarlyAccessRequestBody {
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: EarlyAccessRequestBody = await request.json();

    // Validate email
    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required.' },
        { status: 400 }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format.' },
        { status: 400 }
      );
    }

    // Try to send confirmation email
    try {
      await sendEarlyAccessEmail(body.email);
      console.log('Early access email sent to:', body.email);
    } catch (emailError) {
      console.error('Failed to send early access email:', emailError);

      // In development, continue even if email fails
      if (process.env.NODE_ENV === 'development') {
        console.log('[DEV] Early access signup recorded (email skipped):', body.email);
      } else {
        throw emailError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Early access signup failed:', error);
    return NextResponse.json(
      { error: 'Failed to sign up for early access. Please try again.' },
      { status: 500 }
    );
  }
}
