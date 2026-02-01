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
export { SupportRequestEmail } from './support-request';
export { SupportConfirmationEmail } from './support-confirmation';

// Sender configuration
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'DreamTeam <hello@dreamteam.com>';

// Generic send function
export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
}) {
  const { data, error } = await getResendClient().emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    react,
  });

  if (error) {
    console.error('Failed to send email:', error);
    throw error;
  }

  return data;
}
