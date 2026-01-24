"use client"

import { useBillingContextOptional, type BillingFeature } from '@/providers/billing-provider'
import { Button } from '@dreamteam/ui/button'
import { Lock, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface FeatureGateProps {
  /** Feature to check access for */
  feature: BillingFeature
  /** Content to show if user has access */
  children: React.ReactNode
  /** Optional custom fallback content */
  fallback?: React.ReactNode
  /** Show loading skeleton while billing data loads (default: true) */
  showLoading?: boolean
}

/**
 * Component that gates content based on billing plan
 *
 * @example
 * ```tsx
 * <FeatureGate feature="analytics">
 *   <AdvancedAnalyticsChart />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  showLoading = true,
}: FeatureGateProps) {
  const billing = useBillingContextOptional()

  // If not in billing context, show content (graceful degradation)
  if (!billing) {
    return <>{children}</>
  }

  const { loading, canAccessFeature } = billing

  // Show loading state
  if (loading && showLoading) {
    return <div className="animate-pulse h-32 bg-muted rounded-lg" />
  }

  // User has access - show content
  if (canAccessFeature(feature)) {
    return <>{children}</>
  }

  // User doesn't have access - show fallback or default upgrade prompt
  if (fallback) {
    return <>{fallback}</>
  }

  // Default upgrade prompt
  return <UpgradePrompt feature={feature} />
}

interface UpgradePromptProps {
  feature: BillingFeature
}

/**
 * Default upgrade prompt shown when user doesn't have access
 */
function UpgradePrompt({ feature }: UpgradePromptProps) {
  const featureInfo: Record<BillingFeature, { title: string; description: string }> = {
    analytics: {
      title: 'Advanced Analytics',
      description: 'Get detailed insights with advanced analytics and custom reports.',
    },
    api: {
      title: 'API Access',
      description: 'Connect your tools with full API access and webhooks.',
    },
    agents: {
      title: 'AI Agents',
      description: 'Automate your workflow with AI-powered agents.',
    },
    unlimited_storage: {
      title: 'Unlimited Storage',
      description: 'Store unlimited files and documents.',
    },
  }

  const info = featureInfo[feature]

  return (
    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/30">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{info.title}</h3>
      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
        {info.description}
      </p>
      <Button asChild>
        <Link href="/billing" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Upgrade to Pro
        </Link>
      </Button>
    </div>
  )
}

/**
 * Hook to check feature access without rendering a gate
 *
 * @example
 * ```tsx
 * const canAccess = useCanAccessFeature('analytics')
 * if (canAccess) {
 *   // show analytics button
 * }
 * ```
 */
export function useCanAccessFeature(feature: BillingFeature): boolean {
  const billing = useBillingContextOptional()

  // If not in billing context, assume access (graceful degradation)
  if (!billing) return true

  return billing.canAccessFeature(feature)
}

/**
 * Inline badge showing upgrade prompt
 * Useful for showing next to features in menus/lists
 */
export function UpgradeBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded bg-primary/10 text-primary ${className || ''}`}
    >
      <Sparkles className="h-3 w-3" />
      Pro
    </span>
  )
}
