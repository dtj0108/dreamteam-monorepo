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

  const purchaseBundle = useCallback(async (bundle: CreditBundle) => {
    setIsPurchasing(true)
    try {
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
      }
    } finally {
      setIsPurchasing(false)
    }
  }, [])

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

  const purchaseBundle = useCallback(async (bundle: CreditBundle) => {
    setIsPurchasing(true)
    try {
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
      }
    } finally {
      setIsPurchasing(false)
    }
  }, [])

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
