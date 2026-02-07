"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { BillingTab } from "@/components/team"
import { useWorkspace } from "@/providers/workspace-provider"
import { useUser } from "@/hooks/use-user"
import { Loader2 } from "lucide-react"

export default function CustomizeBillingPage() {
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const { user, loading: userLoading } = useUser()

  const isOwner = user?.workspaceRole === "owner"

  if (workspaceLoading || userLoading) {
    return (
      <DashboardLayout breadcrumbs={[
        { label: "Customize", href: "/customize" },
        { label: "Billing" }
      ]}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout breadcrumbs={[
      { label: "Customize", href: "/customize" },
      { label: "Billing" }
    ]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">
            Manage your subscription and payments.
          </p>
        </div>
        {currentWorkspace?.id ? (
          <BillingTab
            workspaceId={currentWorkspace.id}
            isOwner={isOwner}
          />
        ) : (
          <p className="text-muted-foreground">No workspace selected</p>
        )}
      </div>
    </DashboardLayout>
  )
}
