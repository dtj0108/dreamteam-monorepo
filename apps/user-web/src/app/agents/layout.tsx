"use client"

import { ProductGate } from "@/components/product-gate"

export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProductGate product="agents">
      {children}
    </ProductGate>
  )
}
