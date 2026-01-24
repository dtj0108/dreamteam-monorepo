"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { AgentsProvider } from "@/providers/agents-provider"

export default function AgentsListLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout>
      <AgentsProvider>
        {children}
      </AgentsProvider>
    </DashboardLayout>
  )
}
