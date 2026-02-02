'use client'

import { useState, useEffect } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Bot, Loader2, ArrowRight, CreditCard, Sparkles, AlertTriangle } from 'lucide-react'
import { type AgentTier, AGENT_TIER_INFO, formatPrice, formatCardBrand } from '@/types/billing'

export interface AgentTierPricing {
  name: string
  price: number // cents
  agents: number
}

export interface ProrationPreview {
  prorated_amount: number // cents - amount to charge now
  credit_amount: number // cents - credit from current plan
  total_due: number // cents - net amount due now
  next_billing_date: string
  next_billing_amount: number // cents - full price at next billing
}

interface PaymentMethodInfo {
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

interface AgentTierConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTier: AgentTier
  targetTier: 'startup' | 'teams' | 'enterprise'
  currentTierInfo?: AgentTierPricing
  targetTierInfo: AgentTierPricing
  prorationPreview: ProrationPreview | null
  prorationLoading: boolean
  prorationError: string | null
  paymentMethod: PaymentMethodInfo | null
  onConfirm: () => Promise<void>
  onCancel?: () => void
}

export function AgentTierConfirmDialog({
  open,
  onOpenChange,
  currentTier,
  targetTier,
  currentTierInfo,
  targetTierInfo,
  prorationPreview,
  prorationLoading,
  prorationError,
  paymentMethod,
  onConfirm,
  onCancel,
}: AgentTierConfirmDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  // Determine upgrade vs downgrade direction
  const tierOrder = { none: 0, startup: 1, teams: 2, enterprise: 3 }
  const isUpgrade = tierOrder[targetTier] > tierOrder[currentTier]
  const isDowngrade = tierOrder[targetTier] < tierOrder[currentTier]
  const hasTier = currentTier !== 'none'
  const currentAgents = currentTierInfo?.agents ?? 0
  const targetAgents = targetTierInfo.agents
  const additionalAgents = targetAgents - currentAgents

  const handleConfirm = async () => {
    setIsProcessing(true)
    try {
      await onConfirm()
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  // Format the price to display
  const displayPrice = hasTier && prorationPreview
    ? prorationPreview.total_due
    : targetTierInfo.price

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            {isDowngrade ? 'Downgrade Agent Tier' : isUpgrade ? 'Upgrade Agent Tier' : 'Add AI Agents'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Tier Transition */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                {hasTier && currentTierInfo ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-center flex-1">
                      <p className="text-xs text-muted-foreground">Current</p>
                      <p className="font-semibold text-foreground">{currentTierInfo.name}</p>
                      <p className="text-sm text-muted-foreground">{currentAgents} agents</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="text-center flex-1">
                      <p className="text-xs text-muted-foreground">New</p>
                      <p className={`font-semibold ${isDowngrade ? 'text-amber-600' : 'text-primary'}`}>{targetTierInfo.name}</p>
                      <p className={`text-sm ${isDowngrade ? 'text-amber-600' : 'text-primary'}`}>{targetAgents} agents</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="font-semibold text-foreground">{targetTierInfo.name}</p>
                    <p className="text-sm text-muted-foreground">{targetAgents} AI agents</p>
                  </div>
                )}

                {hasTier && additionalAgents !== 0 && (
                  <div className="flex items-center justify-center gap-1 pt-2 border-t border-border">
                    {additionalAgents > 0 ? (
                      <>
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-sm text-primary font-medium">
                          +{additionalAgents} additional agents
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span className="text-sm text-amber-600 font-medium">
                          {additionalAgents} agents (switching product line)
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Downgrade warning */}
              {isDowngrade && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    You&apos;ll lose access to your current agents and switch to the {targetTierInfo.name} product line.
                  </p>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                {prorationLoading ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                    <span className="text-sm text-muted-foreground">Calculating price...</span>
                  </div>
                ) : prorationError ? (
                  <p className="text-sm text-destructive text-center">{prorationError}</p>
                ) : hasTier && prorationPreview ? (
                  <>
                    {prorationPreview.credit_amount > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Credit from current plan</span>
                        <span className="text-green-600">
                          -{formatPrice(prorationPreview.credit_amount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Prorated {targetTierInfo.name}</span>
                      <span className="text-foreground">
                        {formatPrice(prorationPreview.prorated_amount)}
                      </span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between items-center">
                      <span className="text-muted-foreground">Due today</span>
                      <span className="text-lg font-bold text-foreground">
                        {formatPrice(prorationPreview.total_due)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                      <span>Then {formatPrice(prorationPreview.next_billing_amount)}/mo</span>
                      <span>
                        Starting{' '}
                        {(() => {
                          const date = new Date(prorationPreview.next_billing_date)
                          return isNaN(date.getTime()) ? 'your next billing date' : date.toLocaleDateString()
                        })()}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Monthly price</span>
                      <span className="text-lg font-bold text-foreground">
                        {formatPrice(targetTierInfo.price)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Billed monthly. Cancel anytime.
                    </p>
                  </>
                )}
              </div>

              {/* Payment Method */}
              {paymentMethod && hasTier && (
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <span className="text-sm text-foreground">
                      {formatCardBrand(paymentMethod.brand)} ending in {paymentMethod.last4}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isProcessing}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isProcessing || prorationLoading}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : isDowngrade ? (
              <>Downgrade{prorationPreview ? ` - ${formatPrice(prorationPreview.total_due)}` : ''}</>
            ) : isUpgrade ? (
              <>Upgrade{prorationPreview ? ` - ${formatPrice(prorationPreview.total_due)}` : ''}</>
            ) : (
              <>Get Started - {formatPrice(targetTierInfo.price)}/mo</>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
