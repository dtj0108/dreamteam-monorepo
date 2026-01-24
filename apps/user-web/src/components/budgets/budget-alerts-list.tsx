"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Target, Loader2, TrendingUp, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface BudgetAlert {
  id: string
  category: {
    id: string
    name: string
    icon?: string
  }
  amount: number
  spent: number
  remaining: number
  percentUsed: number
  status: "warning" | "exceeded"
  period: string
  periodStart: string
  periodEnd: string
}

interface BudgetAlertsListProps {
  /** Minimum percentage to show alerts for (default 80) */
  threshold?: number
}

export function BudgetAlertsList({ threshold = 80 }: BudgetAlertsListProps) {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([])
  const [loading, setLoading] = useState(true)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch(`/api/budgets/alerts?threshold=${threshold}`)
        if (!response.ok) throw new Error("Failed to fetch")
        const data = await response.json()
        setAlerts(data)
      } catch (error) {
        console.error("Failed to fetch budget alerts:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [threshold])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <TrendingUp className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="font-medium">All budgets on track</p>
        <p className="text-sm text-muted-foreground">
          No budgets are currently approaching or exceeding their limits
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const isExceeded = alert.status === "exceeded"

        return (
          <Link
            key={alert.id}
            href={`/budgets/${alert.id}`}
            className="block"
          >
            <div
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
                isExceeded
                  ? "border-rose-400 bg-rose-50 dark:bg-rose-950/20"
                  : "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isExceeded ? "bg-rose-100 dark:bg-rose-900/30" : "bg-amber-100 dark:bg-amber-900/30"
                  }`}
                >
                  {isExceeded ? (
                    <AlertTriangle className="h-5 w-5 text-rose-600" />
                  ) : (
                    <Target className="h-5 w-5 text-amber-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{alert.category?.name || "Unknown Category"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress
                      value={Math.min(alert.percentUsed, 100)}
                      className={`h-2 flex-1 ${
                        isExceeded ? "[&>div]:bg-rose-500" : "[&>div]:bg-amber-500"
                      }`}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {alert.percentUsed.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(alert.spent)} of {formatCurrency(alert.amount)} ({alert.period})
                  </p>
                </div>
              </div>
              <div className="ml-3 text-right shrink-0">
                <Badge
                  variant={isExceeded ? "destructive" : "default"}
                  className={!isExceeded ? "bg-amber-500 hover:bg-amber-600" : ""}
                >
                  {isExceeded ? "Over Budget" : "Warning"}
                </Badge>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
