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

type Urgency = 'low' | 'medium' | 'high';

interface SupportConfirmationEmailProps {
  type: 'bug' | 'support' | 'feature';
  userName: string;
  subject: string;
  urgency: Urgency;
}

const urgencyConfig = {
  low: {
    label: 'Low',
    color: '#22c55e',
    responseTime: 'within 2-3 business days',
  },
  medium: {
    label: 'Medium',
    color: '#eab308',
    responseTime: 'within 24 hours',
  },
  high: {
    label: 'High',
    color: '#ef4444',
    responseTime: 'as soon as possible',
  },
};

export function SupportConfirmationEmail({
  type,
  userName,
  subject,
  urgency,
}: SupportConfirmationEmailProps) {
  const typeLabel = type === 'bug' ? 'Bug Report' : type === 'feature' ? 'Feature Request' : 'Support Request';
  const config = urgencyConfig[urgency];

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
      <Preview>We got your message! Help is on the way.</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with emoji */}
          <Section style={header}>
            <Text style={headerEmoji}>📬</Text>
            <Text style={headerTitle}>We got your message!</Text>
            <Text style={headerSubtitle}>
              Help is on the way, {userName.split(' ')[0] || 'there'}
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Confirmation message */}
          <Section style={messageSection}>
            <Text style={messageText}>
              Thank you for reaching out. We've received your {typeLabel.toLowerCase()} and
              our team is on it. Here's a quick summary of what you submitted:
            </Text>
          </Section>

          {/* Summary card */}
          <Section style={summaryCard}>
            <Text style={summaryLabel}>Type</Text>
            <Text style={summaryValue}>
              {type === 'bug' ? '🐛' : type === 'feature' ? '💡' : '💬'} {typeLabel}
            </Text>

            <Text style={{ ...summaryLabel, marginTop: '16px' }}>Subject</Text>
            <Text style={summaryValue}>{subject}</Text>

            <Text style={{ ...summaryLabel, marginTop: '16px' }}>Urgency</Text>
            <Text style={{ ...summaryValue, color: config.color }}>
              {config.label}
            </Text>
          </Section>

          {/* Response time expectation */}
          <Section style={responseSection}>
            <Text style={responseIcon}>⏱️</Text>
            <Text style={responseText}>
              Based on your urgency level, you can expect a response{' '}
              <strong>{config.responseTime}</strong>.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Need to add more details? Simply reply to this email.
            </Text>
            <Text style={footerSignature}>
              — The DreamTeam Support Team
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

const headerEmoji = {
  fontSize: '48px',
  margin: '0 0 16px 0',
};

const headerTitle = {
  color: '#18181b',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 8px 0',
};

const headerSubtitle = {
  color: '#71717a',
  fontSize: '16px',
  margin: '0',
};

const divider = {
  borderColor: '#e4e4e7',
  margin: '24px 0',
};

const messageSection = {
  marginBottom: '24px',
};

const messageText = {
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

const responseSection = {
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  padding: '16px 20px',
  textAlign: 'center' as const,
  marginBottom: '8px',
};

const responseIcon = {
  fontSize: '24px',
  margin: '0 0 8px 0',
};

const responseText = {
  color: '#1e40af',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
};

const footer = {
  textAlign: 'center' as const,
};

const footerText = {
  color: '#71717a',
  fontSize: '14px',
  margin: '0 0 12px 0',
};

const footerSignature = {
  color: '#a1a1aa',
  fontSize: '13px',
  margin: '0',
};

export default SupportConfirmationEmail;
