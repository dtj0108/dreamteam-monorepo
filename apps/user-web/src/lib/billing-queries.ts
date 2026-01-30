import { createAdminClient } from '@/lib/supabase-server'
import { stripe } from '@/lib/stripe'
import { autoDeployTeamForPlan } from '@dreamteam/database'

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
 * Ensure a billing record exists for a workspace.
 * Creates one with default values if it doesn't exist.
 * Call this before any Stripe operations to ensure the record is present.
 */
export async function ensureWorkspaceBilling(workspaceId: string): Promise<void> {
  const supabase = createAdminClient()

  // Use upsert with ON CONFLICT to safely create if not exists
  const { error } = await supabase
    .from('workspace_billing')
    .upsert(
      {
        workspace_id: workspaceId,
        plan: 'free',
        agent_tier: 'none',
        included_users: 3,
        storage_limit_gb: 1,
      },
      { onConflict: 'workspace_id', ignoreDuplicates: true }
    )

  if (error) {
    console.error('Error ensuring workspace billing:', error)
  }
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

  // Ensure billing record exists before any operations
  await ensureWorkspaceBilling(workspaceId)

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
 * Get invoices for a workspace - fetches directly from Stripe for accuracy
 */
export async function getWorkspaceInvoices(
  workspaceId: string,
  limit: number = 12
): Promise<BillingInvoice[]> {
  const supabase = createAdminClient()

  // First, get the Stripe customer ID for this workspace
  const { data: billing } = await supabase
    .from('workspace_billing')
    .select('stripe_customer_id')
    .eq('workspace_id', workspaceId)
    .single()

  // If no Stripe customer ID, fall back to database records
  if (!billing?.stripe_customer_id) {
    const { data, error } = await supabase
      .from('billing_invoices')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching invoices from database:', error)
      return []
    }

    return data as BillingInvoice[]
  }

  // Fetch invoices directly from Stripe
  try {
    const stripeInvoices = await stripe.invoices.list({
      customer: billing.stripe_customer_id,
      limit,
    })

    // Map Stripe invoices to our format
    return stripeInvoices.data.map((invoice) => {
      // Handle payment_intent which may be string, object, or not present
      const paymentIntent = (invoice as unknown as { payment_intent?: string | { id: string } | null }).payment_intent
      const stripe_payment_intent_id = typeof paymentIntent === 'string'
        ? paymentIntent
        : paymentIntent?.id || null

      return {
        id: invoice.id,
        workspace_id: workspaceId,
        stripe_invoice_id: invoice.id,
        stripe_payment_intent_id,
        amount_due: invoice.amount_due,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status || 'draft',
        description: invoice.description,
        invoice_url: invoice.hosted_invoice_url ?? null,
        invoice_pdf: invoice.invoice_pdf ?? null,
        period_start: invoice.period_start
          ? new Date(invoice.period_start * 1000).toISOString()
          : null,
        period_end: invoice.period_end
          ? new Date(invoice.period_end * 1000).toISOString()
          : null,
        paid_at: invoice.status === 'paid' && invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
          : null,
        created_at: new Date(invoice.created * 1000).toISOString(),
      }
    })
  } catch (error) {
    console.error('Error fetching invoices from Stripe:', error)

    // Fall back to database on Stripe error
    const { data } = await supabase
      .from('billing_invoices')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit)

    return (data as BillingInvoice[]) || []
  }
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
 * Get the number of agents for a tier (EXCLUSIVE - each tier's own agents)
 * - startup: 7 V2 agents
 * - teams: 18 V3 agents
 * - enterprise: 38 V4 agents
 */
export function getAgentCount(tier: AgentTier): number {
  const counts: Record<AgentTier, number> = {
    none: 0,
    startup: 7,   // V2 agents
    teams: 18,    // V3 agents
    enterprise: 38, // V4 agents
  }
  return counts[tier]
}

/**
 * Update an existing agent tier subscription to a new tier with proration
 */
export async function updateAgentTierSubscription(
  workspaceId: string,
  subscriptionId: string,
  newTier: AgentTier,
  newPriceId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  try {
    // Get current subscription to find the item ID
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const itemId = subscription.items.data[0]?.id

    if (!itemId) {
      return { success: false, error: 'Subscription item not found' }
    }

    // Update the subscription with proration
    const updatedSubResponse = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: itemId,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations',
      metadata: {
        workspace_id: workspaceId,
        type: 'agent_tier',
        agent_tier: newTier,
      },
    })
    // Access properties from the response
    const updatedSub = updatedSubResponse as unknown as {
      status: string
      current_period_end: number
    }

    // Update database with new tier
    await supabase
      .from('workspace_billing')
      .update({
        agent_tier: newTier,
        agent_status: updatedSub.status as SubscriptionStatus,
        agent_period_end: new Date(updatedSub.current_period_end * 1000).toISOString(),
      })
      .eq('workspace_id', workspaceId)

    // Deploy new team for upgraded tier
    // This ensures the workspace gets the new tier's agents (e.g., V3 agents for Teams tier)
    const deployResult = await autoDeployTeamForPlan(workspaceId, newTier)
    if (!deployResult.deployed) {
      console.warn(`[updateAgentTierSubscription] Auto-deploy failed for ${workspaceId}:`, deployResult.error)
      // Don't fail the upgrade - billing is updated, deployment can be retried
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating subscription:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update subscription'
    }
  }
}

// ==========================================
// Agent Tier Access Helpers
// ==========================================

/**
 * Agent tier required for an agent (matches ai_agents.tier_required column)
 */
export type AgentTierRequired = 'startup' | 'teams' | 'enterprise'

/**
 * Get the numeric level for a tier (for comparison)
 * Higher number = more access
 */
export function getTierLevel(tier: AgentTier): number {
  const levels: Record<AgentTier, number> = {
    none: 0,
    startup: 1,
    teams: 2,
    enterprise: 3,
  }
  return levels[tier]
}

/**
 * Get the numeric level for a required tier
 */
export function getRequiredTierLevel(tierRequired: AgentTierRequired): number {
  const levels: Record<AgentTierRequired, number> = {
    startup: 1,
    teams: 2,
    enterprise: 3,
  }
  return levels[tierRequired]
}

/**
 * Check if a user's agent tier can access an agent with a specific tier requirement
 *
 * EXCLUSIVE Access Model - each tier gets its OWN set of agents:
 * - startup tier → only startup agents (V2)
 * - teams tier → only teams agents (V3)
 * - enterprise tier → only enterprise agents (V4)
 * - none tier → no agents
 */
export function canAccessAgent(
  userTier: AgentTier,
  agentTierRequired: AgentTierRequired
): boolean {
  if (userTier === 'none') return false
  // Exclusive access: tier must match exactly
  return userTier === agentTierRequired
}

/**
 * Get the product line for a tier (EXCLUSIVE model)
 * - startup tier gets v2 agents only
 * - teams tier gets v3 agents only
 * - enterprise tier gets v4 agents only
 */
export function getProductLineForTier(tier: AgentTier): 'v2' | 'v3' | 'v4' | null {
  switch (tier) {
    case 'startup':
      return 'v2'
    case 'teams':
      return 'v3'
    case 'enterprise':
      return 'v4'
    case 'none':
      return null
  }
}

/**
 * Check if a user can access agents from a specific product line (EXCLUSIVE)
 */
export function canAccessProductLine(
  userTier: AgentTier,
  productLine: 'v2' | 'v3' | 'v4'
): boolean {
  if (userTier === 'none') return false
  // Exclusive: each tier only accesses its own product line
  if (userTier === 'startup' && productLine === 'v2') return true
  if (userTier === 'teams' && productLine === 'v3') return true
  if (userTier === 'enterprise' && productLine === 'v4') return true
  return false
}

/**
 * Get display name for an agent tier
 */
export function getAgentTierDisplayName(tier: AgentTier): string {
  const names: Record<AgentTier, string> = {
    none: 'No Agents',
    startup: 'Lean Startup',
    teams: 'Teams',
    enterprise: 'Enterprise',
  }
  return names[tier]
}

/**
 * Get the product line display name
 */
export function getProductLineDisplayName(productLine: 'v2' | 'v3' | 'v4'): string {
  const names: Record<'v2' | 'v3' | 'v4', string> = {
    v2: 'DreamTeam V2',
    v3: 'DreamTeam V3',
    v4: 'DreamTeam V4',
  }
  return names[productLine]
}
