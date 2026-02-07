"use client"

import { createContext, useContext, ReactNode } from 'react'
import { useBilling } from '@/hooks/use-billing'
import { useWorkspaceOptional } from './workspace-provider'
import type { BillingState, BillingInvoice } from '@/types/billing'

/**
 * Checkout result type
 */
interface CheckoutResult {
  upgraded?: boolean
  newTier?: string
  redirected?: boolean
  downgradeScheduled?: boolean
  effectiveAt?: string | null
}

/**
 * Billing context type
 */
interface BillingContextType {
  // Data
  billing: BillingState | null
  invoices: BillingInvoice[]
  isOwner: boolean

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
  openPortal: () => Promise<void>

  // Computed helpers for feature gating
  isActiveSubscription: boolean
  isPro: boolean
  hasAgents: boolean
  agentCount: number
  trialDaysRemaining: number | null
  canAccessFeature: (feature: BillingFeature) => boolean
}

/**
 * Features that can be gated by billing
 */
export type BillingFeature = 'analytics' | 'api' | 'agents' | 'unlimited_storage'

const BillingContext = createContext<BillingContextType | null>(null)

/**
 * Hook to access billing context
 * Must be used within a BillingProvider
 */
export function useBillingContext(): BillingContextType {
  const context = useContext(BillingContext)
  if (!context) {
    throw new Error('useBillingContext must be used within BillingProvider')
  }
  return context
}

/**
 * Optional hook that returns null if not in a BillingProvider
 * Useful for components that may or may not have billing context
 */
export function useBillingContextOptional(): BillingContextType | null {
  return useContext(BillingContext)
}

interface BillingProviderProps {
  children: ReactNode
}

/**
 * Provider for billing state and actions
 *
 * Wrap your app or billing-aware components with this provider
 * to enable access to billing state and feature gating.
 */
export function BillingProvider({ children }: BillingProviderProps) {
  // Get current workspace to refresh billing when workspace changes
  const workspaceContext = useWorkspaceOptional()
  const currentWorkspaceId = workspaceContext?.currentWorkspace?.id

  const {
    billing,
    invoices,
    isOwner,
    loading,
    error,
    refresh,
    createCheckoutSession,
    openPortal,
    isActiveSubscription,
    isPro,
    hasAgents,
    agentCount,
    trialDaysRemaining,
  } = useBilling(currentWorkspaceId)

  /**
   * Check if user can access a specific feature based on billing
   */
  const canAccessFeature = (feature: BillingFeature): boolean => {
    switch (feature) {
      case 'analytics':
        // Advanced analytics requires Pro plan
        return isPro
      case 'api':
        // API access requires Pro plan
        return isPro
      case 'agents':
        // Agent access requires active agent tier
        return hasAgents
      case 'unlimited_storage':
        // Unlimited storage requires Pro plan
        return isPro
      default:
        return false
    }
  }

  return (
    <BillingContext.Provider
      value={{
        billing,
        invoices,
        isOwner,
        loading,
        error,
        refresh,
        createCheckoutSession,
        openPortal,
        isActiveSubscription,
        isPro,
        hasAgents,
        agentCount,
        trialDaysRemaining,
        canAccessFeature,
      }}
    >
      {children}
    </BillingContext.Provider>
  )
}
