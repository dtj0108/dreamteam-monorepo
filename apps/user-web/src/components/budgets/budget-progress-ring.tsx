"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"

interface BudgetProgressRingProps {
  percent: number
  size?: number
  strokeWidth?: number
  className?: string
  showLabel?: boolean
}

export function BudgetProgressRing({
  percent,
  size = 120,
  strokeWidth = 10,
  className,
  showLabel = true,
}: BudgetProgressRingProps) {
  const { radius, circumference, offset, color } = useMemo(() => {
    const r = (size - strokeWidth) / 2
    const c = 2 * Math.PI * r
    const clampedPercent = Math.min(Math.max(percent, 0), 100)
    const o = c - (clampedPercent / 100) * c

    // Color based on percentage
    let col = "stroke-emerald-500"
    if (percent >= 100) {
      col = "stroke-rose-500"
    } else if (percent >= 80) {
      col = "stroke-amber-500"
    } else if (percent >= 50) {
      col = "stroke-sky-500"
    }

    return { radius: r, circumference: c, offset: o, color: col }
  }, [percent, size, strokeWidth])

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(color, "transition-all duration-500 ease-out")}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">
            {Math.round(percent)}%
          </span>
          <span className="text-xs text-muted-foreground">used</span>
        </div>
      )}
    </div>
  )
}

