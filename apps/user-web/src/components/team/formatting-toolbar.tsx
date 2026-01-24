"use client"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link,
  List,
  ListOrdered,
  Quote,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type FormatType =
  | "bold"
  | "italic"
  | "strikethrough"
  | "code"
  | "link"
  | "bullet-list"
  | "ordered-list"
  | "blockquote"

interface FormattingToolbarProps {
  onFormat: (format: FormatType) => void
  disabled?: boolean
  className?: string
}

const formatButtons: {
  format: FormatType
  icon: React.ComponentType<{ className?: string }>
  label: string
  shortcut?: string
}[] = [
  { format: "bold", icon: Bold, label: "Bold", shortcut: "⌘B" },
  { format: "italic", icon: Italic, label: "Italic", shortcut: "⌘I" },
  { format: "strikethrough", icon: Strikethrough, label: "Strikethrough", shortcut: "⌘⇧X" },
  { format: "code", icon: Code, label: "Code", shortcut: "⌘E" },
  { format: "link", icon: Link, label: "Link", shortcut: "⌘K" },
]

const listButtons: {
  format: FormatType
  icon: React.ComponentType<{ className?: string }>
  label: string
}[] = [
  { format: "bullet-list", icon: List, label: "Bulleted list" },
  { format: "ordered-list", icon: ListOrdered, label: "Numbered list" },
  { format: "blockquote", icon: Quote, label: "Quote" },
]

export function FormattingToolbar({ onFormat, disabled, className }: FormattingToolbarProps) {
  return (
    <div className={cn("flex items-center gap-0.5 py-1 px-2", className)}>
      <TooltipProvider delayDuration={300}>
        {/* Text formatting buttons */}
        {formatButtons.map(({ format, icon: Icon, label, shortcut }) => (
          <Tooltip key={format}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => onFormat(format)}
                disabled={disabled}
              >
                <Icon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {label}
              {shortcut && <span className="ml-2 text-muted-foreground">{shortcut}</span>}
            </TooltipContent>
          </Tooltip>
        ))}

        <Separator orientation="vertical" className="!h-4 mx-1" />

        {/* List formatting buttons */}
        {listButtons.map(({ format, icon: Icon, label }) => (
          <Tooltip key={format}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => onFormat(format)}
                disabled={disabled}
              >
                <Icon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {label}
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  )
}

// Helper to get markdown syntax for each format type
export function getFormatSyntax(format: FormatType): { prefix: string; suffix: string; placeholder: string } {
  switch (format) {
    case "bold":
      return { prefix: "**", suffix: "**", placeholder: "bold text" }
    case "italic":
      return { prefix: "_", suffix: "_", placeholder: "italic text" }
    case "strikethrough":
      return { prefix: "~~", suffix: "~~", placeholder: "strikethrough text" }
    case "code":
      return { prefix: "`", suffix: "`", placeholder: "code" }
    case "link":
      return { prefix: "[", suffix: "](url)", placeholder: "link text" }
    case "bullet-list":
      return { prefix: "- ", suffix: "", placeholder: "list item" }
    case "ordered-list":
      return { prefix: "1. ", suffix: "", placeholder: "list item" }
    case "blockquote":
      return { prefix: "> ", suffix: "", placeholder: "quote" }
  }
}
