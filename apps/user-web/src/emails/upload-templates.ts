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

const TEMPLATE_ID = 'f2e13e9a-a4fa-4bf8-a9bb-dcc3a1d71403'; // Existing template ID

async function uploadTemplates() {
  console.log('📧 Updating email template in Resend...\n');

  // Render the React component to HTML
  const html = await render(AgentsIntroEmail());

  try {
    // Update the existing template via Resend API
    const response = await fetch(`https://api.resend.com/templates/${TEMPLATE_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'agents-intro',
        subject: 'Meet your new AI team members',
        html: html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to update template: ${JSON.stringify(error)}`);
    }

    const template = await response.json();
    console.log('✅ Template updated successfully!');
    console.log(`   ID: ${TEMPLATE_ID}`);
    console.log(`   Name: agents-intro`);

    // Publish the template so changes take effect
    console.log('\n📤 Publishing template...');

    const publishResponse = await fetch(`https://api.resend.com/templates/${TEMPLATE_ID}/publish`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
    });

    if (publishResponse.ok) {
      console.log('✅ Template published and ready to use!');
    } else {
      console.log('⚠️  Template updated but not published. Publish manually in Resend dashboard.');
    }

    console.log('\n📝 To send with inline image:\n');
    console.log(`   await resend.emails.send({`);
    console.log(`     from: 'DreamTeam <hello@dreamteam.com>',`);
    console.log(`     to: 'user@example.com',`);
    console.log(`     template_id: '${TEMPLATE_ID}',`);
    console.log(`     template_data: { name: 'Drew', workspaceName: 'Acme Corp' },`);
    console.log(`     attachments: [{`);
    console.log(`       content: aiSphereBase64,`);
    console.log(`       filename: 'ai-sphere.png',`);
    console.log(`       contentId: 'ai-sphere-image',`);
    console.log(`     }],`);
    console.log(`   });`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

uploadTemplates();
