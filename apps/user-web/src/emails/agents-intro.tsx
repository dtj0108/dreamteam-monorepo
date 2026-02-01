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

export function AgentsIntroEmail() {
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
      <Preview>Your AI team is ready. They work 24/7 so you don't have to.</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>DreamTeam</Text>
          </Section>

          {/* Hero Image */}
          <Section style={heroSection}>
            <Img
              src="https://gfxwgzanzcdvhnenansu.supabase.co/storage/v1/object/public/email-assets/ai-sphere.png"
              alt="AI Sphere"
              width="180"
              height="180"
              style={heroImage}
            />
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={headline}>
              Meet your new team
            </Text>

            <Text style={paragraph}>
              AI-assisted companies simply have more output. More ideas explored. More tasks completed. More ground covered.
            </Text>

            <Text style={paragraph}>
              Your agents work autonomously — researching, drafting, analyzing, and executing while you focus on what matters.
            </Text>
          </Section>

          {/* Feature Cards */}
          <Section style={featuresSection}>
            <table style={featuresTable} cellPadding={0} cellSpacing={0}>
              <tr>
                <td style={featureCard}>
                  <Text style={featureIcon}>🕐</Text>
                  <Text style={featureTitle}>Works 24/7</Text>
                  <Text style={featureDesc}>Never sleeps, never takes breaks</Text>
                </td>
                <td style={featureCard}>
                  <Text style={featureIcon}>💬</Text>
                  <Text style={featureTitle}>Help Anytime</Text>
                  <Text style={featureDesc}>Always available when you need it</Text>
                </td>
              </tr>
              <tr>
                <td style={featureCard}>
                  <Text style={featureIcon}>🧠</Text>
                  <Text style={featureTitle}>Autonomous</Text>
                  <Text style={featureDesc}>Works independently on your behalf</Text>
                </td>
                <td style={featureCard}>
                  <Text style={featureIcon}>📈</Text>
                  <Text style={featureTitle}>Scales Instantly</Text>
                  <Text style={featureDesc}>No hiring, no onboarding</Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* Price Comparison */}
          <Section style={priceSection}>
            <Text style={priceHeadline}>The math is simple</Text>
            <table style={priceTable} cellPadding={0} cellSpacing={0}>
              <tr>
                <td style={priceCell}>
                  <Text style={priceAmount}>$150k+</Text>
                  <Text style={priceLabel}>Avg. salary per employee</Text>
                </td>
                <td style={priceVs}>vs</td>
                <td style={priceCell}>
                  <Text style={priceAmountHighlight}>$3k/mo</Text>
                  <Text style={priceLabel}>For a full AI team</Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Button style={ctaButton} href="https://app.dreamteam.com/agents/discover">
              Explore Your Agents
            </Button>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Questions? Just reply — a human will get back to you.
            </Text>
            <Text style={footerLinks}>
              <Link href="https://dreamteam.com" style={footerLink}>Website</Link>
              {' • '}
              <Link href="https://docs.dreamteam.com" style={footerLink}>Docs</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles - Light Mode
const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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

const heroSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const heroImage = {
  margin: '0 auto',
};

const content = {
  marginBottom: '32px',
  textAlign: 'center' as const,
};

const headline = {
  color: '#18181b',
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '1.2',
  margin: '0 0 20px 0',
};

const paragraph = {
  color: '#3f3f46',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 12px 0',
};

const featuresSection = {
  marginBottom: '32px',
};

const featuresTable = {
  width: '100%',
  borderCollapse: 'separate' as const,
  borderSpacing: '8px',
};

const featureCard = {
  backgroundColor: '#fafafa',
  border: '1px solid #e4e4e7',
  borderRadius: '12px',
  padding: '16px',
  width: '50%',
  verticalAlign: 'top' as const,
  textAlign: 'center' as const,
};

const featureIcon = {
  fontSize: '28px',
  margin: '0 0 8px 0',
};

const featureTitle = {
  color: '#18181b',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0 0 4px 0',
};

const featureDesc = {
  color: '#71717a',
  fontSize: '13px',
  lineHeight: '1.4',
  margin: '0',
};

const priceSection = {
  backgroundColor: '#fafafa',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '32px',
  textAlign: 'center' as const,
};

const priceHeadline = {
  color: '#18181b',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px 0',
};

const priceTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const priceCell = {
  width: '45%',
  textAlign: 'center' as const,
  padding: '0 8px',
};

const priceVs = {
  width: '10%',
  textAlign: 'center' as const,
  color: '#a1a1aa',
  fontSize: '14px',
  fontWeight: '500',
};

const priceAmount = {
  color: '#71717a',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0',
  textDecoration: 'line-through',
};

const priceAmountHighlight = {
  color: '#18181b',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0',
};

const priceLabel = {
  color: '#a1a1aa',
  fontSize: '12px',
  margin: '4px 0 0 0',
};

const ctaSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
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
  margin: '0',
};

const footerLink = {
  color: '#71717a',
  textDecoration: 'underline',
};

export default AgentsIntroEmail;
