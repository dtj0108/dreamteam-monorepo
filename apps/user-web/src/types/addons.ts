/**
 * Add-ons types for SMS credits, call minutes, and phone billing
 */

// ============================================
// BUNDLE TYPES
// ============================================

export type CreditBundle = 'starter' | 'growth' | 'pro'
export type PhoneNumberType = 'local' | 'tollFree' | 'mobile'
export type PurchaseStatus = 'pending' | 'completed' | 'failed' | 'refunded'

// ============================================
// SMS CREDITS
// ============================================

export interface WorkspaceSMSCredits {
  id: string
  workspace_id: string
  balance: number
  lifetime_credits: number
  lifetime_used: number
  auto_replenish_enabled: boolean
  auto_replenish_threshold: number
  auto_replenish_bundle: CreditBundle | null
  created_at: string
  updated_at: string
}

export interface SMSCreditPurchase {
  id: string
  workspace_id: string
  bundle_type: CreditBundle
  credits_amount: number
  price_cents: number
  stripe_payment_intent_id: string | null
  stripe_checkout_session_id: string | null
  status: PurchaseStatus
  completed_at: string | null
  is_auto_replenish: boolean
  created_at: string
}

export interface SMSUsageLog {
  id: string
  workspace_id: string
  message_sid: string
  direction: 'inbound' | 'outbound'
  segments: number
  credits_consumed: number
  is_mms: boolean
  from_number: string
  to_number: string
  created_at: string
}

// ============================================
// CALL MINUTES
// ============================================

export interface WorkspaceCallMinutes {
  id: string
  workspace_id: string
  balance_seconds: number
  lifetime_seconds: number
  lifetime_used_seconds: number
  auto_replenish_enabled: boolean
  auto_replenish_threshold: number
  auto_replenish_bundle: CreditBundle | null
  created_at: string
  updated_at: string
}

// Computed helper type with minutes (for display)
export interface WorkspaceCallMinutesWithDisplay extends WorkspaceCallMinutes {
  balance_minutes: number
  lifetime_minutes: number
  lifetime_used_minutes: number
}

export interface CallMinutesPurchase {
  id: string
  workspace_id: string
  bundle_type: CreditBundle
  minutes_amount: number
  price_cents: number
  stripe_payment_intent_id: string | null
  stripe_checkout_session_id: string | null
  status: PurchaseStatus
  completed_at: string | null
  is_auto_replenish: boolean
  created_at: string
}

export interface CallUsageLog {
  id: string
  workspace_id: string
  call_sid: string
  direction: 'inbound' | 'outbound'
  duration_seconds: number
  minutes_consumed: number
  from_number: string
  to_number: string
  status: string | null
  created_at: string
}

// ============================================
// PHONE NUMBER BILLING
// ============================================

export interface PhoneNumberSubscription {
  id: string
  workspace_id: string
  stripe_subscription_id: string | null
  stripe_subscription_item_id: string | null
  total_numbers: number
  local_numbers: number
  toll_free_numbers: number
  monthly_total_cents: number
  status: 'active' | 'canceled' | 'pending' | 'past_due'
  created_at: string
  updated_at: string
}

// Extended twilio_numbers with billing columns
export interface TwilioNumberWithBilling {
  id: string
  user_id: string
  workspace_id: string | null
  twilio_sid: string
  phone_number: string
  friendly_name: string | null
  capabilities: {
    voice: boolean
    sms: boolean
    mms: boolean
  }
  is_primary: boolean
  number_type: PhoneNumberType
  monthly_price_cents: number
  billing_status: 'active' | 'canceled' | 'pending'
  created_at: string
}

// ============================================
// BUNDLE DEFINITIONS
// ============================================

export interface SMSBundleConfig {
  credits: number
  price: number // in cents
  perCredit: number // computed cents per credit
  stripePriceId?: string
}

export interface MinutesBundleConfig {
  minutes: number
  price: number // in cents
  perMinute: number // computed cents per minute
  stripePriceId?: string
}

// SMS Bundle definitions
export const SMS_BUNDLES: Record<CreditBundle, SMSBundleConfig> = {
  starter: {
    credits: 500,
    price: 1000, // $10
    perCredit: 2, // $0.02
  },
  growth: {
    credits: 2000,
    price: 3500, // $35
    perCredit: 1.75, // $0.0175
  },
  pro: {
    credits: 10000,
    price: 15000, // $150
    perCredit: 1.5, // $0.015
  },
} as const

// Call Minutes Bundle definitions
export const MINUTES_BUNDLES: Record<CreditBundle, MinutesBundleConfig> = {
  starter: {
    minutes: 100,
    price: 500, // $5
    perMinute: 5, // $0.05
  },
  growth: {
    minutes: 500,
    price: 2000, // $20
    perMinute: 4, // $0.04
  },
  pro: {
    minutes: 2000,
    price: 6500, // $65
    perMinute: 3.25, // $0.0325
  },
} as const

// Phone Number pricing
export const PHONE_PRICING = {
  local: 300, // $3/mo
  tollFree: 500, // $5/mo
  mobile: 300, // $3/mo (same as local)
} as const

// ============================================
// TWILIO COST REFERENCE (as of Jan 2025)
// Update these when Twilio pricing changes
// ============================================

/**
 * Estimated Twilio costs for margin calculations (in cents)
 * These are approximate - actual costs vary by volume and destination
 *
 * SMS Pricing: https://www.twilio.com/en-us/sms/pricing/us
 * - Outbound: ~$0.0079/segment (US domestic, carrier fees included)
 * - We use 1 cent as a conservative estimate
 *
 * Voice Pricing: https://www.twilio.com/en-us/voice/pricing/us
 * - Outbound: ~$0.014-$0.017/minute (varies by destination)
 * - We use 1.7 cents as a conservative estimate
 *
 * Phone Numbers: https://www.twilio.com/en-us/phone-numbers/pricing
 * - Local: ~$1.15/month
 * - Toll-free: ~$2.15/month
 * - We use $1 and $2 as round estimates
 */
export const TWILIO_COSTS = {
  /** SMS cost per segment in cents (~$0.0079-$0.01) */
  smsPerSegment: 1,

  /** Voice cost per minute in cents (~$0.014-$0.017) */
  voicePerMinute: 1.7,

  /** Local number monthly cost in cents (~$1.00-$1.15/mo) */
  localNumber: 100,

  /** Toll-free number monthly cost in cents (~$2.00-$2.15/mo) */
  tollFreeNumber: 200,

  /** Mobile number monthly cost in cents (same as local) */
  mobileNumber: 100,
} as const

/**
 * Target minimum margins by product category
 * Used for pricing audits and new bundle planning
 *
 * Current actual margins:
 * - SMS: 33-50% (Pro to Starter)
 * - Voice: 48-66% (Pro to Starter)
 * - Numbers: 60-67% (Toll-free to Local)
 */
export const TARGET_MARGINS = {
  /** Minimum acceptable margin for SMS credits */
  sms: 0.30,

  /** Minimum acceptable margin for voice minutes */
  voice: 0.40,

  /** Minimum acceptable margin for phone numbers */
  numbers: 0.50,
} as const

// ============================================
// API RESPONSE TYPES
// ============================================

export interface SMSCreditsResponse {
  credits: WorkspaceSMSCredits
  recentPurchases: SMSCreditPurchase[]
  recentUsage: SMSUsageLog[]
}

export interface CallMinutesResponse {
  minutes: WorkspaceCallMinutesWithDisplay
  recentPurchases: CallMinutesPurchase[]
  recentUsage: CallUsageLog[]
}

export interface PhoneBillingResponse {
  subscription: PhoneNumberSubscription
  numbers: TwilioNumberWithBilling[]
}

export interface AddOnsSummaryResponse {
  smsCredits: {
    balance: number
    isLow: boolean // balance < 50
  }
  callMinutes: {
    balanceMinutes: number
    isLow: boolean // balance < 10 minutes
  }
  phoneNumbers: {
    total: number
    monthlyTotal: number // in cents
  }
}

// ============================================
// CHECKOUT TYPES
// ============================================

export interface AddOnCheckoutRequest {
  type: 'sms_credits' | 'call_minutes'
  bundle: CreditBundle
}

export interface PhoneCheckoutRequest {
  type: 'phone_number'
  numberType: PhoneNumberType
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert seconds to minutes (rounded up for billing)
 */
export function secondsToMinutes(seconds: number): number {
  return Math.ceil(seconds / 60)
}

/**
 * Convert minutes to seconds
 */
export function minutesToSeconds(minutes: number): number {
  return minutes * 60
}

/**
 * Calculate credits needed for an SMS
 * 1 credit per segment, 3 credits for MMS
 */
export function calculateSMSCredits(segments: number, isMMS: boolean): number {
  if (isMMS) return 3
  return segments
}

/**
 * Format price in cents to display string
 */
export function formatAddOnPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

/**
 * Get SMS bundle display info
 */
export function getSMSBundleInfo(bundle: CreditBundle) {
  const config = SMS_BUNDLES[bundle]
  return {
    ...config,
    displayPrice: formatAddOnPrice(config.price),
    displayPerCredit: `${formatAddOnPrice(config.perCredit)}/credit`,
    savings: bundle === 'starter' ? null :
      `Save ${Math.round((1 - config.perCredit / SMS_BUNDLES.starter.perCredit) * 100)}%`,
  }
}

/**
 * Get minutes bundle display info
 */
export function getMinutesBundleInfo(bundle: CreditBundle) {
  const config = MINUTES_BUNDLES[bundle]
  return {
    ...config,
    displayPrice: formatAddOnPrice(config.price),
    displayPerMinute: `${formatAddOnPrice(config.perMinute)}/min`,
    savings: bundle === 'starter' ? null :
      `Save ${Math.round((1 - config.perMinute / MINUTES_BUNDLES.starter.perMinute) * 100)}%`,
  }
}

/**
 * Get phone number pricing display
 */
export function getPhonePriceDisplay(type: PhoneNumberType): string {
  const price = PHONE_PRICING[type]
  return `${formatAddOnPrice(price)}/mo`
}

/**
 * Check if SMS balance is low (below threshold or default 50)
 */
export function isSMSBalanceLow(
  credits: WorkspaceSMSCredits,
  threshold?: number
): boolean {
  const limit = threshold ?? credits.auto_replenish_threshold ?? 50
  return credits.balance < limit
}

/**
 * Check if call minutes balance is low (below threshold or default 10 minutes)
 */
export function isCallMinutesLow(
  minutes: WorkspaceCallMinutes,
  threshold?: number
): boolean {
  const limit = threshold ?? minutes.auto_replenish_threshold ?? 10
  const balanceMinutes = Math.floor(minutes.balance_seconds / 60)
  return balanceMinutes < limit
}

/**
 * Add display fields to WorkspaceCallMinutes
 */
export function withMinutesDisplay(
  minutes: WorkspaceCallMinutes
): WorkspaceCallMinutesWithDisplay {
  return {
    ...minutes,
    balance_minutes: Math.floor(minutes.balance_seconds / 60),
    lifetime_minutes: Math.floor(minutes.lifetime_seconds / 60),
    lifetime_used_minutes: Math.floor(minutes.lifetime_used_seconds / 60),
  }
}

// ============================================
// MARGIN CALCULATION HELPERS
// ============================================

/**
 * Calculate profit margin for an SMS bundle
 * @returns Margin as a decimal (e.g., 0.50 = 50%)
 *
 * Example: Starter bundle charges 2¢/credit, costs ~1¢ → 50% margin
 */
export function calculateSMSMargin(bundle: CreditBundle): number {
  const config = SMS_BUNDLES[bundle]
  const costPerCredit = TWILIO_COSTS.smsPerSegment
  return (config.perCredit - costPerCredit) / config.perCredit
}

/**
 * Calculate profit margin for a call minutes bundle
 * @returns Margin as a decimal (e.g., 0.66 = 66%)
 *
 * Example: Starter bundle charges 5¢/min, costs ~1.7¢ → 66% margin
 */
export function calculateMinutesMargin(bundle: CreditBundle): number {
  const config = MINUTES_BUNDLES[bundle]
  const costPerMinute = TWILIO_COSTS.voicePerMinute
  return (config.perMinute - costPerMinute) / config.perMinute
}

/**
 * Calculate profit margin for a phone number type
 * @returns Margin as a decimal (e.g., 0.67 = 67%)
 *
 * Example: Local number charges $3/mo, costs ~$1/mo → 67% margin
 */
export function calculatePhoneMargin(type: PhoneNumberType): number {
  const price = PHONE_PRICING[type]
  const cost = type === 'tollFree'
    ? TWILIO_COSTS.tollFreeNumber
    : TWILIO_COSTS.localNumber // local and mobile same cost
  return (price - cost) / price
}

/**
 * Check if a bundle meets the target margin threshold
 */
export function meetsTargetMargin(
  productType: 'sms' | 'voice' | 'numbers',
  actualMargin: number
): boolean {
  return actualMargin >= TARGET_MARGINS[productType]
}

/**
 * Get margin info for all SMS bundles (useful for pricing audits)
 */
export function getAllSMSMargins(): Record<CreditBundle, { margin: number; meetsTarget: boolean }> {
  return {
    starter: {
      margin: calculateSMSMargin('starter'),
      meetsTarget: meetsTargetMargin('sms', calculateSMSMargin('starter')),
    },
    growth: {
      margin: calculateSMSMargin('growth'),
      meetsTarget: meetsTargetMargin('sms', calculateSMSMargin('growth')),
    },
    pro: {
      margin: calculateSMSMargin('pro'),
      meetsTarget: meetsTargetMargin('sms', calculateSMSMargin('pro')),
    },
  }
}

/**
 * Get margin info for all minutes bundles (useful for pricing audits)
 */
export function getAllMinutesMargins(): Record<CreditBundle, { margin: number; meetsTarget: boolean }> {
  return {
    starter: {
      margin: calculateMinutesMargin('starter'),
      meetsTarget: meetsTargetMargin('voice', calculateMinutesMargin('starter')),
    },
    growth: {
      margin: calculateMinutesMargin('growth'),
      meetsTarget: meetsTargetMargin('voice', calculateMinutesMargin('growth')),
    },
    pro: {
      margin: calculateMinutesMargin('pro'),
      meetsTarget: meetsTargetMargin('voice', calculateMinutesMargin('pro')),
    },
  }
}
