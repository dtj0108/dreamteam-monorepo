import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, ContactInquiryEmail, ContactConfirmationEmail } from '@/emails';

type ContactReason = 'general' | 'sales' | 'partnership' | 'support';

interface ContactRequestBody {
  reason: ContactReason;
  name: string;
  email: string;
  company?: string;
  message: string;
}

const REASON_LABELS: Record<ContactReason, string> = {
  general: 'General Inquiry',
  sales: 'Sales',
  partnership: 'Partnership',
  support: 'Support',
};

export async function POST(request: NextRequest) {
  try {
    const body: ContactRequestBody = await request.json();

    if (!body.reason || !['general', 'sales', 'partnership', 'support'].includes(body.reason)) {
      return NextResponse.json(
        { error: 'Please select a reason for contacting us.' },
        { status: 400 }
      );
    }

    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required.' },
        { status: 400 }
      );
    }

    if (!body.email || body.email.trim().length === 0) {
      return NextResponse.json(
        { error: 'Email is required.' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email.trim())) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (!body.message || body.message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required.' },
        { status: 400 }
      );
    }

    const reasonLabel = REASON_LABELS[body.reason];
    const timestamp = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    // Send internal notification to the team
    await sendEmail({
      to: 'hello@dreamteam.ai',
      subject: `[Contact - ${reasonLabel}] ${body.name}${body.company ? ` (${body.company})` : ''}`,
      react: ContactInquiryEmail({
        reason: body.reason,
        name: body.name.trim(),
        email: body.email.trim(),
        company: body.company?.trim() || undefined,
        message: body.message.trim(),
        timestamp,
      }),
    });

    // Send confirmation email to the submitter (non-blocking)
    try {
      await sendEmail({
        to: body.email.trim(),
        subject: 'Thanks for reaching out to DreamTeam',
        react: ContactConfirmationEmail({
          name: body.name.trim(),
          reason: body.reason,
          message: body.message.trim(),
        }),
      });
    } catch (confirmError) {
      console.error('Failed to send contact confirmation email:', confirmError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send contact message:', error);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}
