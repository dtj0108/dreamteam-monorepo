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

interface SupportRequestEmailProps {
  type: 'bug' | 'support';
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  source: 'user-web' | 'admin';
  timestamp: string;
  urgency?: Urgency;
}

const urgencyConfig = {
  low: { label: 'Low', color: '#22c55e' },
  medium: { label: 'Medium', color: '#eab308' },
  high: { label: 'High', color: '#ef4444' },
};

export function SupportRequestEmail({
  type,
  userName,
  userEmail,
  subject,
  message,
  source,
  timestamp,
  urgency,
}: SupportRequestEmailProps) {
  const typeLabel = type === 'bug' ? 'Bug Report' : 'Support Request';
  const badgeColor = type === 'bug' ? '#ef4444' : '#3b82f6';
  const urgencyInfo = urgency ? urgencyConfig[urgency] : null;

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
      <Preview>{typeLabel}: {subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>DreamTeam Support</Text>
          </Section>

          {/* Type Badge */}
          <Section style={badgeSection}>
            <Text style={{ ...badge, backgroundColor: badgeColor }}>
              {typeLabel}
            </Text>
            {urgencyInfo && (
              <Text style={{ ...badge, backgroundColor: urgencyInfo.color, margin: '0 4px' }}>
                {urgencyInfo.label} Priority
              </Text>
            )}
            <Text style={sourceBadge}>
              from {source === 'admin' ? 'Admin Panel' : 'User App'}
            </Text>
          </Section>

          {/* User Info */}
          <Section style={infoSection}>
            <Text style={infoLabel}>From</Text>
            <Text style={infoValue}>{userName}</Text>
            <Text style={infoEmail}>{userEmail}</Text>
          </Section>

          <Hr style={divider} />

          {/* Subject */}
          <Section style={contentSection}>
            <Text style={subjectLabel}>Subject</Text>
            <Text style={subjectText}>{subject}</Text>
          </Section>

          {/* Message */}
          <Section style={contentSection}>
            <Text style={messageLabel}>Message</Text>
            <Text style={messageText}>{message}</Text>
          </Section>

          <Hr style={divider} />

          {/* Timestamp */}
          <Section style={footer}>
            <Text style={timestampText}>
              Submitted on {timestamp}
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
  marginBottom: '24px',
};

const logo = {
  color: '#18181b',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0',
};

const badgeSection = {
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const badge = {
  display: 'inline-block',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '600',
  padding: '6px 12px',
  borderRadius: '9999px',
  margin: '0 4px 0 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const sourceBadge = {
  display: 'inline-block',
  color: '#71717a',
  fontSize: '12px',
  fontWeight: '500',
  padding: '6px 12px',
  borderRadius: '9999px',
  backgroundColor: '#f4f4f5',
  margin: '0',
};

const infoSection = {
  marginBottom: '16px',
};

const infoLabel = {
  color: '#71717a',
  fontSize: '12px',
  fontWeight: '500',
  margin: '0 0 4px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const infoValue = {
  color: '#18181b',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
};

const infoEmail = {
  color: '#3b82f6',
  fontSize: '14px',
  margin: '2px 0 0 0',
};

const divider = {
  borderColor: '#e4e4e7',
  margin: '24px 0',
};

const contentSection = {
  marginBottom: '20px',
};

const subjectLabel = {
  color: '#71717a',
  fontSize: '12px',
  fontWeight: '500',
  margin: '0 0 8px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const subjectText = {
  color: '#18181b',
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '1.4',
  margin: '0',
};

const messageLabel = {
  color: '#71717a',
  fontSize: '12px',
  fontWeight: '500',
  margin: '0 0 8px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const messageText = {
  color: '#3f3f46',
  fontSize: '15px',
  lineHeight: '1.7',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
};

const footer = {
  textAlign: 'center' as const,
};

const timestampText = {
  color: '#a1a1aa',
  fontSize: '12px',
  margin: '0',
};

export default SupportRequestEmail;
