"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  trend?: "up" | "down" | "neutral"
  className?: string
  valueClassName?: string
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel = "vs last period",
  icon,
  trend,
  className,
  valueClassName,
}: MetricCardProps) {
  // Determine trend from change if not provided
  const actualTrend = trend || (change === undefined ? undefined : change > 0 ? "up" : change < 0 ? "down" : "neutral")

  const trendColors = {
    up: "text-emerald-600",
    down: "text-rose-600",
    neutral: "text-muted-foreground",
  }

  const TrendIcon = actualTrend === "up" ? ArrowUpIcon : actualTrend === "down" ? ArrowDownIcon : MinusIcon

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", valueClassName)}>
          {typeof value === "number" ? formatCurrency(value) : value}
        </div>
        {change !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs mt-1", trendColors[actualTrend || "neutral"])}>
            <TrendIcon className="h-3 w-3" />
            <span>{Math.abs(change).toFixed(1)}%</span>
            <span className="text-muted-foreground">{changeLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

