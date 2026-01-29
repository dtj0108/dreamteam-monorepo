'use client'

import { useState } from 'react'
import { CreditCard, Trash2, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { formatCardBrand, isCardExpiringSoon, type BillingState } from '@/types/billing'

interface PaymentMethodInfo {
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

interface PaymentMethodCardProps {
  paymentMethod: PaymentMethodInfo | null
  billing?: BillingState | null
  onUpdate?: () => Promise<void>
  onRemove?: () => Promise<void>
  isLoading?: boolean
}

// Card brand icons (simplified SVG versions)
function CardBrandIcon({ brand }: { brand: string }) {
  const normalizedBrand = brand.toLowerCase()

  // Use colored backgrounds for different brands
  const brandColors: Record<string, string> = {
    visa: 'bg-blue-600',
    mastercard: 'bg-orange-500',
    amex: 'bg-blue-500',
    discover: 'bg-orange-600',
    default: 'bg-gray-500',
  }

  const bgColor = brandColors[normalizedBrand] || brandColors.default

  return (
    <div className={`w-10 h-7 rounded flex items-center justify-center ${bgColor}`}>
      <span className="text-white text-xs font-bold uppercase">
        {normalizedBrand === 'visa'
          ? 'VISA'
          : normalizedBrand === 'mastercard'
            ? 'MC'
            : normalizedBrand === 'amex'
              ? 'AMEX'
              : normalizedBrand.slice(0, 4).toUpperCase()}
      </span>
    </div>
  )
}

export function PaymentMethodCard({
  paymentMethod,
  billing,
  onUpdate,
  onRemove,
  isLoading = false,
}: PaymentMethodCardProps) {
  const [isRemoving, setIsRemoving] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const isExpiringSoon = billing ? isCardExpiringSoon(billing) : false

  const handleRemove = async () => {
    if (!onRemove) return
    setIsRemoving(true)
    try {
      await onRemove()
    } finally {
      setIsRemoving(false)
    }
  }

  const handleUpdate = async () => {
    if (!onUpdate) return
    setIsUpdating(true)
    try {
      await onUpdate()
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!paymentMethod) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
          <CardDescription>
            No payment method on file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Add a payment method to enable instant purchases and auto-replenish.
            Your card will be saved after your first purchase.
          </p>
          {onUpdate && (
            <Button variant="outline" onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              Add Payment Method
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Method
        </CardTitle>
        <CardDescription>
          Card used for add-ons and auto-replenish
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Card Info */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <CardBrandIcon brand={paymentMethod.brand} />
          <div className="flex-1">
            <p className="font-medium">
              {formatCardBrand(paymentMethod.brand)} ending in {paymentMethod.last4}
            </p>
            <p className="text-sm text-muted-foreground">
              Expires {paymentMethod.expMonth.toString().padStart(2, '0')}/{paymentMethod.expYear}
            </p>
          </div>
        </div>

        {/* Expiring Soon Warning */}
        {isExpiringSoon && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            <span className="text-sm text-yellow-700 dark:text-yellow-400">
              Your card is expiring soon. Please update it to avoid payment failures.
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {onUpdate && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUpdate}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Update Card
            </Button>
          )}

          {onRemove && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Payment Method?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Removing your payment method will disable instant purchases and auto-replenish.
                    You&apos;ll need to enter your card details again for future purchases.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRemove}
                    disabled={isRemoving}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isRemoving ? 'Removing...' : 'Remove Card'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
