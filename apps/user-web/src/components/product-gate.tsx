"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser, type ProductId } from "@/hooks/use-user"
import { Loader2, Lock } from "lucide-react"

interface ProductGateProps {
  product: ProductId
  children: React.ReactNode
  fallbackUrl?: string
}

/**
 * Gate component that checks if the user has access to a product.
 * Redirects to fallbackUrl (or /) if they don't have access.
 */
export function ProductGate({ product, children, fallbackUrl = "/" }: ProductGateProps) {
  const router = useRouter()
  const { user, loading } = useUser()

  const allowedProducts = user?.allowedProducts || []
  const hasAccess = allowedProducts.includes(product)

  useEffect(() => {
    // Wait until we know the user's access
    if (loading) return
    
    // If user is logged in but doesn't have access, redirect
    if (user && !hasAccess) {
      router.replace(fallbackUrl)
    }
  }, [loading, user, hasAccess, router, fallbackUrl])

  // Show loading state while checking
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Show access denied message briefly before redirect
  if (user && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold">Access Restricted</h2>
          <p className="text-sm text-muted-foreground">
            You don&apos;t have access to this product. Redirecting...
          </p>
        </div>
      </div>
    )
  }

  // User has access, render children
  return <>{children}</>
}

