'use client'

import { useState } from 'react'
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
import { CreditCard, Loader2, MessageSquare, Phone } from 'lucide-react'
import { type CreditBundle, SMS_BUNDLES, MINUTES_BUNDLES, formatAddOnPrice } from '@/types/addons'
import { formatCardBrand } from '@/types/billing'

interface PaymentMethodInfo {
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

interface PurchaseConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'sms_credits' | 'call_minutes'
  bundle: CreditBundle
  paymentMethod: PaymentMethodInfo | null
  onConfirm: () => Promise<void>
  onCancel?: () => void
}

export function PurchaseConfirmDialog({
  open,
  onOpenChange,
  type,
  bundle,
  paymentMethod,
  onConfirm,
  onCancel,
}: PurchaseConfirmDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const bundleConfig = type === 'sms_credits' ? SMS_BUNDLES[bundle] : MINUTES_BUNDLES[bundle]
  const isMinutes = type === 'call_minutes'

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

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isMinutes ? (
              <Phone className="h-5 w-5 text-green-600" />
            ) : (
              <MessageSquare className="h-5 w-5 text-blue-600" />
            )}
            Confirm Purchase
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Bundle Details */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    {isMinutes ? 'Minutes' : 'Credits'}
                  </span>
                  <span className="font-semibold text-foreground">
                    {isMinutes
                      ? `${(bundleConfig as typeof MINUTES_BUNDLES.starter).minutes.toLocaleString()} minutes`
                      : `${(bundleConfig as typeof SMS_BUNDLES.starter).credits.toLocaleString()} credits`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Bundle</span>
                  <span className="font-semibold text-foreground capitalize">{bundle}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between items-center">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-lg font-bold text-foreground">
                    {formatAddOnPrice(bundleConfig.price)}
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              {paymentMethod && (
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
          <AlertDialogAction onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>Pay {formatAddOnPrice(bundleConfig.price)}</>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
