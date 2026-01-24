"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { ExitPlanDashboard } from "@/components/goals/exit-plan-dashboard"

export default function ExitPage() {
  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Goals", href: "/goals/revenue" },
        { label: "Exit" }
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exit Strategy</h1>
          <p className="text-muted-foreground">
            Plan and track your path to a successful exit
          </p>
        </div>

        <ExitPlanDashboard />
      </div>
    </DashboardLayout>
  )
}
