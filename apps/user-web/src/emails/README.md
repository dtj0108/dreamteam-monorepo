# Email Templates

This directory contains email templates built with [React Email](https://react.email) and sent via [Resend](https://resend.com).

## Stack

- **React Email** — Build emails as React components
- **Resend** — Email delivery API
- **Supabase Storage** — Image hosting for emails

## File Structure

```
emails/
├── README.md              # This file
├── index.ts               # Send functions & exports
├── agents-intro.tsx       # Agents introduction email
├── upload-templates.ts    # Script to push templates to Resend
├── upload-image.ts        # Script to upload images to Supabase
└── send-test.ts           # Script to send test emails
```

## Creating a New Email

### 1. Create the template

```tsx
// emails/welcome.tsx
import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Img,
  Preview,
} from '@react-email/components';

export function WelcomeEmail() {
  return (
    <Html>
      <Head />
      <Preview>Welcome to DreamTeam</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>Welcome!</Text>
          <Text style={paragraph}>
            We're excited to have you.
          </Text>
          <Button style={button} href="https://app.dreamteam.com">
            Get Started
          </Button>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, -apple-system, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
};

const heading = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#18181b',
};

const paragraph = {
  fontSize: '16px',
  color: '#3f3f46',
  lineHeight: '1.6',
};

const button = {
  backgroundColor: '#18181b',
  borderRadius: '8px',
  color: '#ffffff',
  padding: '12px 24px',
  textDecoration: 'none',
};

export default WelcomeEmail;
```

### 2. Add a send function

```tsx
// emails/index.ts
export async function sendWelcomeEmail(to: string) {
  const { WelcomeEmail } = await import('./welcome');

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Welcome to DreamTeam',
    react: WelcomeEmail(),
  });

  if (error) throw error;
  return data;
}
```

### 3. Use it in your app

```tsx
import { sendWelcomeEmail } from '@/emails';

// In an API route or server action
await sendWelcomeEmail('user@example.com');
```

## Adding Images

### Option 1: Hosted URL (recommended)

Upload images to Supabase Storage:

```bash
# Add your image to public/emails/
cp my-image.png apps/user-web/public/emails/

# Run the upload script
npx tsx apps/user-web/src/emails/upload-image.ts
```

Then use the URL in your template:

```tsx
<Img
  src="https://gfxwgzanzcdvhnenansu.supabase.co/storage/v1/object/public/email-assets/my-image.png"
  alt="Description"
  width="200"
/>
```

### Option 2: Inline attachment (CID)

For images that should travel with the email:

```tsx
// In your send function
await resend.emails.send({
  from: FROM_EMAIL,
  to,
  subject: 'Subject',
  react: MyEmail(),
  attachments: [{
    content: fs.readFileSync('path/to/image.png').toString('base64'),
    filename: 'image.png',
    contentId: 'my-image',
  }],
});

// In your template
<Img src="cid:my-image" alt="Description" />
```

> **Note:** CID images won't show in Resend's dashboard preview, only in actual sent emails.

## Uploading to Resend Templates

If you want the template stored in Resend's dashboard:

```bash
# Set your API key
export RESEND_API_KEY=re_xxxxx

# Run the upload script
npx tsx apps/user-web/src/emails/upload-templates.ts
```

## Testing Emails

### Preview locally

```bash
npx email dev --dir apps/user-web/src/emails
```

### Send a test email

```bash
RESEND_API_KEY=re_xxxxx npx tsx apps/user-web/src/emails/send-test.ts your@email.com
```

## Environment Variables

```env
# Required
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Optional (defaults shown)
RESEND_FROM_EMAIL=DreamTeam <hello@dreamteam.com>
```

## Styling Tips

1. **Use inline styles** — Email clients don't support external CSS
2. **Use tables for layout** — Flexbox/Grid don't work reliably
3. **Keep it simple** — Not all CSS properties work in email
4. **Test across clients** — Gmail, Outlook, Apple Mail all render differently

### Safe CSS Properties

```
✅ background-color, color, font-family, font-size, font-weight
✅ padding, margin, border, border-radius
✅ text-align, line-height, text-decoration
✅ width, height, max-width

❌ flexbox, grid, position, transform
❌ box-shadow (limited support)
❌ custom fonts (use web-safe fallbacks)
```

## Current Templates

| Template | Description | Send Function |
|----------|-------------|---------------|
| `agents-intro` | Introduces AI agents to new users | `sendAgentsIntroEmail(to)` |

## Resources

- [React Email Docs](https://react.email/docs)
- [Resend Docs](https://resend.com/docs)
- [Can I Email](https://www.caniemail.com/) — CSS support checker
