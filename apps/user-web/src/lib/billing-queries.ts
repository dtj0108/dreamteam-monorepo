import { createAdminClient } from '@/lib/supabase-server'
import { stripe } from '@/lib/stripe'

// Type definitions for billing data
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'

export type WorkspacePlan = 'free' | 'monthly' | 'annual'
export type AgentTier = 'none' | 'startup' | 'teams' | 'enterprise'

export interface WorkspaceBilling {
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
  created_at: string
  updated_at: string
}

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
 * Get billing record for a workspace
 */
export async function getWorkspaceBilling(workspaceId: string): Promise<WorkspaceBilling | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('workspace_billing')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()

  if (error) {
    console.error('Error fetching workspace billing:', error)
    return null
  }

  return data as WorkspaceBilling
}

/**
 * Get or create Stripe customer for a workspace
 */
export async function getOrCreateStripeCustomer(
  workspaceId: string,
  workspaceName: string,
  ownerEmail: string
): Promise<string> {
  const supabase = createAdminClient()
  const billing = await getWorkspaceBilling(workspaceId)

  // Return existing customer ID if we have one
  if (billing?.stripe_customer_id) {
    return billing.stripe_customer_id
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: ownerEmail,
    name: workspaceName,
    metadata: {
      workspace_id: workspaceId,
    },
  })

  // Store customer ID in database
  await supabase
    .from('workspace_billing')
    .update({ stripe_customer_id: customer.id })
    .eq('workspace_id', workspaceId)

  return customer.id
}

/**
 * Update billing status from Stripe subscription
 */
export async function updateBillingFromSubscription(
  workspaceId: string,
  subscriptionId: string,
  type: 'workspace_plan' | 'agent_tier',
  targetPlan?: string
): Promise<void> {
  const supabase = createAdminClient()

  // Get subscription details from Stripe
  const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId)
  // Access properties from the response
  const sub = subscriptionResponse as unknown as {
    status: string
    current_period_start: number
    current_period_end: number
    cancel_at_period_end: boolean
    trial_start: number | null
    trial_end: number | null
  }

  if (type === 'workspace_plan') {
    await supabase
      .from('workspace_billing')
      .update({
        stripe_subscription_id: subscriptionId,
        plan: (targetPlan as WorkspacePlan) || 'monthly',
        plan_status: sub.status as SubscriptionStatus,
        plan_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        plan_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        plan_cancel_at_period_end: sub.cancel_at_period_end,
        trial_start: sub.trial_start
          ? new Date(sub.trial_start * 1000).toISOString()
          : null,
        trial_end: sub.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null,
      })
      .eq('workspace_id', workspaceId)
  } else if (type === 'agent_tier') {
    await supabase
      .from('workspace_billing')
      .update({
        stripe_agent_subscription_id: subscriptionId,
        agent_tier: (targetPlan as AgentTier) || 'startup',
        agent_status: sub.status as SubscriptionStatus,
        agent_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      })
      .eq('workspace_id', workspaceId)
  }
}

/**
 * Handle subscription cancellation
 */
export async function handleSubscriptionCanceled(
  workspaceId: string,
  type: 'workspace_plan' | 'agent_tier'
): Promise<void> {
  const supabase = createAdminClient()

  if (type === 'workspace_plan') {
    await supabase
      .from('workspace_billing')
      .update({
        plan: 'free',
        plan_status: 'canceled',
      })
      .eq('workspace_id', workspaceId)
  } else if (type === 'agent_tier') {
    await supabase
      .from('workspace_billing')
      .update({
        agent_tier: 'none',
        agent_status: 'canceled',
      })
      .eq('workspace_id', workspaceId)
  }
}

/**
 * Record an invoice in the database
 */
export async function recordInvoice(
  workspaceId: string,
  invoiceId: string,
  data: {
    payment_intent_id?: string
    amount_due: number
    amount_paid: number
    currency: string
    status: string
    description?: string
    invoice_url?: string
    invoice_pdf?: string
    period_start?: Date
    period_end?: Date
    paid_at?: Date
  }
): Promise<void> {
  const supabase = createAdminClient()

  await supabase.from('billing_invoices').upsert(
    {
      workspace_id: workspaceId,
      stripe_invoice_id: invoiceId,
      stripe_payment_intent_id: data.payment_intent_id,
      amount_due: data.amount_due,
      amount_paid: data.amount_paid,
      currency: data.currency,
      status: data.status,
      description: data.description,
      invoice_url: data.invoice_url,
      invoice_pdf: data.invoice_pdf,
      period_start: data.period_start?.toISOString(),
      period_end: data.period_end?.toISOString(),
      paid_at: data.paid_at?.toISOString(),
    },
    { onConflict: 'stripe_invoice_id' }
  )
}

/**
 * Get invoices for a workspace
 */
export async function getWorkspaceInvoices(
  workspaceId: string,
  limit: number = 12
): Promise<BillingInvoice[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('billing_invoices')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching invoices:', error)
    return []
  }

  return data as BillingInvoice[]
}

/**
 * Record a checkout session for tracking
 */
export async function recordCheckoutSession(
  workspaceId: string,
  sessionId: string,
  type: 'workspace_plan' | 'agent_tier',
  targetPlan: string
): Promise<void> {
  const supabase = createAdminClient()

  await supabase.from('billing_checkout_sessions').insert({
    workspace_id: workspaceId,
    stripe_session_id: sessionId,
    session_type: type,
    target_plan: targetPlan,
  })
}

/**
 * Mark a checkout session as completed
 */
export async function completeCheckoutSession(sessionId: string): Promise<void> {
  const supabase = createAdminClient()

  await supabase
    .from('billing_checkout_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('stripe_session_id', sessionId)
}

/**
 * Check if workspace has an active subscription
 */
export function isActiveSubscription(billing: WorkspaceBilling | null): boolean {
  if (!billing) return false
  return billing.plan_status === 'active' || billing.plan_status === 'trialing'
}

/**
 * Check if workspace has an active agent tier
 */
export function hasActiveAgents(billing: WorkspaceBilling | null): boolean {
  if (!billing) return false
  return (
    billing.agent_tier !== 'none' &&
    (billing.agent_status === 'active' || billing.agent_status === 'trialing')
  )
}

/**
 * Get the number of agents for a tier
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
