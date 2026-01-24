"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Hash, Lock, Zap, Clock, ImageIcon, Smile, BarChart3 } from "lucide-react"
import { useEffect, useRef } from "react"

export type AutocompleteType = "mention" | "channel" | "command"

export interface AutocompleteItem {
  id: string
  label: string
  sublabel?: string
  avatar?: string
  icon?: React.ReactNode
  isPrivate?: boolean
}

interface AutocompletePopupProps {
  type: AutocompleteType
  items: AutocompleteItem[]
  selectedIndex: number
  onSelect: (item: AutocompleteItem) => void
  onClose: () => void
  className?: string
}

export function AutocompletePopup({
  type,
  items,
  selectedIndex,
  onSelect,
  onClose,
  className,
}: AutocompletePopupProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return

    const selectedItem = list.children[selectedIndex] as HTMLElement
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: "nearest" })
    }
  }, [selectedIndex])

  if (items.length === 0) {
    return (
      <div className={cn(
        "absolute bottom-full left-0 mb-1 w-72 bg-popover border rounded-lg shadow-lg p-3 z-50",
        className
      )}>
        <p className="text-sm text-muted-foreground text-center">
          {type === "mention" && "No users found"}
          {type === "channel" && "No channels found"}
          {type === "command" && "No commands found"}
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "absolute bottom-full left-0 mb-1 w-72 bg-popover border rounded-lg shadow-lg overflow-hidden z-50",
        className
      )}
    >
      <div className="px-3 py-2 border-b">
        <p className="text-xs font-medium text-muted-foreground">
          {type === "mention" && "People"}
          {type === "channel" && "Channels"}
          {type === "command" && "Commands"}
        </p>
      </div>
      <div ref={listRef} className="max-h-60 overflow-y-auto p-1">
        {items.map((item, index) => (
          <button
            key={item.id}
            className={cn(
              "w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-left transition-colors",
              index === selectedIndex ? "bg-muted" : "hover:bg-muted/50"
            )}
            onClick={() => onSelect(item)}
            onMouseEnter={() => {
              // Could update selectedIndex on hover if desired
            }}
          >
            {type === "mention" && (
              <Avatar className="size-7">
                <AvatarImage src={item.avatar} alt={item.label} />
                <AvatarFallback className="text-xs">
                  {item.label.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}

            {type === "channel" && (
              <span className="size-7 flex items-center justify-center text-muted-foreground">
                {item.isPrivate ? <Lock className="size-4" /> : <Hash className="size-4" />}
              </span>
            )}

            {type === "command" && item.icon && (
              <span className="size-7 flex items-center justify-center text-muted-foreground">
                {item.icon}
              </span>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.label}</p>
              {item.sublabel && (
                <p className="text-xs text-muted-foreground truncate">{item.sublabel}</p>
              )}
            </div>
          </button>
        ))}
      </div>
      <div className="px-3 py-1.5 border-t bg-muted/30">
        <p className="text-[10px] text-muted-foreground">
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd> to navigate
          <span className="mx-2">·</span>
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↵</kbd> to select
          <span className="mx-2">·</span>
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">esc</kbd> to close
        </p>
      </div>
    </div>
  )
}

// Predefined slash commands
export const slashCommands: AutocompleteItem[] = [
  { id: "giphy", label: "/giphy", sublabel: "Search for a GIF", icon: <ImageIcon className="size-4" /> },
  { id: "remind", label: "/remind", sublabel: "Set a reminder", icon: <Clock className="size-4" /> },
  { id: "shrug", label: "/shrug", sublabel: "Append ¯\\_(ツ)_/¯", icon: <Smile className="size-4" /> },
  { id: "poll", label: "/poll", sublabel: "Create a poll", icon: <BarChart3 className="size-4" /> },
  { id: "code", label: "/code", sublabel: "Insert a code block", icon: <Zap className="size-4" /> },
]
