"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, Sparkles, Receipt, ExternalLink, Bot, Settings, AlertTriangle, CheckCircle2, PartyPopper } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useBilling, type ProrationPreview } from "@/hooks/use-billing"
import { usePlans, Plan } from "@/hooks/use-plans"
import { type AgentTier, getPaymentMethodInfo } from "@/types/billing"
import { AgentTierConfirmDialog, type AgentTierPricing } from "@/components/billing/agent-tier-confirm-dialog"

interface BillingTabProps {
  workspaceId: string
  isOwner: boolean
  teamMemberCount?: number
}

// Helper to format price from cents
const formatPrice = (amount: number | null, currency = 'usd') => {
  if (amount === null) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

// Helper to get plan display name
const getPlanDisplayName = (plan: string | undefined) => {
  if (!plan || plan === 'free') return 'Free Plan'
  if (plan === 'monthly') return 'Pro Monthly'
  if (plan === 'annual') return 'Pro Annual'
  return plan
}

// Helper to get status badge variant and color
const getStatusBadge = (status: string | null | undefined, plan?: string) => {
  switch (status) {
    case 'active':
      return { label: 'Active', className: 'bg-green-100 text-green-700' }
    case 'trialing':
      return { label: 'Trial', className: 'bg-blue-100 text-blue-700' }
    case 'past_due':
      return { label: 'Past Due', className: 'bg-amber-100 text-amber-700' }
    case 'canceled':
      return { label: 'Canceled', className: 'bg-gray-100 text-gray-700' }
    case 'unpaid':
      return { label: 'Unpaid', className: 'bg-red-100 text-red-700' }
    default:
      // If plan is not free but status is null, show as Active
      if (plan && plan !== 'free') {
        return { label: 'Active', className: 'bg-green-100 text-green-700' }
      }
      return { label: 'Free', className: 'bg-primary/10 text-primary' }
  }
}

// Default fallback values for agent tiers (used when database has no data)
const DEFAULT_AGENT_TIERS: Record<'startup' | 'teams' | 'enterprise', { name: string; agents: number; tagline: string }> = {
  startup: { name: 'Lean Startup', agents: 7, tagline: 'You + a few killers in one room' },
  teams: { name: 'Department Teams', agents: 18, tagline: "Now you've got specialists" },
  enterprise: { name: 'Enterprise Dream Team', agents: 38, tagline: 'This is unfair' },
}

// Helper to get agent tier info from database plans or fallback to defaults
function getAgentTierInfo(
  tier: 'startup' | 'teams' | 'enterprise',
  agentTiers: Plan[]
): { name: string; price: number; agents: number; tagline: string } {
  const plan = agentTiers.find(p => p.slug === tier)
  if (plan) {
    return {
      name: plan.name,
      price: plan.price_monthly ?? 0,
      agents: plan.display_config.agent_count ?? DEFAULT_AGENT_TIERS[tier].agents,
      tagline: plan.display_config.tagline ?? DEFAULT_AGENT_TIERS[tier].tagline,
    }
  }
  // Fallback to defaults with 0 price (requires database configuration)
  return { ...DEFAULT_AGENT_TIERS[tier], price: 0 }
}

// Default fallback prices for workspace plans (in dollars)
const DEFAULT_WORKSPACE_PRICES = {
  monthly: 49,
  annual: 39,
}

// Helper to get workspace plan prices from database or fallback to defaults
function getWorkspacePlanPrices(workspacePlans: Plan[]): {
  monthlyPrice: number
  annualPrice: number
} {
  const monthlyPlan = workspacePlans.find(p => p.slug === 'monthly')
  const annualPlan = workspacePlans.find(p => p.slug === 'annual')

  return {
    monthlyPrice: monthlyPlan?.price_monthly
      ? monthlyPlan.price_monthly / 100
      : DEFAULT_WORKSPACE_PRICES.monthly,
    annualPrice: annualPlan?.price_monthly
      ? annualPlan.price_monthly / 100
      : DEFAULT_WORKSPACE_PRICES.annual,
  }
}

export function BillingTab({ workspaceId, isOwner, teamMemberCount = 0 }: BillingTabProps) {
  const {
    billing,
    invoices,
    canManageBilling,
    loading: billingLoading,
    error,
    createCheckoutSession,
    previewUpgrade,
    openPortal,
    isActiveSubscription,
    isPro,
    hasAgents,
    agentCount,
    trialDaysRemaining,
  } = useBilling()

  const { workspacePlans, agentTiers, loading: plansLoading } = usePlans()

  // Agent tier confirmation modal state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [selectedTier, setSelectedTier] = useState<'startup' | 'teams' | 'enterprise' | null>(null)
  const [prorationPreview, setProrationPreview] = useState<ProrationPreview | null>(null)
  const [prorationLoading, setProrationLoading] = useState(false)
  const [prorationError, setProrationError] = useState<string | null>(null)

  // Success modal state
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [purchasedTier, setPurchasedTier] = useState<'startup' | 'teams' | 'enterprise' | null>(null)

  // Get prices from database with fallbacks
  const { monthlyPrice, annualPrice } = getWorkspacePlanPrices(workspacePlans)

  // Handle opening the confirmation modal for agent tier purchase/upgrade
  const handleTierSelect = useCallback(async (tier: 'startup' | 'teams' | 'enterprise') => {
    setSelectedTier(tier)
    setProrationPreview(null)
    setProrationError(null)
    setConfirmDialogOpen(true)

    // If user has existing agents, fetch proration preview
    if (hasAgents && billing?.agent_tier && billing.agent_tier !== 'none') {
      setProrationLoading(true)
      try {
        const preview = await previewUpgrade(tier)
        setProrationPreview(preview)
      } catch (err) {
        setProrationError(err instanceof Error ? err.message : 'Failed to calculate price')
      } finally {
        setProrationLoading(false)
      }
    }
  }, [hasAgents, billing?.agent_tier, previewUpgrade])

  // Handle confirming the purchase/upgrade
  const handleConfirmPurchase = useCallback(async () => {
    if (!selectedTier) return

    try {
      const result = await createCheckoutSession({ type: 'agent_tier', tier: selectedTier })

      // Handle 3DS required - redirect to confirmation page
      if (result.requiresAction && result.clientSecret) {
        const params = new URLSearchParams({
          client_secret: result.clientSecret,
          tier: selectedTier,
          return_url: window.location.href,
        })
        window.location.href = `/billing/confirm-payment?${params}`
        return
      }

      // For immediate upgrades, show success modal
      if (result.upgraded) {
        setConfirmDialogOpen(false)
        setPurchasedTier(selectedTier)
        setSuccessDialogOpen(true)

        if (result.deploymentFailed) {
          // Show warning toast for deployment issues (modal still shows)
          toast.warning(
            "Agents are still being configured. They should appear shortly.",
            { duration: 6000 }
          )
        }
        setSelectedTier(null)
        return
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process purchase")
    }

    setConfirmDialogOpen(false)
    setSelectedTier(null)
  }, [selectedTier, createCheckoutSession])

  // Get current and target tier info for the modal
  const currentTierInfo: AgentTierPricing | undefined = billing?.agent_tier && billing.agent_tier !== 'none'
    ? getAgentTierInfo(billing.agent_tier as 'startup' | 'teams' | 'enterprise', agentTiers)
    : undefined

  const targetTierInfo: AgentTierPricing | undefined = selectedTier
    ? getAgentTierInfo(selectedTier, agentTiers)
    : undefined

  // Get payment method info from billing state
  const paymentMethod = billing ? getPaymentMethodInfo(billing) : null

  // Check if user can manage billing (owner always can, others need permission)
  if (!canManageBilling && !billingLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>
              Manage your subscription and billing information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You don&apos;t have permission to manage billing settings.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (billingLoading || plansLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p>Failed to load billing: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusBadge = getStatusBadge(billing?.plan_status, billing?.plan)
  const isFreeUser = !billing || billing.plan === 'free'

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Manage your subscription and billing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 border rounded-lg bg-muted/30">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{getPlanDisplayName(billing?.plan)}</h3>
                  <Badge variant="secondary" className={statusBadge.className}>
                    {statusBadge.label}
                  </Badge>
                </div>
                {trialDaysRemaining !== null && trialDaysRemaining > 0 && (
                  <p className="text-sm text-blue-600 mt-1">
                    {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} left in trial
                  </p>
                )}
                {billing?.plan_period_end && isActiveSubscription && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {billing.plan_cancel_at_period_end ? 'Expires' : 'Renews'} on{' '}
                    {new Date(billing.plan_period_end).toLocaleDateString()}
                  </p>
                )}
                {billing?.plan_cancel_at_period_end && (
                  <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Subscription will not renew
                  </p>
                )}
              </div>
              {isPro ? (
                <Button variant="outline" onClick={() => openPortal()}>
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Subscription
                </Button>
              ) : (
                <Button onClick={() => createCheckoutSession({ type: 'workspace_plan', plan: 'annual' })}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Upgrade to Pro
                </Button>
              )}
            </div>

            <hr className="my-4" />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Team members</p>
                <p className="font-medium">
                  {billing?.current_user_count ?? teamMemberCount} / {billing?.included_users ?? 5}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Storage</p>
                <p className="font-medium">
                  {billing?.storage_used_gb ?? 0} GB / {billing?.storage_limit_gb ?? 1} GB
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Transactions</p>
                <p className="font-medium">{isPro ? 'Unlimited' : 'Limited'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Analytics</p>
                <p className="font-medium">{isPro ? 'Advanced' : 'Basic'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Tier Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Agents
          </CardTitle>
          <CardDescription>
            Add AI agents to automate your business operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasAgents ? (
            // Show current agent tier with upgrade options
            <>
              <div className="p-6 border rounded-lg bg-muted/30">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        {billing?.agent_tier && billing.agent_tier !== 'none'
                          ? getAgentTierInfo(billing.agent_tier as 'startup' | 'teams' | 'enterprise', agentTiers).name
                          : 'No Agents'}
                      </h3>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {agentCount} AI agents included
                    </p>
                    {billing?.agent_period_end && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Renews on {new Date(billing.agent_period_end).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Button variant="outline" onClick={() => openPortal()}>
                    <Settings className="mr-2 h-4 w-4" />
                    Manage
                  </Button>
                </div>
              </div>

              {/* Tier change options - show if user has a tier that isn't 'none' */}
              {billing?.agent_tier !== 'none' && (
                <div className="mt-6 space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Change your plan
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    {(['startup', 'teams', 'enterprise'] as const)
                      .filter(tier => tier !== billing?.agent_tier)
                      .map((tier) => {
                        const tierOrder = { startup: 1, teams: 2, enterprise: 3 }
                        const currentOrder = tierOrder[billing?.agent_tier as keyof typeof tierOrder] || 0
                        const isUpgrade = tierOrder[tier] > currentOrder
                        const info = getAgentTierInfo(tier, agentTiers)
                        const currentAgents = agentCount || 0
                        const agentDifference = info.agents - currentAgents
                        return (
                          <div
                            key={tier}
                            className="p-4 border rounded-lg hover:border-primary transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold">{info.name}</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {info.agents} agents total
                                  {agentDifference !== 0 && (
                                    <span className={agentDifference > 0 ? "text-primary ml-1" : "text-amber-600 ml-1"}>
                                      ({agentDifference > 0 ? '+' : ''}{agentDifference} agents)
                                    </span>
                                  )}
                                </p>
                              </div>
                              <p className="text-lg font-bold">
                                ${info.price / 100}
                                <span className="text-xs font-normal text-muted-foreground">/mo</span>
                              </p>
                            </div>
                            <Button
                              className="w-full mt-3"
                              variant="outline"
                              onClick={() => handleTierSelect(tier)}
                            >
                              {isUpgrade ? 'Upgrade' : 'Downgrade'}
                            </Button>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Show agent tier options
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['startup', 'teams', 'enterprise'] as const).map((tier) => {
                const info = getAgentTierInfo(tier, agentTiers)
                return (
                  <div
                    key={tier}
                    className="p-4 border rounded-lg hover:border-primary transition-colors"
                  >
                    <h4 className="font-semibold">{info.name}</h4>
                    <p className="text-2xl font-bold mt-1">
                      ${info.price / 100}
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{info.tagline}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {info.agents} AI agents
                    </p>
                    <Button
                      className="w-full mt-4"
                      variant={tier === 'teams' ? 'default' : 'outline'}
                      onClick={() => handleTierSelect(tier)}
                    >
                      Get Started
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Promo - Only show for free users */}
      {isFreeUser && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary rounded-lg">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Upgrade to Pro</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Get unlimited team members, advanced analytics, priority support, and more.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-3xl font-bold">${annualPrice}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Save 20%
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => createCheckoutSession({ type: 'workspace_plan', plan: 'annual' })}>
                  Get Annual (Recommended)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => createCheckoutSession({ type: 'workspace_plan', plan: 'monthly' })}
                >
                  Monthly ${monthlyPrice}/mo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            View and download your past invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billingLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No invoices yet</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium font-mono text-sm">
                        {invoice.stripe_invoice_id.slice(-8).toUpperCase()}
                      </TableCell>
                      <TableCell>
                        {invoice.created_at
                          ? new Date(invoice.created_at).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {formatPrice(invoice.amount_paid, invoice.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            invoice.status === "paid"
                              ? "bg-green-100 text-green-700"
                              : invoice.status === "open"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-700"
                          }
                        >
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.invoice_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={invoice.invoice_url} target="_blank" rel="noopener noreferrer">
                              View <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Tier Confirmation Modal */}
      {selectedTier && targetTierInfo && (
        <AgentTierConfirmDialog
          open={confirmDialogOpen}
          onOpenChange={setConfirmDialogOpen}
          currentTier={(billing?.agent_tier as AgentTier) ?? 'none'}
          targetTier={selectedTier}
          currentTierInfo={currentTierInfo}
          targetTierInfo={targetTierInfo}
          prorationPreview={prorationPreview}
          prorationLoading={prorationLoading}
          prorationError={prorationError}
          paymentMethod={paymentMethod}
          onConfirm={handleConfirmPurchase}
          onCancel={() => setSelectedTier(null)}
        />
      )}

      {/* Success Modal */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-4 p-4 rounded-full bg-gradient-to-br from-green-100 to-emerald-100">
              <PartyPopper className="h-10 w-10 text-green-600" />
            </div>
            <DialogTitle className="text-2xl">
              Welcome to {purchasedTier && getAgentTierInfo(purchasedTier, agentTiers).name}!
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              You now have{' '}
              <span className="font-semibold text-foreground">
                {purchasedTier && getAgentTierInfo(purchasedTier, agentTiers).agents} AI agents
              </span>{' '}
              ready to help run your business.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <span>Your agents are being deployed now</span>
              </div>
            </div>
            <Button
              onClick={() => setSuccessDialogOpen(false)}
              className="w-full"
              size="lg"
            >
              Let&apos;s Go!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
