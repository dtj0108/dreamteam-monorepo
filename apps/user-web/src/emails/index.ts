import { Resend } from 'resend';

// Lazy-initialize Resend client to avoid crashes when API key isn't set
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

// Email templates
export { AgentsIntroEmail } from './agents-intro';
export { SupportRequestEmail } from './support-request';
export { SupportConfirmationEmail } from './support-confirmation';
export { EarlyAccessEmail } from './early-access';
export { ContactInquiryEmail } from './contact-inquiry';
export { ContactConfirmationEmail } from './contact-confirmation';
export { MarketingOutreachEmail } from './marketing-outreach';
export { LandingPageEmail } from './landing-page-email';
export { AutonomousActionsEmail } from './autonomous-actions';
export { WorkspaceInviteEmail } from './workspace-invite';

// Sender configuration
// Use RESEND_FROM_EMAIL if set (should be verified domain like hello@dreamteam.ai)
// Falls back to Resend's test domain for development when no env var is set
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'DreamTeam <onboarding@resend.dev>';

// Template ID from Resend
const AGENTS_INTRO_TEMPLATE_ID = 'f2e13e9a-a4fa-4bf8-a9bb-dcc3a1d71403';

/**
 * Send the agents introduction email to a user
 */
export async function sendAgentsIntroEmail(to: string) {
  const { AgentsIntroEmail } = await import('./agents-intro');

  const { data, error } = await getResendClient().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Your AI team is ready',
    react: AgentsIntroEmail(),
  });

  if (error) {
    console.error('Failed to send agents intro email:', error);
    throw error;
  }

  return data;
}

/**
 * Send the early access confirmation email
 */
export async function sendEarlyAccessEmail(to: string) {
  const { EarlyAccessEmail } = await import('./early-access');

  return sendEmail({
    to,
    subject: "You're on the early access list!",
    react: EarlyAccessEmail({ email: to }),
  });
}

/**
 * Send the marketing outreach email
 */
export async function sendMarketingOutreachEmail(
  to: string | string[],
  options?: { recipientName?: string; companyName?: string }
) {
  const { MarketingOutreachEmail } = await import('./marketing-outreach');

  return sendEmail({
    to,
    subject: 'AI agents that actually work',
    react: MarketingOutreachEmail({
      recipientName: options?.recipientName,
      companyName: options?.companyName,
    }),
  });
}

/**
 * Send the landing page email
 */
export async function sendLandingPageEmail(
  to: string | string[],
  options?: { recipientName?: string; companyName?: string }
) {
  const { LandingPageEmail } = await import('./landing-page-email');

  return sendEmail({
    to,
    subject: 'What happened while you slept',
    react: LandingPageEmail({
      recipientName: options?.recipientName,
      companyName: options?.companyName,
    }),
  });
}

/**
 * Send the autonomous actions email
 */
export async function sendAutonomousActionsEmail(
  to: string | string[],
  options?: { recipientName?: string; companyName?: string }
) {
  const { AutonomousActionsEmail } = await import('./autonomous-actions');

  return sendEmail({
    to,
    subject: "Your agents don't wait for instructions",
    react: AutonomousActionsEmail({
      recipientName: options?.recipientName,
      companyName: options?.companyName,
    }),
  });
}

/**
 * Send a workspace invitation email
 */
export async function sendWorkspaceInviteEmail(
  to: string,
  options: {
    inviterName: string;
    workspaceName: string;
    role: string;
    inviteId: string;
  }
) {
  const { WorkspaceInviteEmail } = await import('./workspace-invite');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  const joinUrl = `${baseUrl}/workspaces/join?invite=${options.inviteId}`;

  return sendEmail({
    to,
    subject: `You've been invited to ${options.workspaceName} on DreamTeam`,
    react: WorkspaceInviteEmail({
      inviterName: options.inviterName,
      workspaceName: options.workspaceName,
      role: options.role,
      joinUrl,
    }),
  });
}

// Generic send function for flexibility
export async function sendEmail({
  to,
  subject,
  react,
  attachments,
}: {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  attachments?: Array<{
    content?: string;
    path?: string;
    filename: string;
    contentId?: string;
  }>;
}) {
  const { data, error } = await getResendClient().emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    react,
    attachments,
  });

  if (error) {
    console.error('Failed to send email:', error);
    throw error;
  }

  return data;
}
