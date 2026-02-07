"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { AgentsProvider } from "@/providers/agents-provider"
import { BillingProvider } from "@/providers/billing-provider"

export default function AgentChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout noPadding>
      <BillingProvider>
        <AgentsProvider>
          {children}
        </AgentsProvider>
      </BillingProvider>
    </DashboardLayout>
  )
}
