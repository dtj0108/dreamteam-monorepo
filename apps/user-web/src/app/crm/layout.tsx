"use client"

import { DashboardLayout } from "@/components/dashboard-layout"

export default function CRMLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout
      breadcrumbs={[{ label: "CRM", href: "/crm" }]}
    >
      {children}
    </DashboardLayout>
  )
}

