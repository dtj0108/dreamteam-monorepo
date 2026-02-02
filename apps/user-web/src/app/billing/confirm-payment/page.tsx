"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, XCircle, ShieldCheck } from "lucide-react"

// Initialize Stripe.js outside component to avoid re-initialization
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

type ConfirmationState = "confirming" | "success" | "error"

function ConfirmPaymentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const clientSecret = searchParams.get("client_secret")
  const tier = searchParams.get("tier")
  const returnUrl = searchParams.get("return_url") || "/account?tab=team"

  const [state, setState] = useState<ConfirmationState>("confirming")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const confirmPayment = useCallback(async () => {
    if (!clientSecret) {
      setState("error")
      setErrorMessage("Missing payment information. Please try again.")
      return
    }

    try {
      const stripe = await stripePromise

      if (!stripe) {
        setState("error")
        setErrorMessage("Failed to load payment processor. Please refresh and try again.")
        return
      }

      // Confirm the payment with 3D Secure
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret)

      if (error) {
        console.error("[confirm-payment] Error:", error)
        setState("error")
        setErrorMessage(error.message || "Payment failed. Please try again.")
        return
      }

      if (paymentIntent?.status === "succeeded") {
        setState("success")
        // Wait a moment to show success, then redirect
        setTimeout(() => {
          router.push(returnUrl)
        }, 2000)
      } else {
        setState("error")
        setErrorMessage(`Payment status: ${paymentIntent?.status}. Please contact support.`)
      }
    } catch (err) {
      console.error("[confirm-payment] Exception:", err)
      setState("error")
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.")
    }
  }, [clientSecret, returnUrl, router])

  useEffect(() => {
    confirmPayment()
  }, [confirmPayment])

  const tierDisplayName = tier
    ? { startup: "Lean Startup", teams: "Teams", enterprise: "Enterprise" }[tier] || tier
    : "Agent Tier"

  return (
    <DashboardLayout breadcrumbs={[{ label: "Billing" }, { label: "Confirm Payment" }]}>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {state === "confirming" && (
              <>
                <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Confirming Payment</CardTitle>
                <CardDescription>
                  Please complete the security verification for your {tierDisplayName} subscription.
                </CardDescription>
              </>
            )}

            {state === "success" && (
              <>
                <div className="mx-auto mb-4 p-3 rounded-full bg-green-100">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-green-600">Payment Successful!</CardTitle>
                <CardDescription>
                  Your {tierDisplayName} subscription is now active. Redirecting...
                </CardDescription>
              </>
            )}

            {state === "error" && (
              <>
                <div className="mx-auto mb-4 p-3 rounded-full bg-red-100">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle className="text-red-600">Payment Failed</CardTitle>
                <CardDescription>
                  {errorMessage || "There was an issue processing your payment."}
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="text-center">
            {state === "confirming" && (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Your bank may ask you to verify this payment.
                </p>
              </div>
            )}

            {state === "success" && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirecting to billing...
              </div>
            )}

            {state === "error" && (
              <div className="flex flex-col gap-3">
                <Button onClick={() => router.push(returnUrl)} variant="outline">
                  Return to Billing
                </Button>
                <Button onClick={() => confirmPayment()} variant="ghost" size="sm">
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default function ConfirmPaymentPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout breadcrumbs={[{ label: "Billing" }, { label: "Confirm Payment" }]}>
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DashboardLayout>
      }
    >
      <ConfirmPaymentContent />
    </Suspense>
  )
}
