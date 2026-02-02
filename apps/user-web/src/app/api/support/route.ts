import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@dreamteam/database/server';
import { sendEmail, SupportRequestEmail, SupportConfirmationEmail } from '@/emails';

type Urgency = 'low' | 'medium' | 'high';

interface SupportRequestBody {
  type: 'bug' | 'support' | 'feature';
  subject: string;
  message: string;
  source: 'user-web' | 'admin';
  urgency: Urgency;
}

export async function POST(request: NextRequest) {
  try {
    // Get the user session
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body: SupportRequestBody = await request.json();

    if (!body.type || !['bug', 'support', 'feature'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid request type. Must be "bug", "support", or "feature".' },
        { status: 400 }
      );
    }

    if (!body.subject || body.subject.trim().length === 0) {
      return NextResponse.json(
        { error: 'Subject is required.' },
        { status: 400 }
      );
    }

    if (!body.message || body.message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required.' },
        { status: 400 }
      );
    }

    if (!body.source || !['user-web', 'admin'].includes(body.source)) {
      return NextResponse.json(
        { error: 'Invalid source. Must be "user-web" or "admin".' },
        { status: 400 }
      );
    }

    if (!body.urgency || !['low', 'medium', 'high'].includes(body.urgency)) {
      return NextResponse.json(
        { error: 'Invalid urgency. Must be "low", "medium", or "high".' },
        { status: 400 }
      );
    }

    // Get user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const userName = profile?.full_name || user.email?.split('@')[0] || 'Unknown User';
    const userEmail = user.email || 'No email provided';

    // Format timestamp
    const timestamp = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    // Send emails using Resend
    const typeLabel = body.type === 'bug' ? 'Bug Report' : body.type === 'feature' ? 'Feature Request' : 'Support Request';
    const urgencyLabel = body.urgency.charAt(0).toUpperCase() + body.urgency.slice(1);

    // Send internal support email
    await sendEmail({
      to: 'hello@dreamteam.ai',
      subject: `[${typeLabel}] [${urgencyLabel}] ${body.subject}`,
      react: SupportRequestEmail({
        type: body.type,
        userName,
        userEmail,
        subject: body.subject,
        message: body.message,
        source: body.source,
        timestamp,
        urgency: body.urgency,
      }),
    });

    // Send confirmation email to user (non-blocking - don't fail if this errors)
    // Note: When using Resend's test domain, confirmation emails only work for the account owner
    try {
      await sendEmail({
        to: userEmail,
        subject: `We got your message! - ${body.subject}`,
        react: SupportConfirmationEmail({
          type: body.type,
          userName,
          subject: body.subject,
          urgency: body.urgency,
        }),
      });
    } catch (confirmationError) {
      // Log but don't fail - the support request was already received
      console.warn('Failed to send confirmation email (support request still received):', confirmationError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send support request:', error);
    return NextResponse.json(
      { error: 'Failed to send support request. Please try again.' },
      { status: 500 }
    );
  }
}
