/**
 * Query functions for Add-ons: SMS Credits, Call Minutes, Phone Billing
 */

import { createAdminClient } from '@/lib/supabase-server'
import {
  type WorkspaceSMSCredits,
  type WorkspaceCallMinutes,
  type WorkspaceCallMinutesWithDisplay,
  type SMSCreditPurchase,
  type CallMinutesPurchase,
  type SMSUsageLog,
  type CallUsageLog,
  type PhoneNumberSubscription,
  type TwilioNumberWithBilling,
  type CreditBundle,
  type AddOnsSummaryResponse,
  SMS_BUNDLES,
  MINUTES_BUNDLES,
  withMinutesDisplay,
} from '@/types/addons'

// ============================================
// SMS CREDITS
// ============================================

/**
 * Get SMS credits for a workspace
 */
export async function getWorkspaceSMSCredits(
  workspaceId: string
): Promise<WorkspaceSMSCredits | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('workspace_sms_credits')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()

  if (error) {
    console.error('Error fetching SMS credits:', error)
    return null
  }

  return data as WorkspaceSMSCredits
}

/**
 * Add SMS credits to a workspace (from purchase)
 */
export async function addSMSCredits(
  workspaceId: string,
  bundle: CreditBundle,
  purchaseId?: string
): Promise<boolean> {
  const supabase = createAdminClient()
  const credits = SMS_BUNDLES[bundle].credits

  const { error } = await supabase.rpc('add_sms_credits_safe', {
    p_workspace_id: workspaceId,
    p_amount: credits,
  })

  // If function doesn't exist, fall back to manual update
  if (error && error.code === '42883') {
    // Function doesn't exist, do it manually
    const { error: updateError } = await supabase
      .from('workspace_sms_credits')
      .update({
        balance: supabase.rpc('increment', { x: credits }) as unknown as number,
        lifetime_credits: supabase.rpc('increment', { x: credits }) as unknown as number,
      })
      .eq('workspace_id', workspaceId)

    if (updateError) {
      // Use raw SQL increment
      const { data: current } = await supabase
        .from('workspace_sms_credits')
        .select('balance, lifetime_credits')
        .eq('workspace_id', workspaceId)
        .single()

      if (current) {
        await supabase
          .from('workspace_sms_credits')
          .update({
            balance: current.balance + credits,
            lifetime_credits: current.lifetime_credits + credits,
          })
          .eq('workspace_id', workspaceId)
      }
    }
  }

  // Update purchase record if provided
  if (purchaseId) {
    await supabase
      .from('sms_credit_purchases')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', purchaseId)
  }

  return true
}

/**
 * Deduct SMS credits atomically using database function
 */
export async function deductSMSCredits(
  workspaceId: string,
  amount: number
): Promise<boolean> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('deduct_sms_credits', {
    p_workspace_id: workspaceId,
    p_amount: amount,
  })

  if (error) {
    console.error('Error deducting SMS credits:', error)
    return false
  }

  return data as boolean
}

/**
 * Get SMS purchase history
 */
export async function getSMSPurchases(
  workspaceId: string,
  limit: number = 10
): Promise<SMSCreditPurchase[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('sms_credit_purchases')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching SMS purchases:', error)
    return []
  }

  return data as SMSCreditPurchase[]
}

/**
 * Get SMS usage history
 */
export async function getSMSUsage(
  workspaceId: string,
  limit: number = 50
): Promise<SMSUsageLog[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('sms_usage_log')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching SMS usage:', error)
    return []
  }

  return data as SMSUsageLog[]
}

/**
 * Record SMS usage
 */
export async function recordSMSUsage(
  workspaceId: string,
  messageSid: string,
  data: {
    direction: 'inbound' | 'outbound'
    segments: number
    credits_consumed: number
    is_mms: boolean
    from_number: string
    to_number: string
  }
): Promise<void> {
  const supabase = createAdminClient()

  await supabase.from('sms_usage_log').upsert(
    {
      workspace_id: workspaceId,
      message_sid: messageSid,
      ...data,
    },
    { onConflict: 'message_sid' }
  )
}

/**
 * Record SMS credit purchase
 * @param checkoutSessionId - Stripe checkout session ID (null for direct charges)
 * @param paymentIntentId - Stripe payment intent ID (for direct charges)
 * @param isAutoReplenish - Whether this is an auto-replenish purchase
 */
export async function recordSMSPurchase(
  workspaceId: string,
  bundle: CreditBundle,
  checkoutSessionId: string | null,
  paymentIntentId?: string,
  isAutoReplenish: boolean = false
): Promise<string> {
  const supabase = createAdminClient()
  const bundleConfig = SMS_BUNDLES[bundle]

  const { data, error } = await supabase
    .from('sms_credit_purchases')
    .insert({
      workspace_id: workspaceId,
      bundle_type: bundle,
      credits_amount: bundleConfig.credits,
      price_cents: bundleConfig.price,
      stripe_checkout_session_id: checkoutSessionId,
      stripe_payment_intent_id: paymentIntentId || null,
      is_auto_replenish: isAutoReplenish,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error recording SMS purchase:', error)
    throw error
  }

  return data.id
}

/**
 * Update auto-replenish settings for SMS
 */
export async function updateSMSAutoReplenish(
  workspaceId: string,
  enabled: boolean,
  threshold?: number,
  bundle?: CreditBundle
): Promise<void> {
  const supabase = createAdminClient()

  const updates: Record<string, unknown> = {
    auto_replenish_enabled: enabled,
  }
  if (threshold !== undefined) updates.auto_replenish_threshold = threshold
  if (bundle !== undefined) updates.auto_replenish_bundle = bundle

  await supabase
    .from('workspace_sms_credits')
    .update(updates)
    .eq('workspace_id', workspaceId)
}

// ============================================
// CALL MINUTES
// ============================================

/**
 * Get call minutes for a workspace
 */
export async function getWorkspaceCallMinutes(
  workspaceId: string
): Promise<WorkspaceCallMinutesWithDisplay | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('workspace_call_minutes')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()

  if (error) {
    console.error('Error fetching call minutes:', error)
    return null
  }

  return withMinutesDisplay(data as WorkspaceCallMinutes)
}

/**
 * Add call minutes to a workspace (from purchase)
 */
export async function addCallMinutes(
  workspaceId: string,
  bundle: CreditBundle,
  purchaseId?: string
): Promise<boolean> {
  const supabase = createAdminClient()
  const minutes = MINUTES_BUNDLES[bundle].minutes
  const seconds = minutes * 60

  // Get current balance and update
  const { data: current } = await supabase
    .from('workspace_call_minutes')
    .select('balance_seconds, lifetime_seconds')
    .eq('workspace_id', workspaceId)
    .single()

  if (current) {
    await supabase
      .from('workspace_call_minutes')
      .update({
        balance_seconds: current.balance_seconds + seconds,
        lifetime_seconds: current.lifetime_seconds + seconds,
      })
      .eq('workspace_id', workspaceId)
  }

  // Update purchase record if provided
  if (purchaseId) {
    await supabase
      .from('call_minutes_purchases')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', purchaseId)
  }

  return true
}

/**
 * Deduct call minutes atomically using database function
 */
export async function deductCallMinutes(
  workspaceId: string,
  seconds: number
): Promise<boolean> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('deduct_call_minutes', {
    p_workspace_id: workspaceId,
    p_seconds: seconds,
  })

  if (error) {
    console.error('Error deducting call minutes:', error)
    return false
  }

  return data as boolean
}

/**
 * Get call minutes purchase history
 */
export async function getCallMinutesPurchases(
  workspaceId: string,
  limit: number = 10
): Promise<CallMinutesPurchase[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('call_minutes_purchases')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching call minutes purchases:', error)
    return []
  }

  return data as CallMinutesPurchase[]
}

/**
 * Get call usage history
 */
export async function getCallUsage(
  workspaceId: string,
  limit: number = 50
): Promise<CallUsageLog[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('call_usage_log')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching call usage:', error)
    return []
  }

  return data as CallUsageLog[]
}

/**
 * Record call usage
 */
export async function recordCallUsage(
  workspaceId: string,
  callSid: string,
  data: {
    direction: 'inbound' | 'outbound'
    duration_seconds: number
    minutes_consumed: number
    from_number: string
    to_number: string
    status?: string
  }
): Promise<void> {
  const supabase = createAdminClient()

  await supabase.from('call_usage_log').upsert(
    {
      workspace_id: workspaceId,
      call_sid: callSid,
      ...data,
    },
    { onConflict: 'call_sid' }
  )
}

/**
 * Record call minutes purchase
 * @param checkoutSessionId - Stripe checkout session ID (null for direct charges)
 * @param paymentIntentId - Stripe payment intent ID (for direct charges)
 * @param isAutoReplenish - Whether this is an auto-replenish purchase
 */
export async function recordCallMinutesPurchase(
  workspaceId: string,
  bundle: CreditBundle,
  checkoutSessionId: string | null,
  paymentIntentId?: string,
  isAutoReplenish: boolean = false
): Promise<string> {
  const supabase = createAdminClient()
  const bundleConfig = MINUTES_BUNDLES[bundle]

  const { data, error } = await supabase
    .from('call_minutes_purchases')
    .insert({
      workspace_id: workspaceId,
      bundle_type: bundle,
      minutes_amount: bundleConfig.minutes,
      price_cents: bundleConfig.price,
      stripe_checkout_session_id: checkoutSessionId,
      stripe_payment_intent_id: paymentIntentId || null,
      is_auto_replenish: isAutoReplenish,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error recording call minutes purchase:', error)
    throw error
  }

  return data.id
}

/**
 * Update auto-replenish settings for call minutes
 */
export async function updateCallMinutesAutoReplenish(
  workspaceId: string,
  enabled: boolean,
  threshold?: number,
  bundle?: CreditBundle
): Promise<void> {
  const supabase = createAdminClient()

  const updates: Record<string, unknown> = {
    auto_replenish_enabled: enabled,
  }
  if (threshold !== undefined) updates.auto_replenish_threshold = threshold
  if (bundle !== undefined) updates.auto_replenish_bundle = bundle

  await supabase
    .from('workspace_call_minutes')
    .update(updates)
    .eq('workspace_id', workspaceId)
}

// ============================================
// PHONE NUMBER BILLING
// ============================================

/**
 * Get phone number subscription for a workspace
 */
export async function getPhoneNumberSubscription(
  workspaceId: string
): Promise<PhoneNumberSubscription | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('phone_number_subscriptions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()

  if (error) {
    console.error('Error fetching phone subscription:', error)
    return null
  }

  return data as PhoneNumberSubscription
}

/**
 * Get phone numbers with billing info for a workspace
 */
export async function getWorkspacePhoneNumbers(
  workspaceId: string
): Promise<TwilioNumberWithBilling[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('twilio_numbers')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching workspace phone numbers:', error)
    return []
  }

  return data as TwilioNumberWithBilling[]
}

/**
 * Create or update phone number subscription
 */
export async function createPhoneSubscription(
  workspaceId: string,
  stripeSubscriptionId: string,
  stripeSubscriptionItemId: string
): Promise<void> {
  const supabase = createAdminClient()

  await supabase.from('phone_number_subscriptions').upsert(
    {
      workspace_id: workspaceId,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_subscription_item_id: stripeSubscriptionItemId,
      status: 'active',
    },
    { onConflict: 'workspace_id' }
  )
}

/**
 * Update phone subscription quantity and totals
 */
export async function updatePhoneSubscriptionQuantity(
  workspaceId: string,
  delta: {
    local?: number
    tollFree?: number
  },
  newMonthlyTotal?: number
): Promise<void> {
  const supabase = createAdminClient()

  // Get current subscription
  const current = await getPhoneNumberSubscription(workspaceId)
  if (!current) {
    console.error('No phone subscription found for workspace')
    return
  }

  const updates: Record<string, number> = {}

  if (delta.local !== undefined) {
    updates.local_numbers = current.local_numbers + delta.local
  }
  if (delta.tollFree !== undefined) {
    updates.toll_free_numbers = current.toll_free_numbers + delta.tollFree
  }
  if (delta.local !== undefined || delta.tollFree !== undefined) {
    updates.total_numbers = (updates.local_numbers ?? current.local_numbers) +
      (updates.toll_free_numbers ?? current.toll_free_numbers)
  }
  if (newMonthlyTotal !== undefined) {
    updates.monthly_total_cents = newMonthlyTotal
  }

  await supabase
    .from('phone_number_subscriptions')
    .update(updates)
    .eq('workspace_id', workspaceId)
}

/**
 * Recalculate phone subscription totals from actual numbers
 */
export async function recalculatePhoneSubscription(
  workspaceId: string
): Promise<void> {
  const supabase = createAdminClient()

  // Count actual phone numbers
  const { data: numbers } = await supabase
    .from('twilio_numbers')
    .select('number_type, monthly_price_cents')
    .eq('workspace_id', workspaceId)
    .eq('billing_status', 'active')

  if (!numbers) return

  type PhoneNumber = { number_type: string | null; monthly_price_cents: number | null }
  const localCount = numbers.filter((n: PhoneNumber) => n.number_type === 'local' || n.number_type === 'mobile').length
  const tollFreeCount = numbers.filter((n: PhoneNumber) => n.number_type === 'tollFree').length
  const monthlyTotal = numbers.reduce((sum: number, n: PhoneNumber) => sum + (n.monthly_price_cents || 0), 0)

  await supabase
    .from('phone_number_subscriptions')
    .update({
      total_numbers: localCount + tollFreeCount,
      local_numbers: localCount,
      toll_free_numbers: tollFreeCount,
      monthly_total_cents: monthlyTotal,
    })
    .eq('workspace_id', workspaceId)
}

// ============================================
// COMBINED QUERIES
// ============================================

/**
 * Get all add-ons summary for a workspace
 */
export async function getAddOnsSummary(
  workspaceId: string
): Promise<AddOnsSummaryResponse> {
  const [smsCredits, callMinutes, phoneSubscription] = await Promise.all([
    getWorkspaceSMSCredits(workspaceId),
    getWorkspaceCallMinutes(workspaceId),
    getPhoneNumberSubscription(workspaceId),
  ])

  return {
    smsCredits: {
      balance: smsCredits?.balance ?? 0,
      isLow: (smsCredits?.balance ?? 0) < 50,
    },
    callMinutes: {
      balanceMinutes: callMinutes?.balance_minutes ?? 0,
      isLow: (callMinutes?.balance_minutes ?? 0) < 10,
    },
    phoneNumbers: {
      total: phoneSubscription?.total_numbers ?? 0,
      monthlyTotal: phoneSubscription?.monthly_total_cents ?? 0,
    },
  }
}

/**
 * Check if workspace has sufficient SMS credits
 */
export async function hasSufficientSMSCredits(
  workspaceId: string,
  required: number
): Promise<boolean> {
  const credits = await getWorkspaceSMSCredits(workspaceId)
  return (credits?.balance ?? 0) >= required
}

/**
 * Check if workspace has sufficient call minutes
 */
export async function hasSufficientCallMinutes(
  workspaceId: string,
  requiredSeconds: number
): Promise<boolean> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('workspace_call_minutes')
    .select('balance_seconds')
    .eq('workspace_id', workspaceId)
    .single()

  return (data?.balance_seconds ?? 0) >= requiredSeconds
}

// ============================================
// CHECKOUT SESSION HELPERS
// ============================================

/**
 * Find pending purchase by checkout session ID
 */
export async function findPendingSMSPurchase(
  checkoutSessionId: string
): Promise<{ id: string; workspace_id: string; bundle_type: CreditBundle } | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('sms_credit_purchases')
    .select('id, workspace_id, bundle_type')
    .eq('stripe_checkout_session_id', checkoutSessionId)
    .eq('status', 'pending')
    .single()

  if (error) return null
  return data as { id: string; workspace_id: string; bundle_type: CreditBundle }
}

/**
 * Find pending purchase by checkout session ID
 */
export async function findPendingCallMinutesPurchase(
  checkoutSessionId: string
): Promise<{ id: string; workspace_id: string; bundle_type: CreditBundle } | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('call_minutes_purchases')
    .select('id, workspace_id, bundle_type')
    .eq('stripe_checkout_session_id', checkoutSessionId)
    .eq('status', 'pending')
    .single()

  if (error) return null
  return data as { id: string; workspace_id: string; bundle_type: CreditBundle }
}

/**
 * Mark SMS purchase as failed
 */
export async function markSMSPurchaseFailed(purchaseId: string): Promise<void> {
  const supabase = createAdminClient()

  await supabase
    .from('sms_credit_purchases')
    .update({ status: 'failed' })
    .eq('id', purchaseId)
}

/**
 * Mark call minutes purchase as failed
 */
export async function markCallMinutesPurchaseFailed(purchaseId: string): Promise<void> {
  const supabase = createAdminClient()

  await supabase
    .from('call_minutes_purchases')
    .update({ status: 'failed' })
    .eq('id', purchaseId)
}
