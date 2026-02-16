import { createAdminClient } from '@/lib/supabase-server'
import { stripe, STRIPE_PRICES } from '@/lib/stripe'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
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
  agent_tier_pending: AgentTier | null
  agent_tier_pending_effective_at: string | null
  agent_status: SubscriptionStatus | null
  agent_period_end: string | null
  trial_start: string | null
  trial_end: string | null
  included_users: number
  current_user_count: number
  storage_limit_gb: number
  storage_used_gb: number
  // Payment method fields for card-on-file
  default_payment_method_id: string | null
  payment_method_last4: string | null
  payment_method_brand: string | null
  payment_method_exp_month: number | null
  payment_method_exp_year: number | null
  payment_method_updated_at: string | null
  created_at: string
  updated_at: string
}

export interface DirectChargeResult {
  success: boolean
  paymentIntentId?: string
  clientSecret?: string // For 3DS completion on frontend
  requiresAction?: boolean
  error?: string
  errorCode?: string
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

async function invoiceProrationNow(params: {
  subscriptionId: string
  customerId: string
  reason: 'agent_tier_upgrade'
}): Promise<{ invoiceId?: string; amountDue?: number; status?: string; error?: string }> {
  const { subscriptionId, customerId } = params

  try {
    const existingDrafts = await getStripe().invoices.list({
      subscription: subscriptionId,
      status: 'draft',
      limit: 1,
    })

    let invoice = existingDrafts.data[0] || null

    if (!invoice) {
      invoice = await getStripe().invoices.create({
        customer: customerId,
        subscription: subscriptionId,
        auto_advance: true,
      })
    }

    if (invoice.status === 'draft') {
      invoice = await getStripe().invoices.finalizeInvoice(invoice.id)
    }

    if (invoice.amount_due > 0 && invoice.status !== 'paid') {
      invoice = await getStripe().invoices.pay(invoice.id)
    }

    return {
      invoiceId: invoice.id,
      amountDue: invoice.amount_due,
      status: invoice.status || undefined,
    }
  } catch (error) {
    console.error('[billing] Failed to invoice proration immediately:', error)
    return {
      error: error instanceof Error ? error.message : 'failed_to_invoice_proration',
    }
  }
}

const AGENT_SUB_ACTIVE_STATUSES = new Set<SubscriptionStatus>([
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'incomplete',
])

const AGENT_SUB_STATUS_PRIORITY: Record<string, number> = {
  active: 0,
  trialing: 1,
  past_due: 2,
  unpaid: 3,
  incomplete: 4,
}

let cachedAgentTierPriceIds: { value: Set<string>; fetchedAt: number } | null = null

async function getAgentTierPriceIds(): Promise<Set<string>> {
  const now = Date.now()
  if (cachedAgentTierPriceIds && now - cachedAgentTierPriceIds.fetchedAt < 5 * 60 * 1000) {
    return cachedAgentTierPriceIds.value
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('plans')
    .select('stripe_price_id')
    .eq('plan_type', 'agent_tier')
    .eq('is_active', true)
    .not('stripe_price_id', 'is', null)

  const priceIds = new Set<string>(
    (data || [])
      .map((row: { stripe_price_id?: string | null }) => row.stripe_price_id || null)
      .filter((value: string | null): value is string => Boolean(value))
  )

  // Fallback to static price map if plans table is missing entries
  Object.values(STRIPE_PRICES.agents || {}).forEach((value) => {
    if (typeof value === 'string' && value.trim().length > 0) {
      priceIds.add(value)
    }
  })

  cachedAgentTierPriceIds = { value: priceIds, fetchedAt: now }
  return priceIds
}

function isAgentTierSubscription(subscription: Stripe.Subscription, agentTierPriceIds: Set<string>): boolean {
  if (subscription.metadata?.type === 'agent_tier') return true
  const items = subscription.items?.data || []
  return items.some((item) => agentTierPriceIds.has(item.price.id))
}

function pickPrimaryAgentTierSubscription(
  subscriptions: Stripe.Subscription[],
  preferredId?: string
): Stripe.Subscription | null {
  if (!subscriptions.length) return null
  if (preferredId) {
    const preferred = subscriptions.find((sub) => sub.id === preferredId)
    if (preferred) return preferred
  }

  const sorted = [...subscriptions].sort((a, b) => {
    const statusPriority =
      (AGENT_SUB_STATUS_PRIORITY[a.status] ?? 99) - (AGENT_SUB_STATUS_PRIORITY[b.status] ?? 99)
    if (statusPriority !== 0) return statusPriority
    return (b.created || 0) - (a.created || 0)
  })

  return sorted[0] || null
}

export async function resolveAgentTierSubscription(
  customerId: string,
  preferredId?: string
): Promise<{ primary: Stripe.Subscription | null; canceled: string[] }> {
  const agentTierPriceIds = await getAgentTierPriceIds()

  const subscriptions = await getStripe().subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 100,
  })

  const agentTierSubscriptions = subscriptions.data.filter((subscription) =>
    isAgentTierSubscription(subscription, agentTierPriceIds)
  )

  const activeAgentTierSubscriptions = agentTierSubscriptions.filter((subscription) =>
    AGENT_SUB_ACTIVE_STATUSES.has(subscription.status as SubscriptionStatus)
  )

  if (activeAgentTierSubscriptions.length <= 1) {
    return { primary: activeAgentTierSubscriptions[0] || null, canceled: [] }
  }

  const primary = pickPrimaryAgentTierSubscription(activeAgentTierSubscriptions, preferredId)
  if (!primary) {
    return { primary: null, canceled: [] }
  }

  const toCancel = activeAgentTierSubscriptions.filter((sub) => sub.id !== primary.id)
  const canceled: string[] = []

  for (const sub of toCancel) {
    try {
      await getStripe().subscriptions.cancel(sub.id, { invoice_now: false, prorate: false })
      canceled.push(sub.id)
      console.warn(
        `[billing] Canceled duplicate agent-tier subscription ${sub.id} for customer ${customerId}`
      )
    } catch (error) {
      console.error(
        `[billing] Failed to cancel duplicate agent-tier subscription ${sub.id} for customer ${customerId}:`,
        error
      )
    }
  }

  return { primary, canceled }
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
  const customer = await getStripe().customers.create({
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
  const existingBilling = type === 'agent_tier' ? await getWorkspaceBilling(workspaceId) : null

  // Get subscription details from Stripe
  // Note: current_period_start/end are still returned by the API but removed from SDK types in v20+.
  // Use indexed access for these deprecated-but-present fields.
  const sub = await getStripe().subscriptions.retrieve(subscriptionId)
  // current_period_start/end still returned by API but removed from SDK types in v20+
  const subRecord = sub as unknown as Record<string, unknown>

  // Helper to safely convert Unix timestamp to ISO string
  const timestampToISO = (timestamp: number | null | undefined): string | null => {
    if (timestamp == null || !Number.isFinite(timestamp)) return null
    return new Date(timestamp * 1000).toISOString()
  }

  if (type === 'workspace_plan') {
    await supabase
      .from('workspace_billing')
      .update({
        stripe_subscription_id: subscriptionId,
        plan: (targetPlan as WorkspacePlan) || 'monthly',
        plan_status: sub.status as SubscriptionStatus,
        plan_period_start: timestampToISO(subRecord.current_period_start as number | null),
        plan_period_end: timestampToISO(subRecord.current_period_end as number | null),
        plan_cancel_at_period_end: sub.cancel_at_period_end,
        trial_start: timestampToISO(sub.trial_start),
        trial_end: timestampToISO(sub.trial_end),
      })
      .eq('workspace_id', workspaceId)
  } else if (type === 'agent_tier') {
    const pendingTier = existingBilling?.agent_tier_pending || null
    const keepCurrentTier = !!pendingTier
    const currentTier = (existingBilling?.agent_tier as AgentTier) || 'none'
    const targetTier = (targetPlan as AgentTier | undefined)
    const isDowngrade = !!targetTier && getTierLevel(targetTier) < getTierLevel(currentTier)
    const isActive = sub.status === 'active'

    if (isDowngrade) {
      await supabase
        .from('workspace_billing')
        .update({
          stripe_agent_subscription_id: subscriptionId,
          agent_status: sub.status as SubscriptionStatus,
          agent_period_end: timestampToISO(subRecord.current_period_end as number | null),
          agent_tier_pending: targetTier,
          agent_tier_pending_effective_at: timestampToISO(subRecord.current_period_end as number | null),
        })
        .eq('workspace_id', workspaceId)
      return
    }

    if (!isActive && targetTier) {
      await supabase
        .from('workspace_billing')
        .update({
          stripe_agent_subscription_id: subscriptionId,
          agent_status: sub.status as SubscriptionStatus,
          agent_period_end: timestampToISO(subRecord.current_period_end as number | null),
          agent_tier_pending: targetTier,
          agent_tier_pending_effective_at: timestampToISO(subRecord.current_period_end as number | null),
        })
        .eq('workspace_id', workspaceId)
      return
    }

    await supabase
      .from('workspace_billing')
      .update({
        stripe_agent_subscription_id: subscriptionId,
        agent_tier: keepCurrentTier
          ? (existingBilling?.agent_tier as AgentTier) || 'none'
          : (targetPlan as AgentTier) || existingBilling?.agent_tier || 'none',
        agent_status: sub.status as SubscriptionStatus,
        agent_period_end: timestampToISO(subRecord.current_period_end as number | null),
        ...(keepCurrentTier
          ? {
              agent_tier_pending: existingBilling?.agent_tier_pending || null,
              agent_tier_pending_effective_at: existingBilling?.agent_tier_pending_effective_at || null,
            }
          : { agent_tier_pending: null, agent_tier_pending_effective_at: null }),
      })
      .eq('workspace_id', workspaceId)
  }
}

/**
 * Sync billing state from an already-fetched Stripe subscription
 */
export async function syncBillingFromStripeSubscription(
  workspaceId: string,
  subscription: Stripe.Subscription,
  type: 'workspace_plan' | 'agent_tier',
  targetPlan?: string
): Promise<void> {
  const supabase = createAdminClient()
  const existingBilling = await getWorkspaceBilling(workspaceId)

  const timestampToISO = (timestamp: number | null | undefined): string | null => {
    if (timestamp == null || !Number.isFinite(timestamp)) return null
    return new Date(timestamp * 1000).toISOString()
  }

  // Cast subscription to access period properties that may not be in newer Stripe types
  const sub = subscription as unknown as {
    id: string
    status: string
    current_period_start: number
    current_period_end: number
    cancel_at_period_end: boolean
    trial_start?: number | null
    trial_end?: number | null
  }

  if (type === 'workspace_plan') {
    await supabase
      .from('workspace_billing')
      .update({
        stripe_subscription_id: sub.id,
        plan: (targetPlan as WorkspacePlan) || existingBilling?.plan || 'monthly',
        plan_status: sub.status as SubscriptionStatus,
        plan_period_start: timestampToISO(sub.current_period_start),
        plan_period_end: timestampToISO(sub.current_period_end),
        plan_cancel_at_period_end: sub.cancel_at_period_end,
        trial_start: timestampToISO(sub.trial_start),
        trial_end: timestampToISO(sub.trial_end),
      })
      .eq('workspace_id', workspaceId)
  } else if (type === 'agent_tier') {
    const pendingTier = existingBilling?.agent_tier_pending || null
    const keepCurrentTier = !!pendingTier
    const currentTier = (existingBilling?.agent_tier as AgentTier) || 'none'
    const targetTier = (targetPlan as AgentTier | undefined)
    const isDowngrade = !!targetTier && getTierLevel(targetTier) < getTierLevel(currentTier)
    const isActive = sub.status === 'active'

    if (isDowngrade) {
      await supabase
        .from('workspace_billing')
        .update({
          stripe_agent_subscription_id: sub.id,
          agent_status: sub.status as SubscriptionStatus,
          agent_period_end: timestampToISO(sub.current_period_end),
          agent_tier_pending: targetTier,
          agent_tier_pending_effective_at: timestampToISO(sub.current_period_end),
        })
        .eq('workspace_id', workspaceId)
      return
    }

    if (!isActive && targetTier) {
      await supabase
        .from('workspace_billing')
        .update({
          stripe_agent_subscription_id: sub.id,
          agent_status: sub.status as SubscriptionStatus,
          agent_period_end: timestampToISO(sub.current_period_end),
          agent_tier_pending: targetTier,
          agent_tier_pending_effective_at: timestampToISO(sub.current_period_end),
        })
        .eq('workspace_id', workspaceId)
      return
    }

    await supabase
      .from('workspace_billing')
      .update({
        stripe_agent_subscription_id: sub.id,
        agent_tier: keepCurrentTier
          ? (existingBilling?.agent_tier as AgentTier) || 'none'
          : (targetPlan as AgentTier) || existingBilling?.agent_tier || 'none',
        agent_status: sub.status as SubscriptionStatus,
        agent_period_end: timestampToISO(sub.current_period_end),
        ...(keepCurrentTier
          ? {
              agent_tier_pending: existingBilling?.agent_tier_pending || null,
              agent_tier_pending_effective_at: existingBilling?.agent_tier_pending_effective_at || null,
            }
          : { agent_tier_pending: null, agent_tier_pending_effective_at: null }),
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
        agent_tier_pending: null,
        agent_tier_pending_effective_at: null,
      })
      .eq('workspace_id', workspaceId)

    // Mark active deployment as canceled
    const { error: deployError } = await supabase
      .from('workspace_deployed_teams')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')

    if (deployError) {
      console.error(`[handleSubscriptionCanceled] Failed to cancel deployment for workspace ${workspaceId}:`, deployError)
    }

    // Disable all non-template schedules
    const { error: scheduleError } = await supabase
      .from('agent_schedules')
      .update({ is_enabled: false, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('is_template', false)

    if (scheduleError) {
      console.error(`[handleSubscriptionCanceled] Failed to disable schedules for workspace ${workspaceId}:`, scheduleError)
    }
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
    const stripeInvoices = await getStripe().invoices.list({
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
  newPriceId: string,
  options?: {
    prorationBehavior?: 'create_prorations' | 'none'
    deferDeployment?: boolean
    pendingEffectiveAt?: string | null
  }
): Promise<{
  success: boolean
  error?: string
  status?: SubscriptionStatus
  periodEnd?: string | null
  deferred?: boolean
  prorationInvoiceFailed?: boolean
  deploymentFailed?: boolean
}> {
  const supabase = createAdminClient()

  try {
    console.log(`[updateAgentTierSubscription] Updating subscription ${subscriptionId} to tier ${newTier} with price ${newPriceId}`)

    // Get current subscription to find the item ID
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id

    const resolved = customerId
      ? await resolveAgentTierSubscription(customerId, subscriptionId)
      : { primary: null, canceled: [] }

    const subscriptionToUse = resolved.primary || subscription
    const subscriptionIdToUse = subscriptionToUse.id
    const itemId = subscriptionToUse.items.data[0]?.id

    if (subscriptionIdToUse !== subscriptionId) {
      console.warn(
        `[updateAgentTierSubscription] Using resolved subscription ${subscriptionIdToUse} instead of ${subscriptionId}`
      )
    }

    if (!itemId) {
      return { success: false, error: 'Subscription item not found' }
    }

    // Update the subscription with proration
    const updatedSubResponse = await getStripe().subscriptions.update(subscriptionIdToUse, {
      items: [{
        id: itemId,
        price: newPriceId,
      }],
      proration_behavior: options?.prorationBehavior || 'create_prorations',
      metadata: {
        workspace_id: workspaceId,
        type: 'agent_tier',
        agent_tier: newTier,
      },
    })
    // Access properties from the response with validation
    const periodEnd = (updatedSubResponse as unknown as { current_period_end?: number }).current_period_end
    let agentPeriodEnd: string | null
    if (typeof periodEnd === 'number' && periodEnd > 0 && Number.isFinite(periodEnd)) {
      agentPeriodEnd = new Date(periodEnd * 1000).toISOString()
    } else {
      // Fallback: 30 days from now for monthly billing
      console.warn('Invalid current_period_end from Stripe:', periodEnd, 'Using fallback date')
      const fallbackDate = new Date()
      fallbackDate.setDate(fallbackDate.getDate() + 30)
      agentPeriodEnd = fallbackDate.toISOString()
    }

    const status = updatedSubResponse.status as SubscriptionStatus
    const shouldApplyNow = status === 'active' && !options?.deferDeployment
    const billingSnapshot = await getWorkspaceBilling(workspaceId)
    const currentTier = billingSnapshot?.agent_tier || 'none'
    const isUpgrade = getTierLevel(newTier) > getTierLevel(currentTier)
    let prorationInvoiceFailed = false

    let deploymentFailed = false

    if (shouldApplyNow) {
      await supabase
        .from('workspace_billing')
        .update({
          stripe_agent_subscription_id: subscriptionIdToUse,
          agent_tier: newTier,
          agent_status: status,
          agent_period_end: agentPeriodEnd,
          agent_tier_pending: null,
          agent_tier_pending_effective_at: null,
          agent_deploy_status: 'pending',
          agent_deploy_error: null,
          agent_deploy_attempted_at: new Date().toISOString(),
        })
        .eq('workspace_id', workspaceId)

      if (isUpgrade && customerId) {
        const prorationResult = await invoiceProrationNow({
          subscriptionId: subscriptionIdToUse,
          customerId,
          reason: 'agent_tier_upgrade',
        })
        if (prorationResult.error) {
          prorationInvoiceFailed = true
        }
      }

      // Deploy new team for upgraded tier (synchronous with status tracking)
      try {
        const deployResult = await autoDeployTeamForPlan(workspaceId, newTier)
        if (!deployResult.deployed) {
          console.error(`[updateAgentTierSubscription] Auto-deploy failed for ${workspaceId}:`, deployResult.error)
          deploymentFailed = true
          await supabase
            .from('workspace_billing')
            .update({ agent_deploy_status: 'failed', agent_deploy_error: deployResult.error || 'deploy_failed' })
            .eq('workspace_id', workspaceId)
          await supabase.from('billing_alerts').insert({
            workspace_id: workspaceId,
            alert_type: 'deploy_failed',
            severity: 'high',
            title: 'Agent deployment failed',
            description: `Auto-deploy failed after tier change to ${newTier}: ${deployResult.error || 'unknown error'}`,
          })
        } else {
          console.log(`[updateAgentTierSubscription] Auto-deploy succeeded for ${workspaceId}`)
          await supabase
            .from('workspace_billing')
            .update({ agent_deploy_status: 'deployed', agent_deploy_error: null })
            .eq('workspace_id', workspaceId)
        }
      } catch (err) {
        console.error(`[updateAgentTierSubscription] Auto-deploy error for ${workspaceId}:`, err)
        deploymentFailed = true
        const errMsg = err instanceof Error ? err.message : 'unknown error'
        await supabase
          .from('workspace_billing')
          .update({ agent_deploy_status: 'failed', agent_deploy_error: errMsg })
          .eq('workspace_id', workspaceId)
        await supabase.from('billing_alerts').insert({
          workspace_id: workspaceId,
          alert_type: 'deploy_failed',
          severity: 'high',
          title: 'Agent deployment failed',
          description: `Auto-deploy threw error after tier change to ${newTier}: ${errMsg}`,
        })
      }
    } else {
      const pendingEffectiveAt =
        options?.pendingEffectiveAt !== undefined
          ? options.pendingEffectiveAt
          : options?.deferDeployment
            ? agentPeriodEnd
            : null

      await supabase
        .from('workspace_billing')
        .update({
          stripe_agent_subscription_id: subscriptionIdToUse,
          agent_status: status,
          agent_period_end: agentPeriodEnd,
          agent_tier_pending: newTier,
          agent_tier_pending_effective_at: pendingEffectiveAt,
        })
        .eq('workspace_id', workspaceId)
    }

    return {
      success: true,
      status,
      periodEnd: agentPeriodEnd,
      deferred: !shouldApplyNow,
      ...(prorationInvoiceFailed ? { prorationInvoiceFailed: true } : {}),
      ...(deploymentFailed ? { deploymentFailed: true } : {}),
    }
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

// =============================================================================
// PAYMENT METHOD FUNCTIONS
// =============================================================================

/**
 * Save a payment method for card-on-file payments
 * Retrieves card details from Stripe and stores in database
 */
export async function savePaymentMethod(
  workspaceId: string,
  paymentMethodId: string
): Promise<void> {
  console.log(`[savePaymentMethod] Starting for workspace ${workspaceId}, PM: ${paymentMethodId}`)
  const supabase = createAdminClient()

  // Get payment method details from Stripe
  console.log(`[savePaymentMethod] Retrieving payment method from Stripe...`)
  const paymentMethod = await getStripe().paymentMethods.retrieve(paymentMethodId)
  console.log(`[savePaymentMethod] Payment method type: ${paymentMethod.type}`)

  if (paymentMethod.type !== 'card' || !paymentMethod.card) {
    throw new Error('Payment method is not a card')
  }

  const card = paymentMethod.card
  console.log(`[savePaymentMethod] Card: ${card.brand} ****${card.last4} exp ${card.exp_month}/${card.exp_year}`)

  // Get billing record to find Stripe customer ID
  console.log(`[savePaymentMethod] Getting workspace billing record...`)
  const billing = await getWorkspaceBilling(workspaceId)
  if (!billing?.stripe_customer_id) {
    console.error(`[savePaymentMethod] No stripe_customer_id found for workspace ${workspaceId}`)
    throw new Error('No Stripe customer ID for workspace')
  }
  console.log(`[savePaymentMethod] Found Stripe customer: ${billing.stripe_customer_id}`)

  // Attach payment method to customer if not already attached
  try {
    await getStripe().paymentMethods.attach(paymentMethodId, {
      customer: billing.stripe_customer_id,
    })
  } catch (err: unknown) {
    // Ignore if already attached - Stripe may use different error codes
    const stripeErr = err as { code?: string; message?: string }
    const isAlreadyAttached =
      stripeErr.code === 'resource_already_exists' ||
      stripeErr.code === 'payment_method_already_attached' ||
      stripeErr.message?.includes('already been attached')
    if (!isAlreadyAttached) {
      console.error('Error attaching payment method:', stripeErr.code, stripeErr.message)
      throw err
    }
    console.log('Payment method already attached to customer, continuing...')
  }

  // Set as default payment method for the customer
  console.log(`[savePaymentMethod] Setting as default payment method for customer...`)
  await getStripe().customers.update(billing.stripe_customer_id, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  })
  console.log(`[savePaymentMethod] Successfully set default payment method in Stripe`)

  // Store in database
  console.log(`[savePaymentMethod] Storing payment method in database...`)
  const { error: updateError } = await supabase
    .from('workspace_billing')
    .update({
      default_payment_method_id: paymentMethodId,
      payment_method_last4: card.last4,
      payment_method_brand: card.brand,
      payment_method_exp_month: card.exp_month,
      payment_method_exp_year: card.exp_year,
      payment_method_updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)

  if (updateError) {
    console.error(`[savePaymentMethod] Database update failed:`, updateError)
    throw new Error(`Failed to save payment method to database: ${updateError.message}`)
  }
  console.log(`[savePaymentMethod] Successfully saved payment method to database for workspace ${workspaceId}`)
}

/**
 * Save payment method from a completed PaymentIntent
 * Used by webhook after checkout.session.completed
 *
 * NOTE: Saved payment method data is a snapshot at save time.
 * Stripe validates the method at charge time and rejects if invalid.
 * TODO: Consider listening to `payment_method.detached` / `payment_method.updated`
 * webhook events to proactively sync stale payment method state.
 */
export async function savePaymentMethodFromIntent(
  workspaceId: string,
  paymentIntentId: string
): Promise<void> {
  console.log(`[savePaymentMethodFromIntent] Starting for workspace ${workspaceId}, PI: ${paymentIntentId}`)

  // Get the PaymentIntent to find the payment method
  const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId, {
    expand: ['payment_method'],
  })

  console.log(`[savePaymentMethodFromIntent] PaymentIntent status: ${paymentIntent.status}`)
  console.log(`[savePaymentMethodFromIntent] payment_method type: ${typeof paymentIntent.payment_method}`)

  const paymentMethodId =
    typeof paymentIntent.payment_method === 'string'
      ? paymentIntent.payment_method
      : paymentIntent.payment_method?.id

  if (!paymentMethodId) {
    console.error(`[savePaymentMethodFromIntent] No payment method found. Raw value:`, paymentIntent.payment_method)
    throw new Error('No payment method found on PaymentIntent')
  }

  console.log(`[savePaymentMethodFromIntent] Found payment method: ${paymentMethodId}`)
  await savePaymentMethod(workspaceId, paymentMethodId)
  console.log(`[savePaymentMethodFromIntent] Successfully saved payment method for workspace ${workspaceId}`)
}

/**
 * Remove saved payment method
 * Detaches from Stripe customer and clears database fields
 */
export async function removePaymentMethod(workspaceId: string): Promise<void> {
  const supabase = createAdminClient()

  const billing = await getWorkspaceBilling(workspaceId)

  if (billing?.default_payment_method_id) {
    // Detach from Stripe customer
    try {
      await getStripe().paymentMethods.detach(billing.default_payment_method_id)
    } catch (err) {
      // Ignore if already detached
      console.error('Error detaching payment method:', err)
    }
  }

  // Clear database fields
  await supabase
    .from('workspace_billing')
    .update({
      default_payment_method_id: null,
      payment_method_last4: null,
      payment_method_brand: null,
      payment_method_exp_month: null,
      payment_method_exp_year: null,
      payment_method_updated_at: null,
    })
    .eq('workspace_id', workspaceId)
}

/**
 * Check if workspace has a saved payment method
 */
export async function hasPaymentMethodSaved(workspaceId: string): Promise<boolean> {
  const billing = await getWorkspaceBilling(workspaceId)
  return !!(billing?.default_payment_method_id && billing?.payment_method_last4)
}

/**
 * Create a direct charge using the saved payment method
 * Returns immediately for successful charges, or client_secret for 3DS
 */
export async function createDirectCharge(
  workspaceId: string,
  amountCents: number,
  metadata: {
    type: 'sms_credits' | 'call_minutes'
    bundle: string
    credits_or_minutes: number
    auto_replenish_attempt_id?: string
  }
): Promise<DirectChargeResult> {
  const billing = await getWorkspaceBilling(workspaceId)

  if (!billing?.stripe_customer_id) {
    return { success: false, error: 'No Stripe customer', errorCode: 'no_customer' }
  }

  if (!billing.default_payment_method_id) {
    return { success: false, error: 'No payment method on file', errorCode: 'no_payment_method' }
  }

  try {
    // Create and confirm PaymentIntent in one call
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: billing.stripe_customer_id,
      payment_method: billing.default_payment_method_id,
      off_session: true, // Customer is not present
      confirm: true, // Confirm immediately
      metadata: {
        workspace_id: workspaceId,
        type: metadata.type,
        bundle: metadata.bundle,
        credits_or_minutes: metadata.credits_or_minutes.toString(),
        direct_charge: 'true',
        auto_replenish_attempt_id: metadata.auto_replenish_attempt_id || '',
      },
    })

    if (paymentIntent.status === 'succeeded') {
      return {
        success: true,
        paymentIntentId: paymentIntent.id,
      }
    }

    if (paymentIntent.status === 'requires_action') {
      // 3DS required - return client_secret for frontend handling
      return {
        success: false,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || undefined,
        requiresAction: true,
        error: '3D Secure authentication required',
        errorCode: 'requires_action',
      }
    }

    // Other statuses (processing, requires_payment_method, etc.)
    return {
      success: false,
      paymentIntentId: paymentIntent.id,
      error: `Payment status: ${paymentIntent.status}`,
      errorCode: paymentIntent.status,
    }
  } catch (err: unknown) {
    const stripeErr = err as {
      type?: string
      code?: string
      message?: string
      payment_intent?: { id: string; client_secret: string }
    }

    // Handle card errors
    if (stripeErr.type === 'StripeCardError') {
      // Check if 3DS is required
      if (stripeErr.code === 'authentication_required' && stripeErr.payment_intent) {
        return {
          success: false,
          paymentIntentId: stripeErr.payment_intent.id,
          clientSecret: stripeErr.payment_intent.client_secret,
          requiresAction: true,
          error: '3D Secure authentication required',
          errorCode: 'requires_action',
        }
      }

      return {
        success: false,
        error: stripeErr.message || 'Card was declined',
        errorCode: stripeErr.code || 'card_declined',
      }
    }

    // Re-throw unexpected errors
    throw err
  }
}

/**
 * Create a Stripe SetupIntent for adding/updating payment method
 * Returns client_secret for frontend Stripe Elements
 */
export async function createSetupIntent(workspaceId: string): Promise<{ clientSecret: string }> {
  const billing = await getWorkspaceBilling(workspaceId)

  if (!billing?.stripe_customer_id) {
    throw new Error('No Stripe customer for workspace')
  }

  const setupIntent = await getStripe().setupIntents.create({
    customer: billing.stripe_customer_id,
    payment_method_types: ['card'],
    usage: 'off_session',
    metadata: {
      workspace_id: workspaceId,
    },
  })

  if (!setupIntent.client_secret) {
    throw new Error('Failed to create SetupIntent')
  }

  return { clientSecret: setupIntent.client_secret }
}

// =============================================================================
// AGENT TIER SUBSCRIPTION CREATION (Card-on-File)
// =============================================================================

export interface AgentTierSubscriptionResult {
  success: boolean
  subscriptionId?: string
  error?: string
  requiresAction?: boolean
  clientSecret?: string
  deploymentFailed?: boolean
  deploymentError?: string
}

/**
 * Create an agent tier subscription using a saved payment method
 * This allows first-time purchases without redirecting to Stripe Checkout
 * when the user already has a card on file.
 *
 * IMPORTANT: This function now checks for existing agent tier subscriptions in Stripe
 * to prevent duplicate subscriptions when the database is out of sync.
 */
export async function createAgentTierSubscription(
  workspaceId: string,
  tier: AgentTier,
  priceId: string
): Promise<AgentTierSubscriptionResult> {
  const supabase = createAdminClient()

  try {
    console.log(`[createAgentTierSubscription] Starting for workspace ${workspaceId}, tier ${tier}, price ${priceId}`)

    // Get billing record to retrieve customer and payment method
    const billing = await getWorkspaceBilling(workspaceId)

    if (!billing?.stripe_customer_id) {
      return { success: false, error: 'No Stripe customer for workspace' }
    }

    if (!billing.default_payment_method_id) {
      return { success: false, error: 'No payment method on file' }
    }

    // Check for existing agent tier subscription in Stripe
    // This handles database sync issues where stripe_agent_subscription_id is null
    // and also de-dupes any accidental multiple subscriptions.
    console.log(
      `[createAgentTierSubscription] Checking for existing subscriptions for customer ${billing.stripe_customer_id}`
    )
    const { primary: existingAgentSub } = await resolveAgentTierSubscription(billing.stripe_customer_id)

    if (existingAgentSub) {
      console.log(`[createAgentTierSubscription] Found existing agent subscription ${existingAgentSub.id}, updating instead of creating new`)

      // Update existing subscription instead of creating new
      const itemId = existingAgentSub.items.data[0]?.id
      if (itemId) {
        const updatedSubResponse = await getStripe().subscriptions.update(existingAgentSub.id, {
          items: [{ id: itemId, price: priceId }],
          proration_behavior: 'create_prorations',
          metadata: {
            workspace_id: workspaceId,
            type: 'agent_tier',
            agent_tier: tier,
          },
        })

        // Sync subscription ID to database (in case it was missing)
        // Access properties from the response with validation (same pattern as updateAgentTierSubscription)
        const periodEndTs = (updatedSubResponse as unknown as { current_period_end?: number }).current_period_end
        let agentPeriodEnd: string | null = null
        if (typeof periodEndTs === 'number' && periodEndTs > 0 && Number.isFinite(periodEndTs)) {
          agentPeriodEnd = new Date(periodEndTs * 1000).toISOString()
        }

        const status = updatedSubResponse.status as SubscriptionStatus
        let existingSubDeployFailed = false

        if (status === 'active') {
          const billingSnapshot = await getWorkspaceBilling(workspaceId)
          const currentTier = billingSnapshot?.agent_tier || 'none'
          const isUpgrade = getTierLevel(tier) > getTierLevel(currentTier)

          await supabase
            .from('workspace_billing')
            .update({
              stripe_agent_subscription_id: updatedSubResponse.id,
              agent_tier: tier,
              agent_status: status,
              agent_period_end: agentPeriodEnd,
              agent_tier_pending: null,
              agent_tier_pending_effective_at: null,
              agent_deploy_status: 'pending',
              agent_deploy_error: null,
              agent_deploy_attempted_at: new Date().toISOString(),
            })
            .eq('workspace_id', workspaceId)

          console.log(`[createAgentTierSubscription] Updated existing subscription ${updatedSubResponse.id}, synced to database`)

          if (isUpgrade && billingSnapshot?.stripe_customer_id) {
            await invoiceProrationNow({
              subscriptionId: updatedSubResponse.id,
              customerId: billingSnapshot.stripe_customer_id,
              reason: 'agent_tier_upgrade',
            })
          }

          // Deploy agents for the new tier (synchronous with status tracking)
          try {
            const deployResult = await autoDeployTeamForPlan(workspaceId, tier)
            if (!deployResult.deployed) {
              console.error(`[createAgentTierSubscription] Auto-deploy failed for ${workspaceId}:`, deployResult.error)
              existingSubDeployFailed = true
              await supabase
                .from('workspace_billing')
                .update({ agent_deploy_status: 'failed', agent_deploy_error: deployResult.error || 'deploy_failed' })
                .eq('workspace_id', workspaceId)
              await supabase.from('billing_alerts').insert({
                workspace_id: workspaceId,
                alert_type: 'deploy_failed',
                severity: 'high',
                title: 'Agent deployment failed',
                description: `Auto-deploy failed after subscription update to ${tier}: ${deployResult.error || 'unknown error'}`,
              })
            } else {
              console.log(`[createAgentTierSubscription] Auto-deploy succeeded for ${workspaceId}`)
              await supabase
                .from('workspace_billing')
                .update({ agent_deploy_status: 'deployed', agent_deploy_error: null })
                .eq('workspace_id', workspaceId)
            }
          } catch (err) {
            console.error(`[createAgentTierSubscription] Auto-deploy error for ${workspaceId}:`, err)
            existingSubDeployFailed = true
            const errMsg = err instanceof Error ? err.message : 'unknown error'
            await supabase
              .from('workspace_billing')
              .update({ agent_deploy_status: 'failed', agent_deploy_error: errMsg })
              .eq('workspace_id', workspaceId)
            await supabase.from('billing_alerts').insert({
              workspace_id: workspaceId,
              alert_type: 'deploy_failed',
              severity: 'high',
              title: 'Agent deployment failed',
              description: `Auto-deploy threw error after subscription update to ${tier}: ${errMsg}`,
            })
          }
        } else {
          await supabase
            .from('workspace_billing')
            .update({
              stripe_agent_subscription_id: updatedSubResponse.id,
              agent_status: status,
              agent_period_end: agentPeriodEnd,
              agent_tier_pending: tier,
              agent_tier_pending_effective_at: agentPeriodEnd,
            })
            .eq('workspace_id', workspaceId)
        }

        return {
          success: true,
          subscriptionId: updatedSubResponse.id,
          ...(existingSubDeployFailed ? { deploymentFailed: true } : {}),
        }
      }
    }

    // No existing subscription found - create new one
    console.log(`[createAgentTierSubscription] No existing subscription found, creating new for workspace ${workspaceId}, tier: ${tier}`)

    // Create the subscription with the saved payment method
    const subscription = await getStripe().subscriptions.create(
      {
        customer: billing.stripe_customer_id,
        items: [{ price: priceId }],
        default_payment_method: billing.default_payment_method_id,
        payment_behavior: 'error_if_incomplete', // Fail fast if payment fails
        metadata: {
          workspace_id: workspaceId,
          type: 'agent_tier',
          agent_tier: tier,
        },
        expand: ['latest_invoice.payment_intent'],
      },
      {
        idempotencyKey: `create-agent-sub-${workspaceId}-${tier}-${priceId}`,
      }
    )

    console.log(`[createAgentTierSubscription] Subscription created: ${subscription.id}, status: ${subscription.status}`)

    // Check if 3DS is required
    if (subscription.status === 'incomplete') {
      // Access the expanded latest_invoice
      const invoice = subscription.latest_invoice as unknown as {
        payment_intent?: {
          status: string
          client_secret: string
        }
      }

      if (invoice?.payment_intent?.status === 'requires_action') {
        console.log(`[createAgentTierSubscription] 3DS required for subscription ${subscription.id}`)
        return {
          success: false,
          subscriptionId: subscription.id,
          requiresAction: true,
          clientSecret: invoice.payment_intent.client_secret,
          error: '3D Secure authentication required',
        }
      }

      // Other incomplete status - payment failed
      return {
        success: false,
        subscriptionId: subscription.id,
        error: 'Payment failed. Please try again or use a different card.',
      }
    }

    // Subscription is active - update database
    // Access properties from the response with validation (same pattern as updateAgentTierSubscription)
    const periodEndTs = (subscription as unknown as { current_period_end?: number }).current_period_end
    let periodEnd: string | null = null
    if (typeof periodEndTs === 'number' && periodEndTs > 0 && Number.isFinite(periodEndTs)) {
      periodEnd = new Date(periodEndTs * 1000).toISOString()
    }

    const status = subscription.status as SubscriptionStatus
    let newSubDeployFailed = false

    if (status === 'active') {
      const billingSnapshot = await getWorkspaceBilling(workspaceId)
      const currentTier = billingSnapshot?.agent_tier || 'none'
      const isUpgrade = getTierLevel(tier) > getTierLevel(currentTier)

      await supabase
        .from('workspace_billing')
        .update({
          stripe_agent_subscription_id: subscription.id,
          agent_tier: tier,
          agent_status: status,
          agent_period_end: periodEnd,
          agent_tier_pending: null,
          agent_tier_pending_effective_at: null,
          agent_deploy_status: 'pending',
          agent_deploy_error: null,
          agent_deploy_attempted_at: new Date().toISOString(),
        })
        .eq('workspace_id', workspaceId)

      console.log(`[createAgentTierSubscription] Database updated, deploying agents for tier: ${tier}`)

      if (isUpgrade && billingSnapshot?.stripe_customer_id) {
        await invoiceProrationNow({
          subscriptionId: subscription.id,
          customerId: billingSnapshot.stripe_customer_id,
          reason: 'agent_tier_upgrade',
        })
      }

      // Deploy agents for the new tier (synchronous with status tracking)
      try {
        const deployResult = await autoDeployTeamForPlan(workspaceId, tier)
        if (!deployResult.deployed) {
          console.error(`[createAgentTierSubscription] Auto-deploy failed for ${workspaceId}:`, deployResult.error)
          newSubDeployFailed = true
          await supabase
            .from('workspace_billing')
            .update({ agent_deploy_status: 'failed', agent_deploy_error: deployResult.error || 'deploy_failed' })
            .eq('workspace_id', workspaceId)
          await supabase.from('billing_alerts').insert({
            workspace_id: workspaceId,
            alert_type: 'deploy_failed',
            severity: 'high',
            title: 'Agent deployment failed',
            description: `Auto-deploy failed after new subscription for ${tier}: ${deployResult.error || 'unknown error'}`,
          })
        } else {
          console.log(`[createAgentTierSubscription] Auto-deploy succeeded for ${workspaceId}`)
          await supabase
            .from('workspace_billing')
            .update({ agent_deploy_status: 'deployed', agent_deploy_error: null })
            .eq('workspace_id', workspaceId)
        }
      } catch (err) {
        console.error(`[createAgentTierSubscription] Auto-deploy error for ${workspaceId}:`, err)
        newSubDeployFailed = true
        const errMsg = err instanceof Error ? err.message : 'unknown error'
        await supabase
          .from('workspace_billing')
          .update({ agent_deploy_status: 'failed', agent_deploy_error: errMsg })
          .eq('workspace_id', workspaceId)
        await supabase.from('billing_alerts').insert({
          workspace_id: workspaceId,
          alert_type: 'deploy_failed',
          severity: 'high',
          title: 'Agent deployment failed',
          description: `Auto-deploy threw error after new subscription for ${tier}: ${errMsg}`,
        })
      }

      console.log(`[createAgentTierSubscription] Success - subscription ${subscription.id} active`)
    } else {
      await supabase
        .from('workspace_billing')
        .update({
          stripe_agent_subscription_id: subscription.id,
          agent_status: status,
          agent_period_end: periodEnd,
          agent_tier_pending: tier,
          agent_tier_pending_effective_at: periodEnd,
        })
        .eq('workspace_id', workspaceId)
    }
    return {
      success: true,
      subscriptionId: subscription.id,
      ...(newSubDeployFailed ? { deploymentFailed: true } : {}),
    }
  } catch (error: unknown) {
    console.error('[createAgentTierSubscription] Error:', error)

    const stripeErr = error as {
      type?: string
      code?: string
      message?: string
      payment_intent?: { id: string; client_secret: string }
    }

    // Handle card errors
    if (stripeErr.type === 'StripeCardError') {
      // Check if 3DS is required
      if (stripeErr.code === 'authentication_required' && stripeErr.payment_intent) {
        return {
          success: false,
          requiresAction: true,
          clientSecret: stripeErr.payment_intent.client_secret,
          error: '3D Secure authentication required',
        }
      }

      return {
        success: false,
        error: stripeErr.message || 'Card was declined',
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create subscription',
    }
  }
}
