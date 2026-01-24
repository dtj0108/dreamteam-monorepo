"use client"

import { cn } from "@/lib/utils"

export type PresenceStatus = "online" | "away" | "dnd" | "offline"

interface MemberPresenceProps {
  status: PresenceStatus
  className?: string
  showLabel?: boolean
}

const statusConfig: Record<PresenceStatus, { color: string; label: string }> = {
  online: { color: "bg-emerald-500", label: "Online" },
  away: { color: "bg-amber-500", label: "Away" },
  dnd: { color: "bg-red-500", label: "Do not disturb" },
  offline: { color: "bg-gray-400", label: "Offline" },
}

export function MemberPresence({ status, className, showLabel = false }: MemberPresenceProps) {
  const config = statusConfig[status]
  
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "size-2.5 rounded-full ring-2 ring-background",
          config.color
        )}
      />
      {showLabel && (
        <span className="text-xs text-muted-foreground">{config.label}</span>
      )}
    </div>
  )
}

