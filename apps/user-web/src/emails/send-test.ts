/**
 * Send a test email with the agents intro template
 *
 * Usage:
 *   RESEND_API_KEY=re_xxx npx tsx apps/user-web/src/emails/send-test.ts your@email.com
 */

import { Resend } from 'resend';
import { render } from '@react-email/render';
import * as fs from 'fs';
import * as path from 'path';
import { AgentsIntroEmail } from './agents-intro';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTestEmail() {
  const toEmail = process.argv[2];

  if (!toEmail) {
    console.error('Usage: npx tsx send-test.ts <email@example.com>');
    process.exit(1);
  }

  console.log(`📧 Sending test email to ${toEmail}...\n`);

  // Load the AI sphere image as base64
  const imagePath = path.join(__dirname, '../../../public/emails/ai-sphere.png');
  const aiSphereBase64 = fs.readFileSync(imagePath).toString('base64');

  // Render the React component
  const html = await render(AgentsIntroEmail({ name: 'Drew', workspaceName: 'Acme Corp' }));

  try {
    const { data, error } = await resend.emails.send({
      from: 'DreamTeam <onboarding@resend.dev>', // Use Resend's test domain
      to: toEmail,
      subject: 'Meet your new AI team members',
      html: html,
      attachments: [
        {
          content: aiSphereBase64,
          filename: 'ai-sphere.png',
          contentId: 'ai-sphere-image',
        },
      ],
    });

    if (error) {
      console.error('❌ Failed to send:', error);
      process.exit(1);
    }

    console.log('✅ Email sent successfully!');
    console.log(`   ID: ${data?.id}`);
    console.log(`   To: ${toEmail}`);
    console.log('\n📬 Check your inbox!');
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

sendTestEmail();
