'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import {
  type WorkspaceSMSCredits,
  type WorkspaceCallMinutesWithDisplay,
  type SMSCreditPurchase,
  type CallMinutesPurchase,
  type SMSUsageLog,
  type CallUsageLog,
  type PhoneNumberSubscription,
  type TwilioNumberWithBilling,
  type CreditBundle,
  type AddOnsSummaryResponse,
} from '@/types/addons'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// ============================================
// TYPES FOR DIRECT CHARGING
// ============================================

interface ChargeResponse {
  success: boolean
  noPaymentMethod?: boolean
  requiresAction?: boolean
  clientSecret?: string
  paymentIntentId?: string
  error?: string
  errorCode?: string
  creditsAdded?: number
  minutesAdded?: number
}

interface PaymentMethodInfo {
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

interface PaymentMethodData {
  hasPaymentMethod: boolean
  paymentMethod: PaymentMethodInfo | null
}

export type PurchaseResult = {
  success: boolean
  requiresRedirect?: boolean
  requiresAction?: boolean
  clientSecret?: string
  paymentIntentId?: string
  error?: string
  creditsAdded?: number
  minutesAdded?: number
}

// ============================================
// PAYMENT METHOD HOOK
// ============================================

export function usePaymentMethod() {
  const { data, error, mutate } = useSWR<PaymentMethodData>(
    '/api/addons/charge',
    fetcher
  )

  const removePaymentMethod = useCallback(async () => {
    const response = await fetch('/api/addons/payment-method', {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('Failed to remove payment method')
    }
    mutate()
  }, [mutate])

  return {
    hasPaymentMethod: data?.hasPaymentMethod ?? false,
    paymentMethod: data?.paymentMethod ?? null,
    isLoading: !data && !error,
    error,
    refresh: mutate,
    removePaymentMethod,
  }
}

// ============================================
// SMS CREDITS HOOK
// ============================================

interface SMSCreditsData {
  credits: WorkspaceSMSCredits | null
  recentPurchases: SMSCreditPurchase[]
  recentUsage: SMSUsageLog[]
}

export function useSMSCredits() {
  const [isPurchasing, setIsPurchasing] = useState(false)

  const { data, error, mutate } = useSWR<SMSCreditsData>(
    '/api/addons/sms-credits',
    fetcher
  )

  /**
   * Purchase SMS credits bundle
   * First tries direct charge, falls back to Stripe Checkout if no card on file
   * Returns result for caller to handle (e.g., show confirmation dialog, handle 3DS)
   */
  const purchaseBundle = useCallback(async (
    bundle: CreditBundle,
    { skipDirectCharge = false }: { skipDirectCharge?: boolean } = {}
  ): Promise<PurchaseResult> => {
    setIsPurchasing(true)
    try {
      // Try direct charge first (unless explicitly skipped)
      if (!skipDirectCharge) {
        const chargeResponse = await fetch('/api/addons/charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'sms_credits', bundle }),
        })

        const chargeResult: ChargeResponse = await chargeResponse.json()

        // Direct charge succeeded
        if (chargeResult.success) {
          await mutate() // Refresh balance
          return {
            success: true,
            creditsAdded: chargeResult.creditsAdded,
          }
        }

        // 3DS required - caller should handle with Stripe.js
        if (chargeResult.requiresAction) {
          return {
            success: false,
            requiresAction: true,
            clientSecret: chargeResult.clientSecret,
            paymentIntentId: chargeResult.paymentIntentId,
          }
        }

        // No payment method - need to redirect to Stripe Checkout
        if (chargeResult.noPaymentMethod) {
          // Fall through to Stripe Checkout
        } else {
          // Other error (card declined, etc.)
          return {
            success: false,
            error: chargeResult.error || 'Charge failed',
          }
        }
      }

      // Fall back to Stripe Checkout (creates session and redirects)
      const response = await fetch('/api/addons/sms-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundle }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      if (url) {
        window.location.href = url
        return { success: false, requiresRedirect: true }
      }

      return { success: false, error: 'No checkout URL returned' }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Purchase failed'
      return { success: false, error }
    } finally {
      setIsPurchasing(false)
    }
  }, [mutate])

  /**
   * Legacy method - redirects to Stripe Checkout directly
   */
  const purchaseBundleCheckout = useCallback(async (bundle: CreditBundle) => {
    return purchaseBundle(bundle, { skipDirectCharge: true })
  }, [purchaseBundle])

  const updateAutoReplenish = useCallback(async (
    enabled: boolean,
    threshold?: number,
    bundle?: CreditBundle
  ) => {
    await fetch('/api/addons/sms-credits', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, threshold, bundle }),
    })
    mutate()
  }, [mutate])

  return {
    credits: data?.credits ?? null,
    recentPurchases: data?.recentPurchases ?? [],
    recentUsage: data?.recentUsage ?? [],
    isLoading: !data && !error,
    error,
    isPurchasing,
    purchaseBundle,
    purchaseBundleCheckout,
    updateAutoReplenish,
    refresh: mutate,
  }
}

// ============================================
// CALL MINUTES HOOK
// ============================================

interface CallMinutesData {
  minutes: WorkspaceCallMinutesWithDisplay | null
  recentPurchases: CallMinutesPurchase[]
  recentUsage: CallUsageLog[]
}

export function useCallMinutes() {
  const [isPurchasing, setIsPurchasing] = useState(false)

  const { data, error, mutate } = useSWR<CallMinutesData>(
    '/api/addons/call-minutes',
    fetcher
  )

  /**
   * Purchase call minutes bundle
   * First tries direct charge, falls back to Stripe Checkout if no card on file
   * Returns result for caller to handle (e.g., show confirmation dialog, handle 3DS)
   */
  const purchaseBundle = useCallback(async (
    bundle: CreditBundle,
    { skipDirectCharge = false }: { skipDirectCharge?: boolean } = {}
  ): Promise<PurchaseResult> => {
    setIsPurchasing(true)
    try {
      // Try direct charge first (unless explicitly skipped)
      if (!skipDirectCharge) {
        const chargeResponse = await fetch('/api/addons/charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'call_minutes', bundle }),
        })

        const chargeResult: ChargeResponse = await chargeResponse.json()

        // Direct charge succeeded
        if (chargeResult.success) {
          await mutate() // Refresh balance
          return {
            success: true,
            minutesAdded: chargeResult.minutesAdded,
          }
        }

        // 3DS required - caller should handle with Stripe.js
        if (chargeResult.requiresAction) {
          return {
            success: false,
            requiresAction: true,
            clientSecret: chargeResult.clientSecret,
            paymentIntentId: chargeResult.paymentIntentId,
          }
        }

        // No payment method - need to redirect to Stripe Checkout
        if (chargeResult.noPaymentMethod) {
          // Fall through to Stripe Checkout
        } else {
          // Other error (card declined, etc.)
          return {
            success: false,
            error: chargeResult.error || 'Charge failed',
          }
        }
      }

      // Fall back to Stripe Checkout (creates session and redirects)
      const response = await fetch('/api/addons/call-minutes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundle }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      if (url) {
        window.location.href = url
        return { success: false, requiresRedirect: true }
      }

      return { success: false, error: 'No checkout URL returned' }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Purchase failed'
      return { success: false, error }
    } finally {
      setIsPurchasing(false)
    }
  }, [mutate])

  /**
   * Legacy method - redirects to Stripe Checkout directly
   */
  const purchaseBundleCheckout = useCallback(async (bundle: CreditBundle) => {
    return purchaseBundle(bundle, { skipDirectCharge: true })
  }, [purchaseBundle])

  const updateAutoReplenish = useCallback(async (
    enabled: boolean,
    threshold?: number,
    bundle?: CreditBundle
  ) => {
    await fetch('/api/addons/call-minutes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, threshold, bundle }),
    })
    mutate()
  }, [mutate])

  return {
    minutes: data?.minutes ?? null,
    recentPurchases: data?.recentPurchases ?? [],
    recentUsage: data?.recentUsage ?? [],
    isLoading: !data && !error,
    error,
    isPurchasing,
    purchaseBundle,
    purchaseBundleCheckout,
    updateAutoReplenish,
    refresh: mutate,
  }
}

// ============================================
// PHONE NUMBERS HOOK
// ============================================

interface PhoneNumbersData {
  subscription: PhoneNumberSubscription | null
  numbers: TwilioNumberWithBilling[]
}

export function usePhoneNumbers() {
  const { data, error, mutate } = useSWR<PhoneNumbersData>(
    '/api/addons/phone-numbers',
    fetcher
  )

  const recalculate = useCallback(async () => {
    await fetch('/api/addons/phone-numbers', { method: 'POST' })
    mutate()
  }, [mutate])

  return {
    subscription: data?.subscription ?? null,
    numbers: data?.numbers ?? [],
    isLoading: !data && !error,
    error,
    recalculate,
    refresh: mutate,
  }
}

// ============================================
// COMBINED SUMMARY HOOK
// ============================================

export function useAddOnsSummary() {
  const { data, error, mutate } = useSWR<AddOnsSummaryResponse>(
    '/api/addons/summary',
    fetcher,
    { refreshInterval: 60000 } // Refresh every minute
  )

  return {
    summary: data ?? {
      smsCredits: { balance: 0, isLow: false },
      callMinutes: { balanceMinutes: 0, isLow: false },
      phoneNumbers: { total: 0, monthlyTotal: 0 },
    },
    isLoading: !data && !error,
    error,
    refresh: mutate,
  }
}
