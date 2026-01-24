"use client"

import { PieChart, AlertTriangle } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { ToolResultCard } from "./tool-result-card"
import type { BudgetsResult as BudgetsResultType } from "@/lib/agent"

interface BudgetsResultProps {
  result: BudgetsResultType
}

export function BudgetsResult({ result }: BudgetsResultProps) {
  const { budgets, summary } = result

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <ToolResultCard
      icon={<PieChart className="size-4" />}
      title="Budgets"
      status="success"
    >
      <div className="space-y-3">
        {/* Summary */}
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Total Budgeted: </span>
            <span className="font-medium">{formatCurrency(summary.totalBudgeted)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Spent: </span>
            <span className="font-medium">{formatCurrency(summary.totalSpent)}</span>
          </div>
          {summary.overBudgetCount > 0 && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="size-3" />
              <span>{summary.overBudgetCount} over budget</span>
            </div>
          )}
        </div>

        {/* Budget list */}
        {budgets.length > 0 && (
          <div className="space-y-2">
            {budgets.map((budget) => (
              <div key={budget.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{budget.category}</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, budget.percentUsed)}
                  className={`h-1.5 ${
                    budget.percentUsed > 100
                      ? "[&>div]:bg-red-500"
                      : budget.percentUsed > 80
                        ? "[&>div]:bg-amber-500"
                        : "[&>div]:bg-green-500"
                  }`}
                />
              </div>
            ))}
          </div>
        )}

        {budgets.length === 0 && (
          <p className="text-xs text-muted-foreground">No active budgets found.</p>
        )}
      </div>
    </ToolResultCard>
  )
}
