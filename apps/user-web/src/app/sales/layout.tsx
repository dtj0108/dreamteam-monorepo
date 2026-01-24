"use client"

import { usePathname } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProductGate } from "@/components/product-gate"
import { SalesProvider } from "@/providers/sales-provider"

export default function CRMLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isInbox = pathname?.startsWith('/sales/inbox')

  return (
    <ProductGate product="sales">
      <DashboardLayout
        breadcrumbs={[{ label: "Sales", href: "/sales" }]}
        noPadding={isInbox}
        defaultCollapsed={isInbox}
      >
        <SalesProvider>
          {children}
        </SalesProvider>
      </DashboardLayout>
    </ProductGate>
  )
}
