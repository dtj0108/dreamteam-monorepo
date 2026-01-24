"use client"

import { Target, CheckCircle2, Calendar } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { ToolResultCard } from "./tool-result-card"
import type { GoalsResult as GoalsResultType } from "@/lib/agent"

interface GoalsResultProps {
  result: GoalsResultType
}

export function GoalsResult({ result }: GoalsResultProps) {
  const { goals, summary } = result

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <ToolResultCard
      icon={<Target className="size-4" />}
      title="Goals"
      status="success"
    >
      <div className="space-y-3">
        {/* Summary */}
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Active: </span>
            <span className="font-medium">{summary.activeCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Completed: </span>
            <span className="font-medium text-green-600">{summary.completedCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Saved: </span>
            <span className="font-medium">
              {formatCurrency(summary.totalSaved)} / {formatCurrency(summary.totalTargeted)}
            </span>
          </div>
        </div>

        {/* Goals list */}
        {goals.length > 0 && (
          <div className="space-y-2">
            {goals.map((goal) => (
              <div key={goal.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    {goal.isAchieved && (
                      <CheckCircle2 className="size-3 text-green-500" />
                    )}
                    <span className="font-medium">{goal.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                    </span>
                    {goal.deadline && (
                      <div className="flex items-center gap-0.5 text-muted-foreground">
                        <Calendar className="size-3" />
                        <span>{formatDate(goal.deadline)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Progress
                  value={goal.progress}
                  className={`h-1.5 ${
                    goal.isAchieved
                      ? "[&>div]:bg-green-500"
                      : goal.progress >= 75
                        ? "[&>div]:bg-emerald-500"
                        : goal.progress >= 50
                          ? "[&>div]:bg-amber-500"
                          : "[&>div]:bg-sky-500"
                  }`}
                />
              </div>
            ))}
          </div>
        )}

        {goals.length === 0 && (
          <p className="text-xs text-muted-foreground">No goals found.</p>
        )}
      </div>
    </ToolResultCard>
  )
}
