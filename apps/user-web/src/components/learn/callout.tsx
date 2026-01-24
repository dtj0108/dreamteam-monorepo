"use client"

import { cn } from "@/lib/utils"
import { AlertCircle, Info, Lightbulb, AlertTriangle } from "lucide-react"

type CalloutType = "tip" | "info" | "warning" | "note"

interface CalloutProps {
  type?: CalloutType
  title?: string
  children: React.ReactNode
}

const calloutConfig = {
  tip: {
    icon: Lightbulb,
    className: "bg-green-50 border-green-200 text-green-800",
    iconClassName: "text-green-600",
    defaultTitle: "Tip",
  },
  info: {
    icon: Info,
    className: "bg-sky-50 border-sky-200 text-sky-800",
    iconClassName: "text-sky-600",
    defaultTitle: "Info",
  },
  warning: {
    icon: AlertTriangle,
    className: "bg-amber-50 border-amber-200 text-amber-800",
    iconClassName: "text-amber-600",
    defaultTitle: "Warning",
  },
  note: {
    icon: AlertCircle,
    className: "bg-gray-50 border-gray-200 text-gray-800",
    iconClassName: "text-gray-600",
    defaultTitle: "Note",
  },
}

export function Callout({ type = "tip", title, children }: CalloutProps) {
  const config = calloutConfig[type]
  const Icon = config.icon

  return (
    <div className={cn("flex gap-3 rounded-lg border p-4 my-4", config.className)}>
      <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", config.iconClassName)} />
      <div>
        <p className="font-semibold mb-1">{title || config.defaultTitle}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  )
}

