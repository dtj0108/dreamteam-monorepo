'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

interface UpdatePaymentMethodModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientSecret: string
  onSuccess: () => void
}

function UpdateCardForm({
  clientSecret,
  onSuccess,
  onOpenChange,
}: {
  clientSecret: string
  onSuccess: () => void
  onOpenChange: (open: boolean) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) return

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) return

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: setupError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElement },
      })

      if (setupError) {
        setError(setupError.message || 'Failed to update card. Please try again.')
        return
      }

      if (!setupIntent?.payment_method) {
        setError('No payment method returned. Please try again.')
        return
      }

      const paymentMethodId =
        typeof setupIntent.payment_method === 'string'
          ? setupIntent.payment_method
          : setupIntent.payment_method.id

      const response = await fetch('/api/addons/payment-method', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId }),
      })

      if (!response.ok) {
        throw new Error('Failed to save payment method')
      }

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="rounded-md border p-3">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#1a1a1a',
                  '::placeholder': { color: '#a0a0a0' },
                },
              },
            }}
          />
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
      <DialogFooter className="mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Card'
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function UpdatePaymentMethodModal({
  open,
  onOpenChange,
  clientSecret,
  onSuccess,
}: UpdatePaymentMethodModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Payment Method</DialogTitle>
          <DialogDescription>
            Enter your new card details below.
          </DialogDescription>
        </DialogHeader>
        {clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <UpdateCardForm
              clientSecret={clientSecret}
              onSuccess={onSuccess}
              onOpenChange={onOpenChange}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  )
}
