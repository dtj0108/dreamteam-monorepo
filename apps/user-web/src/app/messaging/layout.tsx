"use client"

import { DashboardLayout } from "@/components/dashboard-layout"

export default function MessagingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout
      breadcrumbs={[{ label: "Messaging", href: "/messaging" }]}
    >
      {children}
    </DashboardLayout>
  )
}

