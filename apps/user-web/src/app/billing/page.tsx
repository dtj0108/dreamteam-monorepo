"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Loader2 } from "lucide-react"

export default function BillingPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the Team settings with Billing tab
    router.replace("/account?tab=team")
  }, [router])

  return (
    <DashboardLayout breadcrumbs={[{ label: "Billing" }]}>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </DashboardLayout>
  )
}
