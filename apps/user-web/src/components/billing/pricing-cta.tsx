"use client"

import { useState } from "react"
import { Button } from "@/components/base/buttons/button"
import { Loader2 } from "lucide-react"

interface PricingCTAProps {
  /** Plan type for workspace plans */
  plan?: "monthly" | "annual"
  /** Tier type for agent tiers */
  tier?: "startup" | "teams" | "enterprise"
  /** Button text */
  children: React.ReactNode
  /** Button color */
  color?: "primary" | "secondary"
  /** Button size */
  size?: "sm" | "md" | "lg"
  /** Additional className */
  className?: string
  /** Whether user is authenticated */
  isAuthenticated?: boolean
  /** Whether this plan is coming soon (not yet purchasable) */
  isComingSoon?: boolean
}

function trackGa4Event(eventName: "start_cta" | "start_purchase", params: Record<string, unknown>) {
  if (typeof window === "undefined") return
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag
  if (!gtag) return
  gtag("event", eventName, params)
}

function trackMetaEvent(eventName: "start_cta" | "start_purchase", params: Record<string, unknown>) {
  if (typeof window === "undefined") return
  const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq
  if (!fbq) return
  fbq("trackCustom", eventName, params)
}

/**
 * CTA button for pricing page that handles:
 * - Authenticated users: Redirect to authenticated checkout (/api/billing/checkout)
 * - Unauthenticated users: Redirect to public checkout (/api/checkout) -> Stripe -> signup
 */
export function PricingCTA({
  plan,
  tier,
  children,
  color = "primary",
  size = "md",
  className,
  isAuthenticated = false,
  isComingSoon = false,
}: PricingCTAProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    // Don't do anything if coming soon
    if (isComingSoon) return

    const eventParams = {
      source: "pricing_page",
      plan: plan ?? null,
      tier: tier ?? null,
      pricing_type: plan ? "workspace_plan" : "agent_tier",
      is_authenticated: isAuthenticated,
    }
    trackGa4Event("start_cta", eventParams)
    trackMetaEvent("start_cta", eventParams)

    console.log('[PricingCTA] Button clicked!', { plan, tier, isAuthenticated })
    setLoading(true)

    try {
      // Determine which endpoint to use
      const endpoint = isAuthenticated ? "/api/billing/checkout" : "/api/checkout"
      console.log('[PricingCTA] Calling endpoint:', endpoint)

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          plan
            ? { type: "workspace_plan", plan }
            : { type: "agent_tier", tier }
        ),
      })

      console.log('[PricingCTA] Response status:', response.status)
      const data = await response.json()
      console.log('[PricingCTA] Response data:', data)

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session")
      }

      // Handle redirect response from public checkout for authenticated users
      if (data.redirect && data.authenticated) {
        console.log('[PricingCTA] Redirecting authenticated user to billing checkout')
        // User is authenticated but called public endpoint - redirect to billing checkout
        const redirectResponse = await fetch(data.redirect, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            plan
              ? { type: "workspace_plan", plan }
              : { type: "agent_tier", tier }
          ),
        })
        const redirectData = await redirectResponse.json()
        if (!redirectResponse.ok) {
          throw new Error(redirectData.error || "Failed to create checkout session")
        }
        console.log('[PricingCTA] Redirecting to Stripe:', redirectData.url)
        trackGa4Event("start_purchase", eventParams)
        trackMetaEvent("start_purchase", eventParams)
        window.location.href = redirectData.url
        return
      }

      console.log('[PricingCTA] Redirecting to Stripe:', data.url)
      trackGa4Event("start_purchase", eventParams)
      trackMetaEvent("start_purchase", eventParams)
      window.location.href = data.url
    } catch (error) {
      console.error("[PricingCTA] Checkout error:", error)
      setLoading(false)
      // Show error to user temporarily for debugging
      alert(`Checkout error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <Button
      color={isComingSoon ? "secondary" : color}
      size={size}
      className={className}
      onClick={handleClick}
      isDisabled={loading || isComingSoon}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        children
      )}
    </Button>
  )
}

/**
 * Server component wrapper to check auth and pass to PricingCTA
 * Usage: Import in server component, pass user from getSession
 */
export function createPricingCTA(isAuthenticated: boolean) {
  return function BoundPricingCTA(props: Omit<PricingCTAProps, "isAuthenticated">) {
    return <PricingCTA {...props} isAuthenticated={isAuthenticated} />
  }
}
