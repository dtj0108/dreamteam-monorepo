"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { AgentsProvider } from "@/providers/agents-provider"

export default function AgentChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout noPadding>
      <AgentsProvider>
        {children}
      </AgentsProvider>
    </DashboardLayout>
  )
}
