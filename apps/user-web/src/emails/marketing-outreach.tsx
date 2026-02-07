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
  Hr,
  Link,
  Preview,
  Font,
} from '@react-email/components';

interface MarketingOutreachEmailProps {
  recipientName?: string;
  companyName?: string;
}

export function MarketingOutreachEmail({
  recipientName,
  companyName,
}: MarketingOutreachEmailProps) {
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
      <Preview>AI agents that actually work — deploy 7 autonomous agents in 5 minutes.</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>DreamTeam</Text>
          </Section>

          {/* Hero */}
          <Section style={heroSection}>
            <Img
              src="https://gfxwgzanzcdvhnenansu.supabase.co/storage/v1/object/public/email-assets/ai-sphere.png"
              alt="AI Sphere"
              width="120"
              height="120"
              style={heroImage}
            />
            <Text style={headline}>
              AI agents that{' '}
              <span style={headlineAccent}>actually work</span>
            </Text>
            {recipientName && (
              <Text style={greeting}>Hi {recipientName},</Text>
            )}
            <Text style={subtitle}>
              Not chatbots. Not assistants. Real AI agents with memory, skills,
              and tools—running your business autonomously.
            </Text>
          </Section>

          {/* Agent Hierarchy */}
          <Section style={sectionBlock}>
            <Text style={sectionLabel}>AGENT HIERARCHY</Text>
            <Text style={sectionHeading}>
              Agents that do the work of entire teams — easy to train.
            </Text>
            <table style={hierarchyCard} cellPadding={0} cellSpacing={0}>
              <tr>
                <td style={orchestratorCell}>
                  <Text style={orchestratorIcon}>🧠</Text>
                  <Text style={orchestratorTitle}>Central Orchestrator</Text>
                  <Text style={orchestratorDesc}>
                    Coordinates all hierarchies
                  </Text>
                </td>
              </tr>
              <tr>
                <td style={connectorCell}>
                  <Hr style={connectorLine} />
                </td>
              </tr>
              <tr>
                <td style={{ padding: '0' }}>
                  <table
                    style={departmentsTable}
                    cellPadding={0}
                    cellSpacing={0}
                  >
                    <tr>
                      <td style={departmentCell}>
                        <Text style={departmentIcon}>💰</Text>
                        <Text
                          style={{
                            ...departmentName,
                            color: '#10B981',
                          }}
                        >
                          Finance
                        </Text>
                      </td>
                      <td style={departmentCell}>
                        <Text style={departmentIcon}>📈</Text>
                        <Text
                          style={{
                            ...departmentName,
                            color: '#F59E0B',
                          }}
                        >
                          Sales
                        </Text>
                      </td>
                      <td style={departmentCell}>
                        <Text style={departmentIcon}>⚙️</Text>
                        <Text
                          style={{
                            ...departmentName,
                            color: '#8B5CF6',
                          }}
                        >
                          Operations
                        </Text>
                      </td>
                      <td style={departmentCell}>
                        <Text style={departmentIcon}>📚</Text>
                        <Text
                          style={{
                            ...departmentName,
                            color: '#0EA5E9',
                          }}
                        >
                          Knowledge
                        </Text>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </Section>

          {/* Feature Cards */}
          <Section style={sectionBlock}>
            <Text style={sectionLabel}>WHAT MAKES US DIFFERENT</Text>
            <table style={featureCardsTable} cellPadding={0} cellSpacing={0}>
              <tr>
                <td style={featureCard}>
                  <Text style={featureIcon}>🧠</Text>
                  <Text style={featureTitle}>Memory that lasts</Text>
                  <Text style={featureDesc}>
                    Agents remember everything. User preferences. Past
                    decisions. Project context. They learn from every
                    interaction.
                  </Text>
                </td>
                <td style={featureCard}>
                  <Text style={featureIcon}>✨</Text>
                  <Text style={featureTitle}>Skills you can teach</Text>
                  <Text style={featureDesc}>
                    Give agents new abilities with natural language. Write a
                    skill once in markdown, agents use it forever.
                  </Text>
                </td>
                <td style={featureCard}>
                  <Text style={featureIcon}>🛠️</Text>
                  <Text style={featureTitle}>
                    16 tools at their fingertips
                  </Text>
                  <Text style={featureDesc}>
                    From querying transactions to creating projects to searching
                    the web. Agents chain up to 10 actions autonomously.
                  </Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* Collaboration Demo */}
          <Section style={sectionBlock}>
            <Text style={sectionHeading}>
              One command. Five agents. Everything updated.
            </Text>
            <Text style={sectionSubtext}>
              That's the power of unified intelligence. Agents share context and
              coordinate automatically.
            </Text>

            {/* Prompt box */}
            <table style={promptBox} cellPadding={0} cellSpacing={0}>
              <tr>
                <td style={promptCell}>
                  <Text style={promptLabel}>You:</Text>
                  <Text style={promptText}>
                    "We just signed TechCorp as a client"
                  </Text>
                </td>
              </tr>
            </table>

            {/* Action list */}
            <table style={actionTable} cellPadding={0} cellSpacing={0}>
              <tr>
                <td style={actionIconCell}>🤝</td>
                <td style={actionNameCell}>
                  <Text style={actionName}>Sales Agent</Text>
                </td>
                <td style={actionDescCell}>
                  <Text style={actionDesc}>
                    Creates deal, updates pipeline, logs activity
                  </Text>
                </td>
                <td style={actionCheckCell}>✅</td>
              </tr>
              <tr>
                <td style={actionIconCell}>📋</td>
                <td style={actionNameCell}>
                  <Text style={actionName}>Project Manager</Text>
                </td>
                <td style={actionDescCell}>
                  <Text style={actionDesc}>
                    Creates onboarding project with tasks
                  </Text>
                </td>
                <td style={actionCheckCell}>✅</td>
              </tr>
              <tr>
                <td style={actionIconCell}>📚</td>
                <td style={actionNameCell}>
                  <Text style={actionName}>Knowledge Curator</Text>
                </td>
                <td style={actionDescCell}>
                  <Text style={actionDesc}>
                    Creates client documentation page
                  </Text>
                </td>
                <td style={actionCheckCell}>✅</td>
              </tr>
              <tr>
                <td style={actionIconCell}>💰</td>
                <td style={actionNameCell}>
                  <Text style={actionName}>Budget Coach</Text>
                </td>
                <td style={actionDescCell}>
                  <Text style={actionDesc}>Updates revenue forecast</Text>
                </td>
                <td style={actionCheckCell}>✅</td>
              </tr>
            </table>

            {/* Bottom bar */}
            <table style={memoryBar} cellPadding={0} cellSpacing={0}>
              <tr>
                <td style={memoryBarCell}>
                  <Text style={memoryBarText}>
                    All agents updated their memories with TechCorp context
                  </Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* Metrics */}
          <Section style={sectionBlock}>
            <table style={metricsCard} cellPadding={0} cellSpacing={0}>
              <tr>
                <td style={metricCell}>
                  <Text style={metricValue}>38</Text>
                  <Text style={metricLabel}>Agents you can hire</Text>
                  <Text style={metricDesc}>
                    Build departments that run themselves.
                  </Text>
                </td>
                <td style={metricCell}>
                  <Text style={metricValue}>∞</Text>
                  <Text style={metricLabel}>Hours in their workday</Text>
                  <Text style={metricDesc}>
                    Your agents don't clock out.
                  </Text>
                </td>
                <td style={metricCell}>
                  <Text style={metricValue}>1</Text>
                  <Text style={metricLabel}>Dashboard to run it all</Text>
                  <Text style={metricDesc}>
                    People, agents, and results in one view.
                  </Text>
                </td>
                <td style={metricCell}>
                  <Text style={metricValue}>0</Text>
                  <Text style={metricLabel}>Micromanagement required</Text>
                  <Text style={metricDesc}>
                    Train them once, they figure out the rest.
                  </Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Text style={ctaHeading}>
              {companyName
                ? `Ready to give ${companyName} an AI workforce?`
                : 'Your AI workforce is ready'}
            </Text>
            <Text style={ctaSubtext}>
              Deploy 7 autonomous agents in 5 minutes. No credit card required.
              Start free forever.
            </Text>
            <Button
              style={ctaButton}
              href="https://app.dreamteam.com/agents/discover"
            >
              Deploy Your Agents
            </Button>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Questions? Just reply — a human will get back to you.
            </Text>
            <Text style={footerLinks}>
              <Link href="https://dreamteam.com" style={footerLink}>
                Website
              </Link>
              {' • '}
              <Link href="https://dreamteam.com/pricing" style={footerLink}>
                Pricing
              </Link>
              {' • '}
              <Link href="https://docs.dreamteam.com" style={footerLink}>
                Docs
              </Link>
            </Text>
            <Text style={footerSignature}>— The DreamTeam Team</Text>
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

// ─── Hero ────────────────────────────────────────────────────────────────────

const heroSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const heroImage = {
  margin: '0 auto',
};

const headline = {
  color: '#18181b',
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '1.2',
  margin: '20px 0 0 0',
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

const subtitle = {
  color: '#3f3f46',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '12px 0 0 0',
};

// ─── Shared section styles ───────────────────────────────────────────────────

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
  margin: '0 0 8px 0',
};

const sectionHeading = {
  color: '#18181b',
  fontSize: '22px',
  fontWeight: '700',
  lineHeight: '1.3',
  textAlign: 'center' as const,
  margin: '0 0 16px 0',
};

const sectionSubtext = {
  color: '#3f3f46',
  fontSize: '15px',
  lineHeight: '1.5',
  textAlign: 'center' as const,
  margin: '0 0 20px 0',
};

// ─── Agent Hierarchy ─────────────────────────────────────────────────────────

const hierarchyCard = {
  width: '100%',
  backgroundColor: '#fafafa',
  borderRadius: '12px',
  border: '1px solid #e4e4e7',
};

const orchestratorCell = {
  textAlign: 'center' as const,
  padding: '20px 16px 8px',
};

const orchestratorIcon = {
  fontSize: '28px',
  margin: '0 0 4px 0',
};

const orchestratorTitle = {
  color: '#18181b',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0 0 2px 0',
};

const orchestratorDesc = {
  color: '#71717a',
  fontSize: '13px',
  margin: '0',
};

const connectorCell = {
  padding: '0 60px',
};

const connectorLine = {
  borderColor: '#e4e4e7',
  margin: '8px 0',
};

const departmentsTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const departmentCell = {
  width: '25%',
  textAlign: 'center' as const,
  padding: '8px 4px 20px',
};

const departmentIcon = {
  fontSize: '22px',
  margin: '0 0 4px 0',
};

const departmentName = {
  fontSize: '12px',
  fontWeight: '600',
  margin: '0',
};

// ─── Feature Cards ───────────────────────────────────────────────────────────

const featureCardsTable = {
  width: '100%',
  borderCollapse: 'separate' as const,
  borderSpacing: '8px',
};

const featureCard = {
  backgroundColor: '#fafafa',
  border: '1px solid #e4e4e7',
  borderRadius: '12px',
  padding: '16px',
  width: '33.33%',
  verticalAlign: 'top' as const,
  textAlign: 'center' as const,
};

const featureIcon = {
  fontSize: '28px',
  margin: '0 0 8px 0',
};

const featureTitle = {
  color: '#18181b',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 6px 0',
};

const featureDesc = {
  color: '#71717a',
  fontSize: '12px',
  lineHeight: '1.4',
  margin: '0',
};

// ─── Collaboration Demo ──────────────────────────────────────────────────────

const promptBox = {
  width: '100%',
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  border: '1px solid #bfdbfe',
  marginBottom: '12px',
};

const promptCell = {
  padding: '12px 16px',
};

const promptLabel = {
  color: '#18181b',
  fontSize: '13px',
  fontWeight: '600',
  margin: '0 0 4px 0',
};

const promptText = {
  color: '#2563eb',
  fontSize: '14px',
  fontWeight: '500',
  fontStyle: 'italic' as const,
  margin: '0',
};

const actionTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  marginBottom: '8px',
};

const actionIconCell = {
  width: '28px',
  padding: '6px 8px 6px 0',
  fontSize: '16px',
  verticalAlign: 'middle' as const,
};

const actionNameCell = {
  width: '130px',
  padding: '6px 8px',
  verticalAlign: 'middle' as const,
};

const actionName = {
  color: '#18181b',
  fontSize: '13px',
  fontWeight: '600',
  margin: '0',
};

const actionDescCell = {
  padding: '6px 8px',
  verticalAlign: 'middle' as const,
};

const actionDesc = {
  color: '#71717a',
  fontSize: '13px',
  margin: '0',
};

const actionCheckCell = {
  width: '24px',
  padding: '6px 0 6px 8px',
  fontSize: '14px',
  verticalAlign: 'middle' as const,
  textAlign: 'right' as const,
};

const memoryBar = {
  width: '100%',
  backgroundColor: '#f0fdf4',
  borderRadius: '6px',
  border: '1px solid #bbf7d0',
};

const memoryBarCell = {
  padding: '10px 16px',
  textAlign: 'center' as const,
};

const memoryBarText = {
  color: '#166534',
  fontSize: '13px',
  fontWeight: '500',
  margin: '0',
};

// ─── Metrics ─────────────────────────────────────────────────────────────────

const metricsCard = {
  width: '100%',
  backgroundColor: '#fafafa',
  borderRadius: '12px',
  border: '1px solid #e4e4e7',
  borderCollapse: 'collapse' as const,
};

const metricCell = {
  width: '25%',
  padding: '16px 12px',
  borderLeft: '3px solid #2563eb',
  verticalAlign: 'top' as const,
};

const metricValue = {
  color: '#2563eb',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 2px 0',
};

const metricLabel = {
  color: '#18181b',
  fontSize: '13px',
  fontWeight: '600',
  margin: '0 0 4px 0',
};

const metricDesc = {
  color: '#71717a',
  fontSize: '12px',
  lineHeight: '1.3',
  margin: '0',
};

// ─── CTA ─────────────────────────────────────────────────────────────────────

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

const ctaButton = {
  backgroundColor: '#18181b',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  padding: '14px 32px',
  textDecoration: 'none',
};

// ─── Footer ──────────────────────────────────────────────────────────────────

const divider = {
  borderColor: '#e4e4e7',
  margin: '24px 0',
};

const footer = {
  textAlign: 'center' as const,
};

const footerText = {
  color: '#a1a1aa',
  fontSize: '14px',
  margin: '0 0 12px 0',
};

const footerLinks = {
  color: '#a1a1aa',
  fontSize: '14px',
  margin: '0 0 12px 0',
};

const footerLink = {
  color: '#71717a',
  textDecoration: 'underline',
};

const footerSignature = {
  color: '#a1a1aa',
  fontSize: '13px',
  margin: '0',
};

export default MarketingOutreachEmail;
