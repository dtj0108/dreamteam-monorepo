'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare, Phone, PhoneCall, CheckCircle, XCircle } from 'lucide-react'
import { useSMSCredits, useCallMinutes, usePhoneNumbers, usePaymentMethod, type PurchaseResult } from '@/hooks/use-addons'
import { CreditsBalanceCard } from './credits-balance-card'
import { BundlesGrid } from './bundles-grid'
import { UsageTable } from './usage-table'
import { PhoneBillingCard } from './phone-billing-card'
import { AddonsOverview } from './addons-overview'
import { PurchaseConfirmDialog } from './purchase-confirm-dialog'
import { PaymentMethodCard } from '@/components/billing/payment-method-card'
import { isSMSBalanceLow, isCallMinutesLow, type CreditBundle } from '@/types/addons'

export function AddOnsPage() {
  const searchParams = useSearchParams()
  const successType = searchParams.get('success')
  const canceled = searchParams.get('canceled')
  const creditsAdded = searchParams.get('credits')
  const minutesAdded = searchParams.get('minutes')

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'sms_credits' | 'call_minutes'
    bundle: CreditBundle
  }>({ open: false, type: 'sms_credits', bundle: 'starter' })

  // Direct charge result message
  const [chargeResult, setChargeResult] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const {
    credits: smsCredits,
    recentPurchases: smsPurchases,
    recentUsage: smsUsage,
    isLoading: smsLoading,
    isPurchasing: smsPurchasing,
    purchaseBundle: purchaseSMSBundle,
    refresh: refreshSMS,
  } = useSMSCredits()

  const {
    minutes: callMinutes,
    recentPurchases: minutesPurchases,
    recentUsage: callUsage,
    isLoading: minutesLoading,
    isPurchasing: minutesPurchasing,
    purchaseBundle: purchaseMinutesBundle,
    refresh: refreshMinutes,
  } = useCallMinutes()

  const {
    subscription: phoneSubscription,
    numbers: phoneNumbers,
    isLoading: phoneLoading,
  } = usePhoneNumbers()

  const {
    hasPaymentMethod,
    paymentMethod,
    isLoading: paymentMethodLoading,
    refresh: refreshPaymentMethod,
  } = usePaymentMethod()

  // Refresh data when returning from successful checkout
  useEffect(() => {
    if (successType === 'sms') {
      refreshSMS()
      refreshPaymentMethod() // Card may have been saved
    } else if (successType === 'minutes') {
      refreshMinutes()
      refreshPaymentMethod() // Card may have been saved
    }
  }, [successType, refreshSMS, refreshMinutes, refreshPaymentMethod])

  // Handle purchase with confirmation dialog for saved cards
  const handlePurchase = async (type: 'sms_credits' | 'call_minutes', bundle: CreditBundle) => {
    if (hasPaymentMethod) {
      // Show confirmation dialog for instant charge
      setConfirmDialog({ open: true, type, bundle })
    } else {
      // No saved card - go directly to Stripe Checkout
      if (type === 'sms_credits') {
        await purchaseSMSBundle(bundle)
      } else {
        await purchaseMinutesBundle(bundle)
      }
    }
  }

  // Execute the confirmed purchase
  const handleConfirmPurchase = async () => {
    const { type, bundle } = confirmDialog
    let result: PurchaseResult

    if (type === 'sms_credits') {
      result = await purchaseSMSBundle(bundle)
    } else {
      result = await purchaseMinutesBundle(bundle)
    }

    setConfirmDialog({ ...confirmDialog, open: false })

    if (result.success) {
      setChargeResult({
        type: 'success',
        message: type === 'sms_credits'
          ? `${result.creditsAdded?.toLocaleString()} SMS credits added!`
          : `${result.minutesAdded?.toLocaleString()} call minutes added!`
      })
      // Clear message after 5 seconds
      setTimeout(() => setChargeResult(null), 5000)
    } else if (result.requiresAction) {
      // 3DS required - for now, fall back to checkout
      if (type === 'sms_credits') {
        await purchaseSMSBundle(bundle, { skipDirectCharge: true })
      } else {
        await purchaseMinutesBundle(bundle, { skipDirectCharge: true })
      }
    } else if (result.error && !result.requiresRedirect) {
      setChargeResult({ type: 'error', message: result.error })
      setTimeout(() => setChargeResult(null), 5000)
    }
  }

  const isLoading = smsLoading || minutesLoading || phoneLoading

  return (
    <div className="space-y-6">
      {/* Success Alert */}
      {successType && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Purchase successful!</AlertTitle>
          <AlertDescription className="text-green-700">
            {successType === 'sms' && creditsAdded && (
              <>{Number(creditsAdded).toLocaleString()} SMS credits have been added to your account.</>
            )}
            {successType === 'minutes' && minutesAdded && (
              <>{Number(minutesAdded).toLocaleString()} call minutes have been added to your account.</>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Canceled Alert */}
      {canceled && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Checkout canceled</AlertTitle>
          <AlertDescription className="text-red-700">
            Your purchase was canceled. No charges were made.
          </AlertDescription>
        </Alert>
      )}

      {/* Direct Charge Result Alert */}
      {chargeResult && (
        <Alert className={chargeResult.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
          {chargeResult.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertTitle className={chargeResult.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {chargeResult.type === 'success' ? 'Purchase successful!' : 'Purchase failed'}
          </AlertTitle>
          <AlertDescription className={chargeResult.type === 'success' ? 'text-green-700' : 'text-red-700'}>
            {chargeResult.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="mb-2">
        <h1 className="text-3xl font-bold">Add-ons</h1>
        <p className="text-muted-foreground mt-1">
          Purchase SMS credits, call minutes, and manage phone number billing
        </p>
      </div>

      {/* Quick Stats Overview */}
      {!isLoading && (
        <AddonsOverview
          smsCredits={smsCredits}
          callMinutes={callMinutes}
          phoneSubscription={phoneSubscription}
        />
      )}

      {/* Payment Method Card */}
      {!paymentMethodLoading && (
        <PaymentMethodCard
          paymentMethod={paymentMethod}
          isLoading={paymentMethodLoading}
        />
      )}

      {/* Purchase Confirmation Dialog */}
      <PurchaseConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        type={confirmDialog.type}
        bundle={confirmDialog.bundle}
        paymentMethod={paymentMethod}
        onConfirm={handleConfirmPurchase}
      />

      {/* Tabs */}
      <Tabs defaultValue="sms" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS Credits
          </TabsTrigger>
          <TabsTrigger value="minutes" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Call Minutes
          </TabsTrigger>
          <TabsTrigger value="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Phone Billing
          </TabsTrigger>
        </TabsList>

        {/* SMS Credits Tab */}
        <TabsContent value="sms" className="space-y-6">
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <>
              <CreditsBalanceCard
                type="sms"
                balance={smsCredits?.balance ?? 0}
                lifetimeUsed={smsCredits?.lifetime_used ?? 0}
                lifetimeTotal={smsCredits?.lifetime_credits ?? 0}
                isLow={smsCredits ? isSMSBalanceLow(smsCredits) : false}
              />

              <div>
                <h2 className="text-lg font-semibold mb-4">Purchase Credits</h2>
                <BundlesGrid
                  type="sms"
                  onPurchase={(bundle) => handlePurchase('sms_credits', bundle)}
                  isPurchasing={smsPurchasing}
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Recent Usage</h2>
                <UsageTable type="sms" data={smsUsage} />
              </div>
            </>
          )}
        </TabsContent>

        {/* Call Minutes Tab */}
        <TabsContent value="minutes" className="space-y-6">
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <>
              <CreditsBalanceCard
                type="minutes"
                balance={callMinutes?.balance_minutes ?? 0}
                lifetimeUsed={callMinutes?.lifetime_used_minutes ?? 0}
                lifetimeTotal={callMinutes?.lifetime_minutes ?? 0}
                isLow={callMinutes ? isCallMinutesLow(callMinutes) : false}
              />

              <div>
                <h2 className="text-lg font-semibold mb-4">Purchase Minutes</h2>
                <BundlesGrid
                  type="minutes"
                  onPurchase={(bundle) => handlePurchase('call_minutes', bundle)}
                  isPurchasing={minutesPurchasing}
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Recent Calls</h2>
                <UsageTable type="minutes" data={callUsage} />
              </div>
            </>
          )}
        </TabsContent>

        {/* Phone Billing Tab */}
        <TabsContent value="phone" className="space-y-6">
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <PhoneBillingCard
              subscription={phoneSubscription}
              numbers={phoneNumbers}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Balance card skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-10 w-32 mb-4" />
          <Skeleton className="h-2 w-full mb-6" />
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section header skeleton */}
      <Skeleton className="h-6 w-36" />

      {/* Bundle cards skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-20 mb-2" />
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-8 w-16 mb-4" />
              <div className="space-y-2 mb-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage table skeleton */}
      <Skeleton className="h-6 w-28" />
      <Card>
        <CardContent className="p-0">
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
