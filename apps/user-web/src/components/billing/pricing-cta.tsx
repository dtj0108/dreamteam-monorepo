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
}: PricingCTAProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
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
        window.location.href = redirectData.url
        return
      }

      console.log('[PricingCTA] Redirecting to Stripe:', data.url)
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
      color={color}
      size={size}
      className={className}
      onClick={handleClick}
      isDisabled={loading}
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
