"use client"

import { useMemo } from "react"
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface BudgetProjectionProps {
  spent: number
  budget: number
  periodStart: string
  periodEnd: string
  className?: string
}

export function BudgetProjection({
  spent,
  budget,
  periodStart,
  periodEnd,
  className,
}: BudgetProjectionProps) {
  const projection = useMemo(() => {
    const start = new Date(periodStart)
    const end = new Date(periodEnd)
    const now = new Date()

    // Calculate days
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const daysPassed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const daysRemaining = totalDays - daysPassed

    if (daysPassed <= 0) {
      return {
        projectedTotal: 0,
        dailyAverage: 0,
        daysRemaining: totalDays,
        onTrack: true,
        percentComplete: 0,
      }
    }

    // Calculate projections
    const dailyAverage = spent / daysPassed
    const projectedTotal = dailyAverage * totalDays
    const percentComplete = (daysPassed / totalDays) * 100
    const idealSpent = (budget / totalDays) * daysPassed
    const onTrack = spent <= idealSpent * 1.1 // 10% buffer

    return {
      projectedTotal,
      dailyAverage,
      daysRemaining: Math.max(0, daysRemaining),
      onTrack,
      percentComplete,
      idealSpent,
    }
  }, [spent, budget, periodStart, periodEnd])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const willExceed = projection.projectedTotal > budget
  const percentOver = ((projection.projectedTotal - budget) / budget) * 100

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          End of Period Projection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Projected Total */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">
              {formatCurrency(projection.projectedTotal)}
            </p>
            <p className="text-xs text-muted-foreground">
              projected total spending
            </p>
          </div>
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full",
            willExceed ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
          )}>
            {willExceed ? (
              <TrendingUp className="h-6 w-6" />
            ) : (
              <TrendingDown className="h-6 w-6" />
            )}
          </div>
        </div>

        {/* Status */}
        <div className={cn(
          "flex items-center gap-2 rounded-lg p-3",
          willExceed ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50"
        )}>
          {willExceed ? (
            <>
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                On track to exceed budget by {formatCurrency(projection.projectedTotal - budget)} ({Math.round(percentOver)}%)
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">
                On track to stay under budget
              </span>
            </>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Daily Average</p>
            <p className="font-semibold">{formatCurrency(projection.dailyAverage)}/day</p>
          </div>
          <div>
            <p className="text-muted-foreground">Days Remaining</p>
            <p className="font-semibold">{projection.daysRemaining} days</p>
          </div>
          <div>
            <p className="text-muted-foreground">Budget</p>
            <p className="font-semibold">{formatCurrency(budget)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Period Progress</p>
            <p className="font-semibold">{Math.round(projection.percentComplete)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

