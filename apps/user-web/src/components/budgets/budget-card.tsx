"use client"

import Link from "next/link"
import { AlertTriangle, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { BUDGET_PERIOD_LABELS } from "@/lib/types"
import type { BudgetPeriod, Category } from "@/lib/types"

interface BudgetCardProps {
  id: string
  category: Category
  amount: number
  spent: number
  remaining: number
  percentUsed: number
  period: BudgetPeriod
  className?: string
}

export function BudgetCard({
  id,
  category,
  amount,
  spent,
  remaining,
  percentUsed,
  period,
  className,
}: BudgetCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const isOverBudget = percentUsed >= 100
  const isWarning = percentUsed >= 80 && percentUsed < 100
  const isGood = percentUsed < 50

  return (
    <Link href={`/budgets/${id}`}>
      <Card
        className={cn(
          "hover:shadow-md transition-shadow cursor-pointer",
          isOverBudget && "border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20",
          className
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span className="font-medium">{category.name}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {BUDGET_PERIOD_LABELS[period]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Progress bar */}
          <div className="space-y-1">
            <Progress
              value={Math.min(percentUsed, 100)}
              className={cn(
                "h-2",
                isOverBudget && "[&>div]:bg-rose-500",
                isWarning && "[&>div]:bg-amber-500",
                isGood && "[&>div]:bg-emerald-500"
              )}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{Math.round(percentUsed)}% used</span>
              {isOverBudget && (
                <span className="flex items-center gap-1 text-rose-600">
                  <AlertTriangle className="h-3 w-3" />
                  Over budget
                </span>
              )}
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Budget</p>
              <p className="font-semibold">{formatCurrency(amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Spent</p>
              <p className={cn("font-semibold", isOverBudget && "text-rose-600")}>
                {formatCurrency(spent)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Left</p>
              <p className={cn(
                "font-semibold",
                isOverBudget ? "text-rose-600" : "text-emerald-600"
              )}>
                {isOverBudget ? `-${formatCurrency(Math.abs(remaining))}` : formatCurrency(remaining)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

