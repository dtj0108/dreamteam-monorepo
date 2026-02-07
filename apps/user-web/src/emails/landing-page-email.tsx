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
  Link,
  Preview,
  Font,
} from '@react-email/components';

interface LandingPageEmailProps {
  recipientName?: string;
  companyName?: string;
}

export function LandingPageEmail({
  recipientName,
  companyName,
}: LandingPageEmailProps) {
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
      <Preview>Your agents worked all night. Here's what they accomplished.</Preview>
      <Body style={main}>
        <Container style={container}>

          {/* ─── 1. Header + Hook ──────────────────────────────────────────── */}
          <Section style={header}>
            <Text style={logo}>DreamTeam</Text>
          </Section>

          <Section style={heroSection}>
            <Text style={headline}>
              What happened{' '}
              <span style={headlineAccent}>while you slept</span>
            </Text>
            {recipientName && (
              <Text style={greeting}>Hi {recipientName},</Text>
            )}
            <Text style={bodyText}>
              You closed your laptop at 6pm. Here's what your AI agents did
              between midnight and 8am.
            </Text>
          </Section>

          {/* ─── 2. Overnight Report Card ──────────────────────────────────── */}
          <Section style={sectionBlock}>
            <Text style={sectionLabel}>OVERNIGHT REPORT</Text>

            <table style={reportCard} cellPadding={0} cellSpacing={0}>
              {/* Entry 1 */}
              <tr>
                <td style={reportCell}>
                  <Text style={timestamp}>12:14 AM</Text>
                  <Text style={agentLine}>
                    <span style={agentName}>🤝 Sales Agent</span>
                    {' — '}Scored 3 inbound leads. Drafted personalized
                    follow-ups for the top 2.
                  </Text>
                </td>
              </tr>
              <tr>
                <td style={separatorCell}>
                  <Hr style={reportDivider} />
                </td>
              </tr>

              {/* Entry 2 */}
              <tr>
                <td style={reportCell}>
                  <Text style={timestamp}>2:47 AM</Text>
                  <Text style={agentLine}>
                    <span style={agentName}>💰 Finance Agent</span>
                    {' — '}Categorized 142 transactions. Flagged a $4,200 AWS
                    charge — 3.2x above your 90-day average.
                  </Text>
                </td>
              </tr>
              <tr>
                <td style={separatorCell}>
                  <Hr style={reportDivider} />
                </td>
              </tr>

              {/* Entry 3 */}
              <tr>
                <td style={reportCell}>
                  <Text style={timestamp}>4:03 AM</Text>
                  <Text style={agentLine}>
                    <span style={agentName}>📋 Project Agent</span>
                    {' — '}Pulled 3 action items from #product-updates. Created
                    tasks and assigned owners.
                  </Text>
                </td>
              </tr>
              <tr>
                <td style={separatorCell}>
                  <Hr style={reportDivider} />
                </td>
              </tr>

              {/* Entry 4 */}
              <tr>
                <td style={reportCell}>
                  <Text style={timestamp}>5:31 AM</Text>
                  <Text style={agentLine}>
                    <span style={agentName}>🎧 Support Agent</span>
                    {' — '}Resolved 4 tickets automatically. Escalated 1 edge
                    case to your team.
                  </Text>
                </td>
              </tr>
              <tr>
                <td style={separatorCell}>
                  <Hr style={reportDivider} />
                </td>
              </tr>

              {/* Entry 5 */}
              <tr>
                <td style={reportCell}>
                  <Text style={timestamp}>7:15 AM</Text>
                  <Text style={agentLine}>
                    <span style={agentName}>📣 Marketing Agent</span>
                    {' — '}Generated your weekly campaign report. Recommended
                    doubling LinkedIn ad spend — CTO segment converts 4.1x.
                  </Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* ─── 3. Metrics Strip ──────────────────────────────────────────── */}
          <Section style={sectionBlock}>
            <table style={metricsTable} cellPadding={0} cellSpacing={0}>
              <tr>
                <td style={metricCell}>
                  <Text style={metricValue}>5</Text>
                  <Text style={metricLabel}>agents working</Text>
                </td>
                <td style={metricCell}>
                  <Text style={metricValue}>12</Text>
                  <Text style={metricLabel}>tasks completed</Text>
                </td>
                <td style={metricCell}>
                  <Text style={metricValue}>0</Text>
                  <Text style={metricLabel}>minutes of your time</Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* ─── 4. How It Works ───────────────────────────────────────────── */}
          <Section style={sectionBlock}>
            <table cellPadding={0} cellSpacing={0} style={bulletTable}>
              <tr>
                <td style={bulletCell}>
                  <Text style={bulletEmoji}>🧠</Text>
                  <Text style={bulletTitle}>Persistent Memory</Text>
                  <Text style={bulletDesc}>
                    They remember your preferences, past decisions, and project
                    context — and learn from every interaction.
                  </Text>
                </td>
              </tr>
              <tr>
                <td style={bulletCell}>
                  <Text style={bulletEmoji}>✨</Text>
                  <Text style={bulletTitle}>Custom Abilities</Text>
                  <Text style={bulletDesc}>
                    Teach them new workflows in plain English. They learn
                    instantly and use them forever.
                  </Text>
                </td>
              </tr>
              <tr>
                <td style={bulletCell}>
                  <Text style={bulletEmoji}>🛠️</Text>
                  <Text style={bulletTitle}>16 Built-in Tools</Text>
                  <Text style={bulletDesc}>
                    Transactions, projects, leads, knowledge base, web search,
                    and more. Agents chain actions autonomously.
                  </Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* ─── 5. CTA + Footer ───────────────────────────────────────────── */}
          <Section style={ctaSection}>
            <Text style={ctaHeading}>
              {companyName
                ? `Ready to put ${companyName} on autopilot?`
                : 'Ready to put your business on autopilot?'}
            </Text>
            <Text style={ctaSubtext}>
              Deploy 7 autonomous agents in 5 minutes. No credit card required.
              Free forever.
            </Text>
            <table cellPadding={0} cellSpacing={0} style={ctaButtonRow}>
              <tr>
                <td>
                  <Button
                    style={primaryButton}
                    href="https://app.dreamteam.com/agents/discover"
                  >
                    Get Started Free
                  </Button>
                </td>
              </tr>
            </table>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerLogo}>DreamTeam</Text>
            <Text style={footerTagline}>Business in the AI era.</Text>

            <Text style={footerLinks}>
              <Link href="https://dreamteam.com" style={footerLink}>Website</Link>
              {' · '}
              <Link href="https://dreamteam.com/pricing" style={footerLink}>Pricing</Link>
              {' · '}
              <Link href="https://docs.dreamteam.com" style={footerLink}>Docs</Link>
            </Text>

            <Text style={footerReply}>
              Questions? Just reply — a human will get back to you.
            </Text>
            <Text style={footerCopyright}>
              © 2025 dreamteam.ai
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
};

// ─── Header ─────────────────────────────────────────────────────────────────

const header = {
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const logo = {
  color: '#18181b',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0',
};

// ─── Hero ───────────────────────────────────────────────────────────────────

const heroSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const headline = {
  color: '#18181b',
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '1.2',
  margin: '0',
};

const headlineAccent = {
  color: '#2563eb',
};

const greeting = {
  color: '#3f3f46',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '20px 0 0 0',
};

const bodyText = {
  color: '#3f3f46',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '12px 0 0 0',
};

// ─── Shared Section ─────────────────────────────────────────────────────────

const sectionBlock = {
  marginBottom: '32px',
};

const sectionLabel = {
  color: '#2563eb',
  fontSize: '12px',
  fontWeight: '600',
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
  textAlign: 'center' as const,
  margin: '0 0 12px 0',
};

// ─── Overnight Report Card ──────────────────────────────────────────────────

const reportCard = {
  width: '100%',
  backgroundColor: '#fafafa',
  borderRadius: '12px',
  border: '1px solid #e4e4e7',
};

const reportCell = {
  padding: '16px 20px',
};

const separatorCell = {
  padding: '0 20px',
};

const reportDivider = {
  borderColor: '#e4e4e7',
  margin: '0',
};

const timestamp = {
  color: '#a1a1aa',
  fontSize: '12px',
  fontWeight: '500',
  margin: '0 0 4px 0',
};

const agentLine = {
  color: '#3f3f46',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0',
};

const agentName = {
  color: '#18181b',
  fontWeight: '600' as const,
};

// ─── Metrics Strip ──────────────────────────────────────────────────────────

const metricsTable = {
  width: '100%',
  textAlign: 'center' as const,
};

const metricCell = {
  width: '33.33%',
  padding: '0 8px',
  textAlign: 'center' as const,
  verticalAlign: 'top' as const,
};

const metricValue = {
  color: '#2563eb',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0 0 2px 0',
};

const metricLabel = {
  color: '#71717a',
  fontSize: '12px',
  margin: '0',
};

// ─── How It Works Bullets ───────────────────────────────────────────────────

const bulletTable = {
  width: '100%',
};

const bulletCell = {
  padding: '0 0 20px 0',
};

const bulletEmoji = {
  fontSize: '20px',
  margin: '0 0 4px 0',
};

const bulletTitle = {
  color: '#18181b',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0 0 4px 0',
};

const bulletDesc = {
  color: '#3f3f46',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0',
};

// ─── CTA ────────────────────────────────────────────────────────────────────

const ctaSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const ctaHeading = {
  color: '#18181b',
  fontSize: '22px',
  fontWeight: '700',
  margin: '0 0 12px 0',
};

const ctaSubtext = {
  color: '#3f3f46',
  fontSize: '15px',
  lineHeight: '1.5',
  margin: '0 0 20px 0',
};

const ctaButtonRow = {
  margin: '0 auto',
};

const primaryButton = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  padding: '14px 32px',
  textDecoration: 'none',
};

// ─── Footer ─────────────────────────────────────────────────────────────────

const divider = {
  borderColor: '#e4e4e7',
  margin: '24px 0',
};

const footer = {
  textAlign: 'center' as const,
};

const footerLogo = {
  color: '#18181b',
  fontSize: '20px',
  fontWeight: '700',
  margin: '0 0 4px 0',
};

const footerTagline = {
  color: '#71717a',
  fontSize: '14px',
  margin: '0 0 16px 0',
};

const footerLinks = {
  color: '#71717a',
  fontSize: '13px',
  margin: '0 0 16px 0',
};

const footerLink = {
  color: '#71717a',
  textDecoration: 'underline',
};

const footerReply = {
  color: '#a1a1aa',
  fontSize: '14px',
  margin: '0 0 8px 0',
};

const footerCopyright = {
  color: '#a1a1aa',
  fontSize: '12px',
  margin: '0',
};

export default LandingPageEmail;
