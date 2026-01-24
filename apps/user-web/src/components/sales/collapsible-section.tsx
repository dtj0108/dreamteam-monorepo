"use client"

import * as React from "react"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRightIcon, PlusIcon, SearchIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleSectionProps {
  icon: React.ReactNode
  title: string
  count?: number
  defaultOpen?: boolean
  onAdd?: () => void
  onSearch?: () => void
  showSearch?: boolean
  children: React.ReactNode
  className?: string
}

export function CollapsibleSection({
  icon,
  title,
  count,
  defaultOpen = true,
  onAdd,
  onSearch,
  showSearch = false,
  children,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("", className)}>
      <div className="flex items-center justify-between py-3 px-2">
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 rounded-lg px-2 py-1.5 -ml-2 hover:bg-muted/50">
            <ChevronRightIcon
              className={cn(
                "size-4 transition-transform duration-200",
                isOpen && "rotate-90"
              )}
            />
            <span className="flex items-center gap-2">
              {icon}
              {title}
            </span>
            {count !== undefined && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                {count}
              </Badge>
            )}
          </button>
        </CollapsibleTrigger>
        <div className="flex items-center gap-1">
          {showSearch && onSearch && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={(e) => {
                e.stopPropagation()
                onSearch()
              }}
            >
              <SearchIcon className="size-4" />
            </Button>
          )}
          {onAdd && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={(e) => {
                e.stopPropagation()
                onAdd()
              }}
            >
              <PlusIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>
      <CollapsibleContent className="pb-4 pt-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
