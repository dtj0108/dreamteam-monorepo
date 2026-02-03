import { createAdminClient } from '@/lib/supabase-server'
import Stripe from 'stripe'

/**
 * Billing Event Categories
 */
export type BillingEventCategory =
  | 'subscription'
  | 'payment'
  | 'tier'
  | 'addon'
  | 'trial'

/**
 * Billing Event Types
 */
export type BillingEventType =
  // Subscription events
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  // Tier events
  | 'tier.upgraded'
  | 'tier.downgraded'
  // Payment events
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.refunded'
  // Trial events
  | 'trial.started'
  | 'trial.converted'
  | 'trial.expired'
  // Add-on events
  | 'addon.purchased'
  | 'addon.auto_replenished'

/**
 * Event source
 */
export type BillingEventSource = 'webhook' | 'api' | 'admin' | 'system'

/**
 * Alert types for billing alerts
 */
export type BillingAlertType =
  | 'payment_failed'
  | 'trial_expiring'
  | 'high_value_churn'
  | 'unusual_activity'

/**
 * Alert severity levels
 */
export type BillingAlertSeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * Input for logging a billing event
 */
export interface LogBillingEventInput {
  workspaceId?: string | null
  userId?: string | null
  eventType: BillingEventType
  eventCategory: BillingEventCategory
  eventData?: Record<string, unknown>
  amountCents?: number | null
  currency?: string
  stripeEventId?: string | null
  stripeObjectId?: string | null
  source?: BillingEventSource
  metadata?: Record<string, unknown>
}

/**
 * Input for creating a billing alert
 */
export interface CreateBillingAlertInput {
  workspaceId?: string | null
  billingEventId?: string | null
  alertType: BillingAlertType
  severity?: BillingAlertSeverity
  title: string
  description?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Log a billing event to the database
 * This is the primary function for tracking all billing activity
 *
 * @param input - Event details to log
 * @returns The created event ID or null if failed
 */
export async function logBillingEvent(
  input: LogBillingEventInput
): Promise<string | null> {
  const supabase = createAdminClient()

  try {
    const { data, error } = await supabase
      .from('billing_events')
      .insert({
        workspace_id: input.workspaceId || null,
        user_id: input.userId || null,
        event_type: input.eventType,
        event_category: input.eventCategory,
        event_data: input.eventData || {},
        amount_cents: input.amountCents || null,
        currency: input.currency || 'usd',
        stripe_event_id: input.stripeEventId || null,
        stripe_object_id: input.stripeObjectId || null,
        source: input.source || 'webhook',
        metadata: input.metadata || {},
      })
      .select('id')
      .single()

    if (error) {
      // Check for duplicate event (Stripe webhook retry)
      if (error.code === '23505' && input.stripeEventId) {
        console.log(`[billing-events] Duplicate event ignored: ${input.stripeEventId}`)
        return null
      }
      console.error('[billing-events] Error logging event:', error)
      return null
    }

    return data?.id || null
  } catch (err) {
    console.error('[billing-events] Exception logging event:', err)
    return null
  }
}

/**
 * Create a billing alert for admin attention
 *
 * @param input - Alert details
 * @returns The created alert ID or null if failed
 */
export async function createBillingAlert(
  input: CreateBillingAlertInput
): Promise<string | null> {
  const supabase = createAdminClient()

  try {
    const { data, error } = await supabase
      .from('billing_alerts')
      .insert({
        workspace_id: input.workspaceId || null,
        billing_event_id: input.billingEventId || null,
        alert_type: input.alertType,
        severity: input.severity || 'medium',
        title: input.title,
        description: input.description || null,
        metadata: input.metadata || {},
      })
      .select('id')
      .single()

    if (error) {
      console.error('[billing-events] Error creating alert:', error)
      return null
    }

    return data?.id || null
  } catch (err) {
    console.error('[billing-events] Exception creating alert:', err)
    return null
  }
}

// ============================================
// HELPER FUNCTIONS FOR COMMON EVENT SCENARIOS
// ============================================

/**
 * Log a subscription created event
 */
export async function logSubscriptionCreated(
  workspaceId: string,
  subscription: Stripe.Subscription,
  stripeEventId: string,
  subscriptionType: 'workspace_plan' | 'agent_tier',
  plan: string
): Promise<string | null> {
  // Access period timestamps via cast since newer Stripe types may not include them
  const subData = subscription as unknown as {
    current_period_start?: number
    current_period_end?: number
  }
  return logBillingEvent({
    workspaceId,
    eventType: 'subscription.created',
    eventCategory: 'subscription',
    eventData: {
      subscription_id: subscription.id,
      subscription_type: subscriptionType,
      plan,
      status: subscription.status,
      current_period_start: subData.current_period_start,
      current_period_end: subData.current_period_end,
    },
    stripeEventId,
    stripeObjectId: subscription.id,
    source: 'webhook',
  })
}

/**
 * Log a subscription updated event
 */
export async function logSubscriptionUpdated(
  workspaceId: string,
  subscription: Stripe.Subscription,
  stripeEventId: string,
  subscriptionType: 'workspace_plan' | 'agent_tier'
): Promise<string | null> {
  const subData = subscription as unknown as { current_period_end?: number }
  return logBillingEvent({
    workspaceId,
    eventType: 'subscription.updated',
    eventCategory: 'subscription',
    eventData: {
      subscription_id: subscription.id,
      subscription_type: subscriptionType,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: subData.current_period_end,
    },
    stripeEventId,
    stripeObjectId: subscription.id,
    source: 'webhook',
  })
}

/**
 * Log a subscription canceled event and create high-value churn alert if needed
 */
export async function logSubscriptionCanceled(
  workspaceId: string,
  subscription: Stripe.Subscription,
  stripeEventId: string,
  subscriptionType: 'workspace_plan' | 'agent_tier'
): Promise<string | null> {
  const eventId = await logBillingEvent({
    workspaceId,
    eventType: 'subscription.canceled',
    eventCategory: 'subscription',
    eventData: {
      subscription_id: subscription.id,
      subscription_type: subscriptionType,
      canceled_at: subscription.canceled_at,
    },
    stripeEventId,
    stripeObjectId: subscription.id,
    source: 'webhook',
  })

  // Create alert for cancellation
  if (eventId) {
    await createBillingAlert({
      workspaceId,
      billingEventId: eventId,
      alertType: 'high_value_churn',
      severity: subscriptionType === 'agent_tier' ? 'high' : 'medium',
      title: `${subscriptionType === 'agent_tier' ? 'Agent Tier' : 'Workspace Plan'} Canceled`,
      description: `Subscription ${subscription.id} was canceled`,
      metadata: { subscription_type: subscriptionType },
    })
  }

  return eventId
}

/**
 * Log a tier upgrade event
 */
export async function logTierUpgraded(
  workspaceId: string,
  fromTier: string,
  toTier: string,
  subscriptionId: string,
  source: BillingEventSource = 'api'
): Promise<string | null> {
  return logBillingEvent({
    workspaceId,
    eventType: 'tier.upgraded',
    eventCategory: 'tier',
    eventData: {
      from_tier: fromTier,
      to_tier: toTier,
      subscription_id: subscriptionId,
    },
    stripeObjectId: subscriptionId,
    source,
  })
}

/**
 * Log a tier downgrade event
 */
export async function logTierDowngraded(
  workspaceId: string,
  fromTier: string,
  toTier: string,
  subscriptionId: string,
  source: BillingEventSource = 'api'
): Promise<string | null> {
  return logBillingEvent({
    workspaceId,
    eventType: 'tier.downgraded',
    eventCategory: 'tier',
    eventData: {
      from_tier: fromTier,
      to_tier: toTier,
      subscription_id: subscriptionId,
    },
    stripeObjectId: subscriptionId,
    source,
  })
}

/**
 * Log a payment succeeded event
 */
export async function logPaymentSucceeded(
  workspaceId: string,
  invoice: Stripe.Invoice,
  stripeEventId: string
): Promise<string | null> {
  const invoiceData = invoice as unknown as { subscription?: string | null }
  return logBillingEvent({
    workspaceId,
    eventType: 'payment.succeeded',
    eventCategory: 'payment',
    eventData: {
      invoice_id: invoice.id,
      subscription_id: invoiceData.subscription,
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
    },
    amountCents: invoice.amount_paid,
    currency: invoice.currency,
    stripeEventId,
    stripeObjectId: invoice.id,
    source: 'webhook',
  })
}

/**
 * Log a payment failed event and create alert
 */
export async function logPaymentFailed(
  workspaceId: string,
  invoice: Stripe.Invoice,
  stripeEventId: string
): Promise<string | null> {
  const invoiceData = invoice as unknown as { subscription?: string | null }
  const eventId = await logBillingEvent({
    workspaceId,
    eventType: 'payment.failed',
    eventCategory: 'payment',
    eventData: {
      invoice_id: invoice.id,
      subscription_id: invoiceData.subscription,
      amount_due: invoice.amount_due,
      attempt_count: invoice.attempt_count,
    },
    amountCents: invoice.amount_due,
    currency: invoice.currency,
    stripeEventId,
    stripeObjectId: invoice.id,
    source: 'webhook',
  })

  // Create alert for failed payment
  if (eventId) {
    const severity: BillingAlertSeverity = invoice.amount_due > 10000 ? 'critical' : 'high'
    await createBillingAlert({
      workspaceId,
      billingEventId: eventId,
      alertType: 'payment_failed',
      severity,
      title: 'Payment Failed',
      description: `Invoice ${invoice.id} failed. Amount: $${(invoice.amount_due / 100).toFixed(2)}`,
      metadata: {
        invoice_id: invoice.id,
        amount_due: invoice.amount_due,
        attempt_count: invoice.attempt_count,
      },
    })
  }

  return eventId
}

/**
 * Log an add-on purchase event
 */
export async function logAddonPurchased(
  workspaceId: string,
  addonType: 'sms_credits' | 'call_minutes',
  bundleType: string,
  amountCents: number,
  sessionId?: string
): Promise<string | null> {
  return logBillingEvent({
    workspaceId,
    eventType: 'addon.purchased',
    eventCategory: 'addon',
    eventData: {
      addon_type: addonType,
      bundle_type: bundleType,
      session_id: sessionId,
    },
    amountCents,
    stripeObjectId: sessionId,
    source: 'webhook',
  })
}

/**
 * Log an auto-replenish event
 */
export async function logAddonAutoReplenished(
  workspaceId: string,
  addonType: 'sms_credits' | 'call_minutes',
  bundleType: string,
  amountCents: number,
  paymentIntentId: string
): Promise<string | null> {
  return logBillingEvent({
    workspaceId,
    eventType: 'addon.auto_replenished',
    eventCategory: 'addon',
    eventData: {
      addon_type: addonType,
      bundle_type: bundleType,
      payment_intent_id: paymentIntentId,
    },
    amountCents,
    stripeObjectId: paymentIntentId,
    source: 'system',
  })
}

/**
 * Log a trial started event
 */
export async function logTrialStarted(
  workspaceId: string,
  subscriptionId: string,
  trialEndDate: number,
  plan: string
): Promise<string | null> {
  return logBillingEvent({
    workspaceId,
    eventType: 'trial.started',
    eventCategory: 'trial',
    eventData: {
      subscription_id: subscriptionId,
      trial_end: trialEndDate,
      plan,
    },
    stripeObjectId: subscriptionId,
    source: 'webhook',
  })
}

/**
 * Log a trial converted event
 */
export async function logTrialConverted(
  workspaceId: string,
  subscriptionId: string,
  plan: string,
  amountCents: number
): Promise<string | null> {
  return logBillingEvent({
    workspaceId,
    eventType: 'trial.converted',
    eventCategory: 'trial',
    eventData: {
      subscription_id: subscriptionId,
      plan,
    },
    amountCents,
    stripeObjectId: subscriptionId,
    source: 'webhook',
  })
}

/**
 * Log a trial expired event and create alert
 */
export async function logTrialExpired(
  workspaceId: string,
  subscriptionId: string,
  plan: string
): Promise<string | null> {
  const eventId = await logBillingEvent({
    workspaceId,
    eventType: 'trial.expired',
    eventCategory: 'trial',
    eventData: {
      subscription_id: subscriptionId,
      plan,
    },
    stripeObjectId: subscriptionId,
    source: 'webhook',
  })

  // Create alert for trial expiration
  if (eventId) {
    await createBillingAlert({
      workspaceId,
      billingEventId: eventId,
      alertType: 'trial_expiring',
      severity: 'medium',
      title: 'Trial Expired Without Conversion',
      description: `Trial for subscription ${subscriptionId} expired without converting to paid`,
      metadata: { plan },
    })
  }

  return eventId
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Determine the event category from the event type
 */
export function getEventCategory(eventType: BillingEventType): BillingEventCategory {
  if (eventType.startsWith('subscription.')) return 'subscription'
  if (eventType.startsWith('tier.')) return 'tier'
  if (eventType.startsWith('payment.')) return 'payment'
  if (eventType.startsWith('trial.')) return 'trial'
  if (eventType.startsWith('addon.')) return 'addon'
  return 'subscription' // default
}

/**
 * Get a human-readable description for an event type
 */
export function getEventTypeDescription(eventType: BillingEventType): string {
  const descriptions: Record<BillingEventType, string> = {
    'subscription.created': 'Subscription created',
    'subscription.updated': 'Subscription updated',
    'subscription.canceled': 'Subscription canceled',
    'tier.upgraded': 'Tier upgraded',
    'tier.downgraded': 'Tier downgraded',
    'payment.succeeded': 'Payment succeeded',
    'payment.failed': 'Payment failed',
    'payment.refunded': 'Payment refunded',
    'trial.started': 'Trial started',
    'trial.converted': 'Trial converted to paid',
    'trial.expired': 'Trial expired',
    'addon.purchased': 'Add-on purchased',
    'addon.auto_replenished': 'Add-on auto-replenished',
  }
  return descriptions[eventType] || eventType
}
