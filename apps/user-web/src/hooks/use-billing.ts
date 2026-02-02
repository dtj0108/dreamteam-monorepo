"use client"

import { useState, useEffect, useCallback } from 'react'
import type {
  BillingState,
  BillingInvoice,
  BillingResponse,
  WorkspacePlan,
  AgentTier,
} from '@/types/billing'

interface CheckoutResult {
  upgraded?: boolean
  newTier?: string
  redirected?: boolean
  deploymentFailed?: boolean
  deploymentError?: string
  requiresAction?: boolean // 3DS needed
  clientSecret?: string // For 3DS confirmation
}

export interface ProrationPreview {
  prorated_amount: number // cents - amount to charge now
  credit_amount: number // cents - credit from current plan
  total_due: number // cents - net amount due now
  next_billing_date: string
  next_billing_amount: number // cents - full price at next billing
}

interface UseBillingReturn {
  // Data
  billing: BillingState | null
  invoices: BillingInvoice[]
  isOwner: boolean
  canManageBilling: boolean

  // State
  loading: boolean
  error: string | null

  // Actions
  refresh: () => Promise<void>
  createCheckoutSession: (params: {
    type: 'workspace_plan' | 'agent_tier'
    plan?: 'monthly' | 'annual'
    tier?: 'startup' | 'teams' | 'enterprise'
  }) => Promise<CheckoutResult>
  previewUpgrade: (tier: 'startup' | 'teams' | 'enterprise') => Promise<ProrationPreview | null>
  openPortal: () => Promise<void>

  // Computed helpers
  isActiveSubscription: boolean
  isPro: boolean
  hasAgents: boolean
  agentCount: number
  trialDaysRemaining: number | null
}

/**
 * Hook for managing billing state and actions
 */
export function useBilling(): UseBillingReturn {
  const [billing, setBilling] = useState<BillingState | null>(null)
  const [invoices, setInvoices] = useState<BillingInvoice[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [canManageBilling, setCanManageBilling] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch billing data from API
   */
  const refresh = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch('/api/billing')

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch billing')
      }

      const data: BillingResponse = await response.json()
      setBilling(data.billing)
      setInvoices(data.invoices || [])
      setIsOwner(data.isOwner)
      setCanManageBilling(data.canManageBilling ?? data.isOwner)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch billing data on mount
  useEffect(() => {
    refresh()
  }, [refresh])

  /**
   * Create a checkout session and redirect to Stripe, or handle immediate upgrade
   */
  const createCheckoutSession = useCallback(
    async (params: {
      type: 'workspace_plan' | 'agent_tier'
      plan?: 'monthly' | 'annual'
      tier?: 'startup' | 'teams' | 'enterprise'
    }): Promise<CheckoutResult> => {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Handle 3DS required
      if (data.requiresAction && data.clientSecret) {
        return {
          requiresAction: true,
          clientSecret: data.clientSecret,
        }
      }

      // Handle immediate upgrade (no redirect needed)
      if (data.upgraded) {
        // Refresh billing data to get new tier
        await refresh()
        return {
          upgraded: true,
          newTier: data.newTier,
          deploymentFailed: data.deploymentFailed,
          deploymentError: data.deploymentError,
        }
      }

      // Handle checkout redirect
      if (data.url) {
        window.location.href = data.url
        return { redirected: true }
      }

      throw new Error('Unexpected response from checkout API')
    },
    [refresh]
  )

  /**
   * Preview proration for upgrading agent tier
   * Returns null if no existing subscription (full price applies)
   */
  const previewUpgrade = useCallback(
    async (tier: 'startup' | 'teams' | 'enterprise'): Promise<ProrationPreview | null> => {
      const response = await fetch('/api/billing/preview-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to preview upgrade')
      }

      return data.proration
    },
    []
  )

  /**
   * Open Stripe Customer Portal
   */
  const openPortal = useCallback(async () => {
    const response = await fetch('/api/billing/portal', {
      method: 'POST',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to open portal')
    }

    const { url } = await response.json()

    // Redirect to Stripe Portal
    window.location.href = url
  }, [])

  // Computed values
  // Infer active status from plan when plan_status is null
  // This handles cases where Stripe webhook hasn't synced yet
  const isActiveSubscription =
    billing?.plan_status === 'active' ||
    billing?.plan_status === 'trialing' ||
    (billing?.plan_status === null && billing?.plan !== 'free')

  const hasPaidPlan = isActiveSubscription && billing?.plan !== 'free'

  const hasAgents =
    billing?.agent_tier !== 'none' &&
    (billing?.agent_status === 'active' || billing?.agent_status === 'trialing')

  // AI Agents subscription includes all Pro features
  const isPro = hasPaidPlan || hasAgents

  const agentCount = hasAgents
    ? {
        startup: 7,
        teams: 18,
        enterprise: 38,
        none: 0,
      }[billing?.agent_tier || 'none']
    : 0

  const trialDaysRemaining = (() => {
    if (!billing?.trial_end) return null
    const endDate = new Date(billing.trial_end)
    const now = new Date()
    const diffMs = endDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  })()

  return {
    billing,
    invoices,
    isOwner,
    canManageBilling,
    loading,
    error,
    refresh,
    createCheckoutSession,
    previewUpgrade,
    openPortal,
    isActiveSubscription,
    isPro,
    hasAgents,
    agentCount,
    trialDaysRemaining,
  }
}
