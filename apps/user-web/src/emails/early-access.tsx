import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Preview,
  Font,
} from '@react-email/components';

interface EarlyAccessEmailProps {
  email: string;
}

export function EarlyAccessEmail({ email }: EarlyAccessEmailProps) {
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
      <Preview>You're on the early access list for the DreamTeam mobile app!</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logoText}>DreamTeam</Text>
          </Section>

          <Hr style={divider} />

          {/* Hero */}
          <Section style={heroSection}>
            <Text style={heroEmoji}>📱</Text>
            <Text style={heroTitle}>You're on the list!</Text>
          </Section>

          {/* Message */}
          <Section style={messageSection}>
            <Text style={messageText}>
              Thanks for signing up for early access to the DreamTeam mobile app.
              We'll be in touch with an early access link when it's ready.
            </Text>
          </Section>

          {/* CTA Button */}
          <Section style={ctaSection}>
            <Button
              style={ctaButton}
              href={process.env.NEXT_PUBLIC_APP_URL || 'https://app.dreamteam.ai'}
            >
              Back to DreamTeam
            </Button>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this email because you signed up for early access at {email}.
            </Text>
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
  textAlign: 'center' as const,
  marginBottom: '8px',
};

const logoText = {
  color: '#18181b',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0',
};

const divider = {
  borderColor: '#e4e4e7',
  margin: '24px 0',
};

const heroSection = {
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const heroEmoji = {
  fontSize: '64px',
  margin: '0 0 16px 0',
};

const heroTitle = {
  color: '#18181b',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0',
};

const messageSection = {
  marginBottom: '32px',
};

const messageText = {
  color: '#3f3f46',
  fontSize: '16px',
  lineHeight: '1.7',
  margin: '0',
  textAlign: 'center' as const,
};

const ctaSection = {
  textAlign: 'center' as const,
  marginBottom: '8px',
};

const ctaButton = {
  backgroundColor: '#18181b',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const footer = {
  textAlign: 'center' as const,
};

const footerText = {
  color: '#71717a',
  fontSize: '13px',
  margin: '0 0 12px 0',
};

const footerSignature = {
  color: '#a1a1aa',
  fontSize: '13px',
  margin: '0',
};

export default EarlyAccessEmail;
