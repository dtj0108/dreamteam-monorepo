/**
 * Billing types for Stripe integration
 */

export type WorkspacePlan = 'free' | 'monthly' | 'annual'
export type AgentTier = 'none' | 'startup' | 'teams' | 'enterprise'
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'

/**
 * Billing state returned from /api/billing
 */
export interface BillingState {
  id: string
  workspace_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_agent_subscription_id: string | null
  plan: WorkspacePlan
  plan_status: SubscriptionStatus | null
  plan_period_start: string | null
  plan_period_end: string | null
  plan_cancel_at_period_end: boolean
  agent_tier: AgentTier
  agent_status: SubscriptionStatus | null
  agent_period_end: string | null
  trial_start: string | null
  trial_end: string | null
  included_users: number
  current_user_count: number
  storage_limit_gb: number
  storage_used_gb: number
}

/**
 * Invoice record from billing_invoices table
 */
export interface BillingInvoice {
  id: string
  workspace_id: string
  stripe_invoice_id: string
  stripe_payment_intent_id: string | null
  amount_due: number
  amount_paid: number
  currency: string
  status: string
  description: string | null
  invoice_url: string | null
  invoice_pdf: string | null
  period_start: string | null
  period_end: string | null
  paid_at: string | null
  created_at: string
}

/**
 * Response from /api/billing
 */
export interface BillingResponse {
  billing: BillingState | null
  invoices: BillingInvoice[]
  isOwner: boolean
}

/**
 * Plan features for display
 */
export const PLAN_FEATURES: Record<WorkspacePlan, string[]> = {
  free: ['Basic features', 'Up to 3 users', '1 GB storage'],
  monthly: [
    'All 5 products (Finance, Sales, Team, Projects, Knowledge)',
    'Unlimited accounts & transactions',
    'Analytics & reporting',
    '100 GB storage',
    'Up to 10 users included',
    '+$10/mo per additional user',
    'Priority support',
  ],
  annual: [
    'Everything in Monthly plan',
    'Save 20% vs monthly',
    '$468/year billed annually',
  ],
}

/**
 * Agent tier info for display
 */
export const AGENT_TIER_INFO: Record<
  Exclude<AgentTier, 'none'>,
  {
    name: string
    price: number
    agents: number
    tagline: string
    description: string
  }
> = {
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
    tagline: "Now you've got specialists",
    description: 'How do I make this run smoother and make more money?',
  },
  enterprise: {
    name: 'Enterprise Dream Team',
    price: 10000,
    agents: 38,
    tagline: 'This is unfair',
    description: 'How do I build something big without burning out?',
  },
}

/**
 * Workspace plan info for display
 */
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

/**
 * Helper to check if subscription is active
 */
export function isActiveSubscription(billing: BillingState | null): boolean {
  if (!billing) return false
  return billing.plan_status === 'active' || billing.plan_status === 'trialing'
}

/**
 * Helper to check if user has agent access
 */
export function hasActiveAgents(billing: BillingState | null): boolean {
  if (!billing) return false
  return (
    billing.agent_tier !== 'none' &&
    (billing.agent_status === 'active' || billing.agent_status === 'trialing')
  )
}

/**
 * Get agent count for tier
 */
export function getAgentCount(tier: AgentTier): number {
  const counts: Record<AgentTier, number> = {
    none: 0,
    startup: 7,
    teams: 18,
    enterprise: 38,
  }
  return counts[tier]
}

/**
 * Format price in cents to display string
 */
export function formatPrice(cents: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

/**
 * Get days remaining in trial
 */
export function getTrialDaysRemaining(trialEnd: string | null): number | null {
  if (!trialEnd) return null
  const endDate = new Date(trialEnd)
  const now = new Date()
  const diffMs = endDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
}
