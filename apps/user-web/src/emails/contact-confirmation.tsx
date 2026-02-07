import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Preview,
  Font,
} from '@react-email/components';

type ContactReason = 'general' | 'sales' | 'partnership' | 'support';

interface ContactConfirmationEmailProps {
  name: string;
  reason: ContactReason;
  message: string;
}

const reasonLabels: Record<ContactReason, string> = {
  general: 'General Inquiry',
  sales: 'Sales',
  partnership: 'Partnership',
  support: 'Support',
};

export function ContactConfirmationEmail({
  name,
  reason,
  message,
}: ContactConfirmationEmailProps) {
  const firstName = name.split(' ')[0] || 'there';
  const reasonLabel = reasonLabels[reason];
  const messageSnippet = message.length > 200 ? message.slice(0, 200) + '...' : message;

  return (
    <Html>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>Thanks for reaching out to DreamTeam</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Greeting */}
          <Section style={header}>
            <Text style={greeting}>Hi {firstName},</Text>
          </Section>

          {/* Body */}
          <Section style={messageSection}>
            <Text style={bodyText}>
              Thanks for getting in touch! We received your message and will get back to you within 24 hours.
            </Text>
          </Section>

          {/* Summary card */}
          <Section style={summaryCard}>
            <Text style={summaryLabel}>Reason</Text>
            <Text style={summaryValue}>{reasonLabel}</Text>

            <Text style={{ ...summaryLabel, marginTop: '16px' }}>Your Message</Text>
            <Text style={summaryMessage}>{messageSnippet}</Text>
          </Section>

          <Hr style={divider} />

          {/* Sign-off */}
          <Section style={footer}>
            <Text style={footerSignature}>
              — The DreamTeam Team
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f4f4f5',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  padding: '40px 0',
};

const container = {
  margin: '0 auto',
  padding: '32px',
  maxWidth: '600px',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
};

const header = {
  marginBottom: '8px',
};

const greeting = {
  color: '#18181b',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0',
};

const messageSection = {
  marginBottom: '24px',
};

const bodyText = {
  color: '#3f3f46',
  fontSize: '15px',
  lineHeight: '1.7',
  margin: '0',
};

const summaryCard = {
  backgroundColor: '#fafafa',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '24px',
};

const summaryLabel = {
  color: '#71717a',
  fontSize: '12px',
  fontWeight: '500',
  margin: '0 0 4px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const summaryValue = {
  color: '#18181b',
  fontSize: '15px',
  fontWeight: '500',
  margin: '0',
};

const summaryMessage = {
  color: '#3f3f46',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
};

const divider = {
  borderColor: '#e4e4e7',
  margin: '24px 0',
};

const footer = {
  textAlign: 'center' as const,
};

const footerSignature = {
  color: '#a1a1aa',
  fontSize: '13px',
  margin: '0',
};

export default ContactConfirmationEmail;
