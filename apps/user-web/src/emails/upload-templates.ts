/**
 * Script to upload email templates to Resend
 *
 * Usage:
 *   npx tsx apps/user-web/src/emails/upload-templates.ts
 *
 * Requires RESEND_API_KEY in environment
 */

import { render } from '@react-email/render';
import { AgentsIntroEmail } from './agents-intro';
import { MarketingOutreachEmail } from './marketing-outreach';
import { LandingPageEmail } from './landing-page-email';

const RESEND_API = 'https://api.resend.com';
const RATE_LIMIT_DELAY = 1500; // ms between API calls to avoid 429s

const AGENTS_INTRO_TEMPLATE_ID = 'f2e13e9a-a4fa-4bf8-a9bb-dcc3a1d71403';

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function updateTemplate(id: string, name: string, subject: string, html: string) {
  const response = await fetch(`${RESEND_API}/templates/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ name, subject, html }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update template "${name}": ${JSON.stringify(error)}`);
  }

  console.log(`   Updated: ${name} (${id})`);

  // Rate limit pause before publish
  await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY));

  // Publish so changes take effect
  const publishResponse = await fetch(`${RESEND_API}/templates/${id}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  });

  if (publishResponse.ok) {
    console.log(`   Published: ${name}`);
  } else {
    console.log(`   ⚠️  Updated but not published — publish manually in Resend dashboard.`);
  }
}

async function createTemplate(name: string, subject: string, html: string): Promise<string> {
  const response = await fetch(`${RESEND_API}/templates`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name, subject, html }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create template "${name}": ${JSON.stringify(error)}`);
  }

  const { id } = (await response.json()) as { id: string };
  console.log(`   Created: ${name} (${id})`);
  return id;
}

async function uploadTemplates() {
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY environment variable is not set');
    process.exit(1);
  }

  console.log('📧 Uploading email templates to Resend...\n');

  try {
    // 1. Agents Intro — update existing template
    console.log('1/3 agents-intro');
    const agentsIntroHtml = await render(AgentsIntroEmail());
    await updateTemplate(
      AGENTS_INTRO_TEMPLATE_ID,
      'agents-intro',
      'Meet your new AI team members',
      agentsIntroHtml,
    );

    // Rate limit pause between templates
    await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY));

    // 2. Marketing Outreach — create new (or update if ID is set)
    console.log('\n2/3 marketing-outreach');
    const marketingHtml = await render(MarketingOutreachEmail({}));
    const marketingId = await createTemplate(
      'marketing-outreach',
      'AI agents that actually work',
      marketingHtml,
    );

    // Rate limit pause between templates
    await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY));

    // 3. Landing Page Email — create new
    console.log('\n3/3 landing-page-email');
    const landingPageHtml = await render(LandingPageEmail({}));
    const landingPageId = await createTemplate(
      'landing-page-email',
      'What happened while you slept',
      landingPageHtml,
    );

    console.log('\n✅ All templates uploaded!');
    console.log(`\n📝 Marketing outreach template ID: ${marketingId}`);
    console.log('   Save this ID if you want to update it in the future.');
    console.log(`\n📝 Landing page email template ID: ${landingPageId}`);
    console.log('   Save this ID if you want to update it in the future.');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

uploadTemplates();
