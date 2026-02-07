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

interface AutonomousActionsEmailProps {
  recipientName?: string;
  companyName?: string;
}

export function AutonomousActionsEmail({
  recipientName,
  companyName,
}: AutonomousActionsEmailProps) {
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
      <Preview>These aren't chatbots. They take action — autonomously.</Preview>
      <Body style={main}>
        <Container style={container}>

          {/* ─── 1. Header + Hook ──────────────────────────────────────────── */}
          <Section style={header}>
            <Text style={logo}>DreamTeam</Text>
          </Section>

          <Section style={heroSection}>
            <Text style={headline}>
              Your agents don't wait{' '}
              <span style={headlineAccent}>for instructions</span>
            </Text>
            {recipientName && (
              <Text style={greeting}>Hi {recipientName},</Text>
            )}
            <Text style={bodyText}>
              Most AI tools wait for you to type a prompt. DreamTeam agents
              detect what needs doing and act on it — categorizing,
              scheduling, drafting, resolving, and reporting while you focus
              on what matters.
            </Text>
          </Section>

          {/* ─── 2. Autonomous Actions List ────────────────────────────────── */}
          <Section style={sectionBlock}>
            <Text style={sectionLabel}>WHAT THEY DO WITHOUT BEING ASKED</Text>

            <table style={actionsCard} cellPadding={0} cellSpacing={0}>
              {/* Action 1 */}
              <tr>
                <td style={actionCell}>
                  <table cellPadding={0} cellSpacing={0} style={actionRow}>
                    <tr>
                      <td style={emojiCell}>
                        <Text style={actionEmoji}>📨</Text>
                      </td>
                      <td style={actionContentCell}>
                        <Text style={actionTitle}>Draft & send follow-up emails</Text>
                        <Text style={actionDesc}>
                          Sales Agent detects a new inbound lead, scores it,
                          and sends a personalized follow-up — all before you
                          open your inbox.
                        </Text>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style={separatorCell}>
                  <Hr style={actionDivider} />
                </td>
              </tr>

              {/* Action 2 */}
              <tr>
                <td style={actionCell}>
                  <table cellPadding={0} cellSpacing={0} style={actionRow}>
                    <tr>
                      <td style={emojiCell}>
                        <Text style={actionEmoji}>💳</Text>
                      </td>
                      <td style={actionContentCell}>
                        <Text style={actionTitle}>Categorize every transaction</Text>
                        <Text style={actionDesc}>
                          Finance Agent pulls new charges, auto-categorizes
                          them, and flags anything unusual — like a 3x spike
                          in your AWS bill.
                        </Text>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style={separatorCell}>
                  <Hr style={actionDivider} />
                </td>
              </tr>

              {/* Action 3 */}
              <tr>
                <td style={actionCell}>
                  <table cellPadding={0} cellSpacing={0} style={actionRow}>
                    <tr>
                      <td style={emojiCell}>
                        <Text style={actionEmoji}>🎫</Text>
                      </td>
                      <td style={actionContentCell}>
                        <Text style={actionTitle}>Resolve support tickets</Text>
                        <Text style={actionDesc}>
                          Support Agent matches tickets to your knowledge base,
                          drafts a response, and resolves them. Only escalates
                          what it can't handle.
                        </Text>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style={separatorCell}>
                  <Hr style={actionDivider} />
                </td>
              </tr>

              {/* Action 4 */}
              <tr>
                <td style={actionCell}>
                  <table cellPadding={0} cellSpacing={0} style={actionRow}>
                    <tr>
                      <td style={emojiCell}>
                        <Text style={actionEmoji}>📋</Text>
                      </td>
                      <td style={actionContentCell}>
                        <Text style={actionTitle}>Create tasks & assign owners</Text>
                        <Text style={actionDesc}>
                          Project Agent scans your channels for action items,
                          creates tasks, sets priorities, and assigns them to
                          the right people.
                        </Text>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style={separatorCell}>
                  <Hr style={actionDivider} />
                </td>
              </tr>

              {/* Action 5 */}
              <tr>
                <td style={actionCell}>
                  <table cellPadding={0} cellSpacing={0} style={actionRow}>
                    <tr>
                      <td style={emojiCell}>
                        <Text style={actionEmoji}>📊</Text>
                      </td>
                      <td style={actionContentCell}>
                        <Text style={actionTitle}>Generate reports & recommendations</Text>
                        <Text style={actionDesc}>
                          Marketing Agent compiles campaign performance weekly,
                          spots trends, and tells you exactly where to
                          double down.
                        </Text>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style={separatorCell}>
                  <Hr style={actionDivider} />
                </td>
              </tr>

              {/* Action 6 */}
              <tr>
                <td style={actionCell}>
                  <table cellPadding={0} cellSpacing={0} style={actionRow}>
                    <tr>
                      <td style={emojiCell}>
                        <Text style={actionEmoji}>🔄</Text>
                      </td>
                      <td style={actionContentCell}>
                        <Text style={actionTitle}>Update your CRM automatically</Text>
                        <Text style={actionDesc}>
                          When a deal progresses, an email is opened, or a
                          meeting is booked — agents update records in
                          real-time so your pipeline is always current.
                        </Text>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </Section>

          {/* ─── 3. The Difference ─────────────────────────────────────────── */}
          <Section style={sectionBlock}>
            <table style={comparisonCard} cellPadding={0} cellSpacing={0}>
              <tr>
                <td style={comparisonHeader} colSpan={2}>
                  <Text style={comparisonHeaderText}>Chatbots vs. Agents</Text>
                </td>
              </tr>
              <tr>
                <td style={comparisonCellLeft}>
                  <Text style={comparisonLabel}>Chatbots</Text>
                  <Text style={comparisonItem}>Wait for your prompt</Text>
                  <Text style={comparisonItem}>Answer questions</Text>
                  <Text style={comparisonItem}>Forget everything</Text>
                </td>
                <td style={comparisonCellRight}>
                  <Text style={comparisonLabelBlue}>DreamTeam Agents</Text>
                  <Text style={comparisonItemBlue}>Act on their own</Text>
                  <Text style={comparisonItemBlue}>Execute workflows</Text>
                  <Text style={comparisonItemBlue}>Remember everything</Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* ─── 4. Metrics Strip ──────────────────────────────────────────── */}
          <Section style={sectionBlock}>
            <table style={metricsTable} cellPadding={0} cellSpacing={0}>
              <tr>
                <td style={metricCell}>
                  <Text style={metricValue}>16</Text>
                  <Text style={metricLabel}>built-in tools</Text>
                </td>
                <td style={metricCell}>
                  <Text style={metricValue}>24/7</Text>
                  <Text style={metricLabel}>always working</Text>
                </td>
                <td style={metricCell}>
                  <Text style={metricValue}>0</Text>
                  <Text style={metricLabel}>prompts needed</Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* ─── 5. CTA + Footer ───────────────────────────────────────────── */}
          <Section style={ctaSection}>
            <Text style={ctaHeading}>
              {companyName
                ? `Let ${companyName}'s agents start acting`
                : 'Let your agents start acting'}
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

// ─── Autonomous Actions Card ────────────────────────────────────────────────

const actionsCard = {
  width: '100%',
  backgroundColor: '#fafafa',
  borderRadius: '12px',
  border: '1px solid #e4e4e7',
};

const actionCell = {
  padding: '16px 20px',
};

const separatorCell = {
  padding: '0 20px',
};

const actionDivider = {
  borderColor: '#e4e4e7',
  margin: '0',
};

const actionRow = {
  width: '100%',
};

const emojiCell = {
  width: '36px',
  verticalAlign: 'top' as const,
  paddingTop: '2px',
};

const actionEmoji = {
  fontSize: '20px',
  margin: '0',
};

const actionContentCell = {
  verticalAlign: 'top' as const,
};

const actionTitle = {
  color: '#18181b',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0 0 4px 0',
};

const actionDesc = {
  color: '#71717a',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '0',
};

// ─── Comparison Card ────────────────────────────────────────────────────────

const comparisonCard = {
  width: '100%',
  borderRadius: '12px',
  border: '1px solid #e4e4e7',
  borderCollapse: 'collapse' as const,
  overflow: 'hidden' as const,
};

const comparisonHeader = {
  backgroundColor: '#18181b',
  padding: '12px 20px',
  textAlign: 'center' as const,
};

const comparisonHeaderText = {
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: '600',
  letterSpacing: '0.02em',
  margin: '0',
};

const comparisonCellLeft = {
  width: '50%',
  padding: '16px 20px',
  verticalAlign: 'top' as const,
  backgroundColor: '#fafafa',
  borderRight: '1px solid #e4e4e7',
};

const comparisonCellRight = {
  width: '50%',
  padding: '16px 20px',
  verticalAlign: 'top' as const,
  backgroundColor: '#eff6ff',
};

const comparisonLabel = {
  color: '#71717a',
  fontSize: '11px',
  fontWeight: '600',
  letterSpacing: '0.04em',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px 0',
};

const comparisonLabelBlue = {
  color: '#2563eb',
  fontSize: '11px',
  fontWeight: '600',
  letterSpacing: '0.04em',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px 0',
};

const comparisonItem = {
  color: '#a1a1aa',
  fontSize: '13px',
  lineHeight: '1.8',
  margin: '0',
};

const comparisonItemBlue = {
  color: '#18181b',
  fontSize: '13px',
  fontWeight: '500' as const,
  lineHeight: '1.8',
  margin: '0',
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

export default AutonomousActionsEmail;
