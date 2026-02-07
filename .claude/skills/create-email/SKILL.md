---
name: create-email
description: Create a new React Email template and upload it to Resend. Use when the user wants to create, design, or build a new email template.
argument-hint: [description of the email]
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Create Email Template

Create a new email template for the DreamTeam project and upload it to Resend.

## Step 1: Understand the Request

The user wants to create an email described as: **$ARGUMENTS**

If no description was provided, ask the user what kind of email they want to create.

## Step 2: Study Existing Patterns

Read 1-2 existing email templates to match the established style:

- `apps/user-web/src/emails/landing-page-email.tsx` — narrative marketing email
- `apps/user-web/src/emails/marketing-outreach.tsx` — shorter outreach email
- `apps/user-web/src/emails/contact-confirmation.tsx` — transactional confirmation

Match these conventions:
- **Imports**: `@react-email/components` (Html, Head, Body, Container, Section, Text, Button, Hr, Link, Preview, Font)
- **Font**: Inter via Google Fonts woff2, Helvetica fallback
- **Container**: 600px max-width, 40px 20px padding
- **Style tokens**:
  - Heading: `#18181b`
  - Body: `#3f3f46`
  - Muted: `#71717a`
  - Faint: `#a1a1aa`
  - Accent blue: `#2563eb`
  - Card bg: `#fafafa`
  - Border: `#e4e4e7`
  - Button: `#2563eb` bg, white text, 8px radius, 14px 32px padding
- **Named export** + **default export** of the component
- **Props interface** with optional fields (e.g., `recipientName?`, `companyName?`)
- **Styles as `const` objects** at the bottom of the file (not inline), using `as const` for literal types like `textAlign`

## Step 3: Write the Email Template

Create the file at `apps/user-web/src/emails/<kebab-case-name>.tsx`.

Design guidelines:
- Keep it **single-column** — emails render best without complex grids
- Use `<table>` for any side-by-side layout (not flexbox/grid)
- Prefer `<Text>` over `<p>`, `<Button>` over `<a>`, `<Hr>` over `<hr>`
- Always include a `<Preview>` tag for inbox preview text
- Always include the Inter `<Font>` in `<Head>`
- Include a "DreamTeam" logo text in the header
- Include a minimal footer with copyright and "Questions? Just reply — a human will get back to you."
- Keep total line count reasonable (~200-500 lines)

## Step 4: Register in index.ts

Read `apps/user-web/src/emails/index.ts` and add:

1. An export for the new component (with the other email template exports)
2. A `send<TemplateName>Email` function following the existing pattern

## Step 5: Type-check

Run: `cd apps/user-web && npx tsc --noEmit 2>&1 | grep -i "<filename>"`

Filter for just the new file. Fix any errors before proceeding.

## Step 6: Upload to Resend

Run the upload. Since the upload script creates new templates each run, instead run a targeted upload:

```bash
cd apps/user-web && export $(grep RESEND_API_KEY .env.local | xargs) && npx tsx -e "
import { render } from '@react-email/render';
import { <ComponentName> } from './src/emails/<filename>';

async function upload() {
  const html = await render(<ComponentName>({}));
  const res = await fetch('https://api.resend.com/templates', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: '<kebab-case-name>',
      subject: '<subject line>',
      html,
    }),
  });
  const data = await res.json();
  console.log(res.ok ? '✅ Created:' : '❌ Error:', JSON.stringify(data, null, 2));
}
upload();
"
```

## Step 7: Report Results

Tell the user:
- The file that was created
- The Resend template ID
- The subject line
- Suggest they preview it in the Resend dashboard
