/**
 * Query functions for Add-ons: SMS Credits, Call Minutes, Phone Billing
 */

import { createAdminClient } from '@/lib/supabase-server'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'
import { getWorkspaceBilling } from '@/lib/billing-queries'
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
  PHONE_PRICING,
  type PhoneNumberType,
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

  // CAS: Mark purchase as completed before adding credits to prevent duplicates
  if (purchaseId) {
    const { data: updated } = await supabase
      .from('sms_credit_purchases')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', purchaseId)
      .eq('status', 'pending')
      .select('id')
      .single()

    if (!updated) {
      console.warn(`[addons] SMS purchase ${purchaseId} already completed, skipping`)
      return true
    }
  }

  const { error } = await supabase.rpc('add_sms_credits_safe', {
    p_workspace_id: workspaceId,
    p_amount: credits,
  })

  if (error) {
    console.error('[addons] Failed to add SMS credits via RPC — manual reconciliation needed', {
      workspaceId, credits, error: error.message, code: error.code,
    })
    return false
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

  // CAS: Mark purchase as completed before adding minutes to prevent duplicates
  if (purchaseId) {
    const { data: updated } = await supabase
      .from('call_minutes_purchases')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', purchaseId)
      .eq('status', 'pending')
      .select('id')
      .single()

    if (!updated) {
      console.warn(`[addons] Call minutes purchase ${purchaseId} already completed, skipping`)
      return true
    }
  }

  // Atomically add call minutes via RPC to prevent race conditions
  const { error } = await supabase.rpc('add_call_minutes_safe', {
    p_workspace_id: workspaceId,
    p_seconds: seconds,
  })

  if (error) {
    console.error('[addons] Failed to add call minutes via RPC — manual reconciliation needed', {
      workspaceId, minutes, seconds, error: error.message, code: error.code,
    })
    return false
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
 * Update phone subscription quantity and totals atomically via RPC.
 * Uses col = col + delta in SQL to prevent race conditions from concurrent updates.
 */
export async function updatePhoneSubscriptionQuantity(
  workspaceId: string,
  delta: { local?: number; tollFree?: number },
  monthlyDelta?: number
): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase.rpc('update_phone_subscription_counts', {
    p_workspace_id: workspaceId,
    p_local_delta: delta.local ?? 0,
    p_toll_free_delta: delta.tollFree ?? 0,
    p_monthly_cents_delta: monthlyDelta ?? 0,
  })

  if (error) {
    console.error('[addons] Failed to update phone subscription counts:', error)
  }
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

/**
 * Get the Stripe price ID for a phone number type
 */
export function getPriceIdForNumberType(numberType: PhoneNumberType): string {
  switch (numberType) {
    case 'local':
    case 'mobile':
      return STRIPE_PRICES.phoneNumber.local
    case 'tollFree':
      return STRIPE_PRICES.phoneNumber.tollFree
  }
}

/**
 * Add a phone number to the workspace's Stripe subscription.
 * Creates a new subscription if none exists, or updates quantities on the existing one.
 */
export async function addPhoneNumberToSubscription(
  workspaceId: string,
  numberType: PhoneNumberType
): Promise<{ success: boolean; error?: string }> {
  try {
    const billing = await getWorkspaceBilling(workspaceId)
    if (!billing?.stripe_customer_id) {
      return { success: false, error: 'No Stripe customer for workspace' }
    }

    const priceId = getPriceIdForNumberType(numberType)
    if (!priceId) {
      return { success: false, error: `No Stripe price configured for ${numberType} numbers` }
    }

    const stripe = getStripe()
    const phoneSub = await getPhoneNumberSubscription(workspaceId)

    if (!phoneSub?.stripe_subscription_id) {
      // Create new Stripe subscription with one line item
      const subscription = await stripe.subscriptions.create({
        customer: billing.stripe_customer_id,
        items: [{ price: priceId, quantity: 1 }],
        default_payment_method: billing.default_payment_method_id || undefined,
        metadata: {
          workspace_id: workspaceId,
          type: 'phone_numbers',
        },
      })

      const itemId = subscription.items.data[0]?.id || ''
      await createPhoneSubscription(workspaceId, subscription.id, itemId)
    } else {
      // Update existing subscription
      const subscription = await stripe.subscriptions.retrieve(phoneSub.stripe_subscription_id)
      const existingItem = subscription.items.data.find(item => item.price.id === priceId)

      if (existingItem) {
        // Increment quantity on existing line item
        await stripe.subscriptions.update(phoneSub.stripe_subscription_id, {
          items: [{ id: existingItem.id, quantity: (existingItem.quantity || 0) + 1 }],
          proration_behavior: 'create_prorations',
        })
      } else {
        // Add new line item for this number type
        await stripe.subscriptions.update(phoneSub.stripe_subscription_id, {
          items: [{ price: priceId, quantity: 1 }],
          proration_behavior: 'create_prorations',
        })
      }
    }

    // Update local counts atomically
    const delta = numberType === 'tollFree' ? { tollFree: 1 } : { local: 1 }
    await updatePhoneSubscriptionQuantity(workspaceId, delta, PHONE_PRICING[numberType])

    return { success: true }
  } catch (error) {
    console.error('[addPhoneNumberToSubscription] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update phone billing',
    }
  }
}

/**
 * Remove a phone number from the workspace's Stripe subscription.
 * Decrements quantity, removes the line item, or cancels the subscription as needed.
 */
export async function removePhoneNumberFromSubscription(
  workspaceId: string,
  numberType: PhoneNumberType
): Promise<{ success: boolean; error?: string }> {
  try {
    const phoneSub = await getPhoneNumberSubscription(workspaceId)
    const delta = numberType === 'tollFree' ? { tollFree: -1 } : { local: -1 }

    if (!phoneSub?.stripe_subscription_id) {
      // No Stripe subscription, just update local counts
      if (phoneSub) {
        await updatePhoneSubscriptionQuantity(workspaceId, delta, -PHONE_PRICING[numberType])
      }
      return { success: true }
    }

    const stripe = getStripe()
    const priceId = getPriceIdForNumberType(numberType)
    const subscription = await stripe.subscriptions.retrieve(phoneSub.stripe_subscription_id)
    const existingItem = subscription.items.data.find(item => item.price.id === priceId)

    if (!existingItem) {
      // Item not found in Stripe, just update local counts
      await updatePhoneSubscriptionQuantity(workspaceId, delta, -PHONE_PRICING[numberType])
      return { success: true }
    }

    const currentQty = existingItem.quantity || 0
    const otherItems = subscription.items.data.filter(item => item.price.id !== priceId)
    const otherItemsQty = otherItems.reduce((sum, item) => sum + (item.quantity || 0), 0)

    if (currentQty > 1) {
      // Decrement quantity
      await stripe.subscriptions.update(phoneSub.stripe_subscription_id, {
        items: [{ id: existingItem.id, quantity: currentQty - 1 }],
        proration_behavior: 'create_prorations',
      })
    } else if (otherItemsQty > 0) {
      // Remove this line item, keep subscription for other number types
      await stripe.subscriptions.update(phoneSub.stripe_subscription_id, {
        items: [{ id: existingItem.id, deleted: true }],
        proration_behavior: 'create_prorations',
      })
    } else {
      // No items left - cancel the subscription
      await stripe.subscriptions.cancel(phoneSub.stripe_subscription_id, {
        invoice_now: true,
        prorate: true,
      })

      const supabase = createAdminClient()
      await supabase
        .from('phone_number_subscriptions')
        .update({
          status: 'canceled',
          stripe_subscription_id: null,
          stripe_subscription_item_id: null,
        })
        .eq('workspace_id', workspaceId)
    }

    // Update local counts atomically
    await updatePhoneSubscriptionQuantity(workspaceId, delta, -PHONE_PRICING[numberType])

    return { success: true }
  } catch (error) {
    console.error('[removePhoneNumberFromSubscription] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update phone billing',
    }
  }
}

/**
 * Sync phone subscription quantities in Stripe to match local DB counts.
 * Used as a self-healing mechanism during recalculation.
 */
export async function syncPhoneSubscriptionWithStripe(
  workspaceId: string
): Promise<void> {
  const phoneSub = await getPhoneNumberSubscription(workspaceId)
  if (!phoneSub?.stripe_subscription_id) return

  const stripe = getStripe()
  const subscription = await stripe.subscriptions.retrieve(phoneSub.stripe_subscription_id)

  const localPriceId = STRIPE_PRICES.phoneNumber.local
  const tollFreePriceId = STRIPE_PRICES.phoneNumber.tollFree

  const items: Array<{ id?: string; price?: string; quantity?: number; deleted?: boolean }> = []

  // Check each existing Stripe item against DB counts
  for (const item of subscription.items.data) {
    if (item.price.id === localPriceId) {
      if (phoneSub.local_numbers > 0 && item.quantity !== phoneSub.local_numbers) {
        items.push({ id: item.id, quantity: phoneSub.local_numbers })
      } else if (phoneSub.local_numbers === 0) {
        items.push({ id: item.id, deleted: true })
      }
    } else if (item.price.id === tollFreePriceId) {
      if (phoneSub.toll_free_numbers > 0 && item.quantity !== phoneSub.toll_free_numbers) {
        items.push({ id: item.id, quantity: phoneSub.toll_free_numbers })
      } else if (phoneSub.toll_free_numbers === 0) {
        items.push({ id: item.id, deleted: true })
      }
    }
  }

  // Add items that exist in DB but not in Stripe
  const hasLocalInStripe = subscription.items.data.some(item => item.price.id === localPriceId)
  const hasTollFreeInStripe = subscription.items.data.some(item => item.price.id === tollFreePriceId)

  if (!hasLocalInStripe && phoneSub.local_numbers > 0 && localPriceId) {
    items.push({ price: localPriceId, quantity: phoneSub.local_numbers })
  }
  if (!hasTollFreeInStripe && phoneSub.toll_free_numbers > 0 && tollFreePriceId) {
    items.push({ price: tollFreePriceId, quantity: phoneSub.toll_free_numbers })
  }

  if (items.length === 0) return

  // If all numbers are gone, cancel the subscription
  const totalNumbers = phoneSub.local_numbers + phoneSub.toll_free_numbers
  if (totalNumbers === 0) {
    await stripe.subscriptions.cancel(phoneSub.stripe_subscription_id, {
      invoice_now: true,
      prorate: true,
    })

    const supabase = createAdminClient()
    await supabase
      .from('phone_number_subscriptions')
      .update({ status: 'canceled', stripe_subscription_id: null, stripe_subscription_item_id: null })
      .eq('workspace_id', workspaceId)
  } else {
    await stripe.subscriptions.update(phoneSub.stripe_subscription_id, {
      items,
      proration_behavior: 'create_prorations',
    })
  }
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
