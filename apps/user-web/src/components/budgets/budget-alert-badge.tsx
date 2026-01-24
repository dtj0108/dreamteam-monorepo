"use client"

import { AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface BudgetAlertBadgeProps {
  percentUsed: number
  className?: string
}

export function BudgetAlertBadge({ percentUsed, className }: BudgetAlertBadgeProps) {
  if (percentUsed >= 100) {
    return (
      <Badge 
        variant="destructive" 
        className={cn("gap-1", className)}
      >
        <AlertCircle className="h-3 w-3" />
        Over Budget
      </Badge>
    )
  }

  if (percentUsed >= 80) {
    return (
      <Badge 
        variant="outline" 
        className={cn("gap-1 border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/50", className)}
      >
        <AlertTriangle className="h-3 w-3" />
        80% Used
      </Badge>
    )
  }

  if (percentUsed >= 50) {
    return (
      <Badge 
        variant="outline" 
        className={cn("gap-1 border-sky-500 text-sky-600 bg-sky-50 dark:bg-sky-950/50", className)}
      >
        50% Used
      </Badge>
    )
  }

  return (
    <Badge 
      variant="outline" 
      className={cn("gap-1 border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50", className)}
    >
      <CheckCircle2 className="h-3 w-3" />
      On Track
    </Badge>
  )
}

