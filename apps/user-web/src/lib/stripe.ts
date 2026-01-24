import Stripe from 'stripe'

// Lazy initialization to avoid build-time errors
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable')
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  }
  return stripeInstance
}

// Legacy export for backwards compatibility (use getStripe() instead)
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  : null as unknown as Stripe

// Price IDs from Stripe Dashboard (set in environment variables)
export const STRIPE_PRICES = {
  workspace: {
    monthly: process.env.STRIPE_PRICE_WORKSPACE_MONTHLY || '',
    annual: process.env.STRIPE_PRICE_WORKSPACE_ANNUAL || '',
  },
  agents: {
    startup: process.env.STRIPE_PRICE_AGENTS_STARTUP || '',
    teams: process.env.STRIPE_PRICE_AGENTS_TEAMS || '',
    enterprise: process.env.STRIPE_PRICE_AGENTS_ENTERPRISE || '',
  },
  smsCredits: {
    starter: process.env.STRIPE_PRICE_SMS_STARTER || '',
    growth: process.env.STRIPE_PRICE_SMS_GROWTH || '',
    pro: process.env.STRIPE_PRICE_SMS_PRO || '',
  },
  callMinutes: {
    starter: process.env.STRIPE_PRICE_MINUTES_STARTER || '',
    growth: process.env.STRIPE_PRICE_MINUTES_GROWTH || '',
    pro: process.env.STRIPE_PRICE_MINUTES_PRO || '',
  },
  phoneNumber: process.env.STRIPE_PRICE_PHONE_NUMBER || '',
} as const

// Type helpers for Stripe integration
export type WorkspacePlanType = 'monthly' | 'annual'
export type AgentTierType = 'startup' | 'teams' | 'enterprise'

// Plan display info
export const WORKSPACE_PLAN_INFO = {
  monthly: {
    name: 'Monthly',
    price: 49,
    period: 'month',
    description: 'Billed monthly',
  },
  annual: {
    name: 'Annual',
    price: 39,
    period: 'month',
    annualTotal: 468,
    description: '$468/year, billed annually',
    savings: 'Save 20% vs monthly',
  },
} as const

export const AGENT_TIER_INFO = {
  startup: {
    name: 'Lean Startup',
    price: 3000,
    agents: 7,
    tagline: 'You + a few killers in one room',
    description: 'What should I do, and how do I actually do it?',
  },
  teams: {
    name: 'Department Teams',
    price: 5000,
    agents: 18,
    tagline: 'Now you\'ve got specialists',
    description: 'How do I make this run smoother and make more money?',
  },
  enterprise: {
    name: 'Enterprise Dream Team',
    price: 10000,
    agents: 38,
    tagline: 'This is unfair',
    description: 'How do I build something big without burning out?',
  },
} as const

// Workspace plan features
export const WORKSPACE_FEATURES = [
  'All 5 products (Finance, Sales, Team, Projects, Knowledge)',
  'Unlimited accounts & transactions',
  'Analytics & reporting',
  '100 GB storage',
  'Up to 10 users included',
  '+$10/mo per additional user',
  'Priority support',
] as const

// Trial configuration
export const TRIAL_DAYS = 14
