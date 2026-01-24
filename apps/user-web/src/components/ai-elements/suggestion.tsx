"use client"

import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SuggestionProps {
  icon?: LucideIcon
  label: string
  highlight?: string
  onClick?: () => void
  size?: "sm" | "md"
  active?: boolean
  className?: string
}

/**
 * A suggestion chip component used for displaying clickable suggestions.
 *
 * Two modes:
 * - Category chip: icon + label (used for expandable categories)
 * - Suggestion text: label with optional highlighted portion
 */
export function Suggestion({
  icon: Icon,
  label,
  highlight,
  onClick,
  size = "md",
  active = false,
  className,
}: SuggestionProps) {
  // Split label into parts if highlight is provided
  const renderLabel = () => {
    if (!highlight) {
      return <span>{label}</span>
    }

    const lowerLabel = label.toLowerCase()
    const lowerHighlight = highlight.toLowerCase()
    const index = lowerLabel.indexOf(lowerHighlight)

    if (index === -1) {
      return <span>{label}</span>
    }

    const before = label.slice(0, index)
    const match = label.slice(index, index + highlight.length)
    const after = label.slice(index + highlight.length)

    return (
      <span>
        {before}
        <span className="font-semibold">{match}</span>
        {after}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-background",
        "transition-all duration-200 hover:bg-muted hover:border-muted-foreground/30",
        "text-sm text-foreground cursor-pointer",
        size === "sm" ? "px-3 py-1.5" : "px-4 py-2",
        active && "bg-muted border-muted-foreground/30",
        className
      )}
    >
      {Icon && <Icon className={cn("shrink-0", size === "sm" ? "size-3.5" : "size-4")} />}
      {renderLabel()}
    </button>
  )
}

export interface SuggestionGroupProps {
  children: React.ReactNode
  className?: string
}

/**
 * A container for grouping suggestion chips together.
 */
export function SuggestionGroup({ children, className }: SuggestionGroupProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {children}
    </div>
  )
}
