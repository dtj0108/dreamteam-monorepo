"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { KPIMetric } from "@/lib/types"

interface KPICardProps {
  metric: KPIMetric
  size?: "default" | "large"
  onEdit?: () => void
}

function formatValue(value: number | null, format: KPIMetric["format"]): string {
  if (value === null) return "—"
  
  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    case "percent":
      return `${value.toFixed(1)}%`
    case "number":
      return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
      }).format(value)
    default:
      return String(value)
  }
}

export function KPICard({ metric, size = "default", onEdit }: KPICardProps) {
  const isLarge = size === "large"
  const hasValue = metric.value !== null
  
  return (
    <Card 
      className={cn(
        "relative transition-all",
        !hasValue && metric.isManualInput && "border-dashed border-2 border-muted-foreground/30",
        onEdit && "cursor-pointer hover:border-primary/50"
      )}
      onClick={onEdit}
    >
      <CardContent className={cn("p-4", isLarge && "p-6")}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="truncate">{metric.name}</span>
            {metric.description && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p>{metric.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {metric.isManualInput && !hasValue && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              Manual
            </span>
          )}
        </div>
        
        <div className={cn("font-bold tracking-tight mt-2", isLarge ? "text-3xl" : "text-2xl")}>
          {formatValue(metric.value, metric.format)}
        </div>
        
        {metric.changePercent !== null && metric.changePercent !== undefined && (
          <div className="flex items-center gap-1.5 mt-1">
            {metric.trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
            {metric.trend === "down" && <TrendingDown className="h-4 w-4 text-rose-500" />}
            {metric.trend === "neutral" && <Minus className="h-4 w-4 text-muted-foreground" />}
            <span 
              className={cn(
                "text-sm font-medium",
                metric.trend === "up" && "text-emerald-600",
                metric.trend === "down" && "text-rose-600",
                metric.trend === "neutral" && "text-muted-foreground"
              )}
            >
              {metric.changePercent > 0 ? "+" : ""}{metric.changePercent.toFixed(1)}%
            </span>
            <span className="text-sm text-muted-foreground">vs last month</span>
          </div>
        )}
        
        {!hasValue && metric.isManualInput && (
          <p className="text-sm text-muted-foreground mt-2">
            Click to add value
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface KPIGridProps {
  metrics: KPIMetric[]
  primaryMetrics?: string[] // IDs of metrics to display larger
  onEditMetric?: (metric: KPIMetric) => void
}

export function KPIGrid({ metrics, primaryMetrics = [], onEditMetric }: KPIGridProps) {
  const primary = metrics.filter(m => primaryMetrics.includes(m.id))
  const secondary = metrics.filter(m => !primaryMetrics.includes(m.id))
  
  return (
    <div className="space-y-4">
      {primary.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {primary.map(metric => (
            <KPICard 
              key={metric.id} 
              metric={metric} 
              size="large"
              onEdit={metric.isManualInput ? () => onEditMetric?.(metric) : undefined}
            />
          ))}
        </div>
      )}
      
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {secondary.map(metric => (
          <KPICard 
            key={metric.id} 
            metric={metric}
            onEdit={metric.isManualInput ? () => onEditMetric?.(metric) : undefined}
          />
        ))}
      </div>
    </div>
  )
}

