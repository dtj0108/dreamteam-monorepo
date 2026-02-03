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
// NOTE: These are now used as FALLBACK only. Primary source of truth is the
// plans table in the database (stripe_price_id column). Set Stripe IDs via
// Admin > Plans for each plan. These env vars are kept for backwards compatibility.
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

// Trial configuration
export const TRIAL_DAYS = 14
