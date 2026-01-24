"use client"

import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { KnowledgeCategory } from "@/providers/knowledge-provider"

interface CategoryBadgeProps {
  category: KnowledgeCategory
  onRemove?: () => void
  onClick?: () => void
  size?: "sm" | "default"
  className?: string
}

export function CategoryBadge({
  category,
  onRemove,
  onClick,
  size = "default",
  className,
}: CategoryBadgeProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault()
      e.stopPropagation()
      onClick()
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onRemove?.()
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1 font-normal",
        size === "sm" && "text-xs px-1.5 py-0",
        onClick && "cursor-pointer hover:opacity-80",
        className
      )}
      style={{
        backgroundColor: category.color ? `${category.color}20` : undefined,
        color: category.color || undefined,
        borderColor: category.color ? `${category.color}40` : undefined,
      }}
      onClick={handleClick}
    >
      <span
        className="size-2 rounded-full"
        style={{ backgroundColor: category.color || "#6b7280" }}
      />
      <span>{category.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          className="ml-0.5 rounded-full hover:bg-black/10 p-0.5 -mr-1"
        >
          <X className="size-3" />
        </button>
      )}
    </Badge>
  )
}
