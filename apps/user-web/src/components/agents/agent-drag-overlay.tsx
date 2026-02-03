"use client"

import { cn } from "@/lib/utils"
import type { AgentWithHireStatus } from "@/lib/types/agents"

interface AgentDragOverlayProps {
  agent: AgentWithHireStatus
}

export function AgentDragOverlay({ agent }: AgentDragOverlayProps) {
  return (
    <div
      className={cn(
        "w-64 rounded-lg p-4",
        "bg-white dark:bg-slate-900 backdrop-blur-md",
        "border border-white/60 dark:border-white/10",
        "shadow-2xl shadow-black/20",
        "rotate-3 scale-105",
        "cursor-grabbing"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
          {agent.avatar_url || "✨"}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{agent.name}</h3>
          {agent.department && (
            <p className="text-xs text-muted-foreground truncate">
              {agent.department.icon} {agent.department.name}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
