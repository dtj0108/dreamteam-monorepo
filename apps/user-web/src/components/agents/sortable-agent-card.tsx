"use client"

import Link from "next/link"
import { useSortable, defaultAnimateLayoutChanges, type AnimateLayoutChanges } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  MessageSquare,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Settings,
  GripVertical,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AgentToolBadges } from "@/components/agents/agent-tool-badges"
import type { AgentWithHireStatus } from "@/lib/types/agents"

// Custom animation config for smooth card transitions
const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true })

interface SortableAgentCardProps {
  agent: AgentWithHireStatus
  stats: {
    conversations: number
    completed: number
    scheduled: number
  }
  isToggling: boolean
  hasDeployedTeam: boolean
  onToggle: (agent: AgentWithHireStatus, enabled: boolean) => void
}

export function SortableAgentCard({
  agent,
  stats,
  isToggling,
  hasDeployedTeam,
  onToggle,
}: SortableAgentCardProps) {
  const isEnabled = agent.isHired

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: agent.id,
    animateLayoutChanges,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group rounded-lg border bg-card transition-all flex flex-col",
        isEnabled ? "hover:shadow-md" : "opacity-60",
        isDragging && "opacity-50 scale-[0.98] shadow-xl z-50"
      )}
    >
      {/* Drag Handle - appears on hover */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute -left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg cursor-grab active:cursor-grabbing",
          "opacity-0 group-hover:opacity-100 transition-all duration-200",
          "bg-white dark:bg-slate-800 border shadow-sm",
          "hover:bg-slate-50 dark:hover:bg-slate-700",
          "-translate-x-1 group-hover:translate-x-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Header with avatar and toggle */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="size-14 rounded-xl bg-muted flex items-center justify-center text-2xl mb-3">
            {agent.avatar_url || "✨"}
          </div>
          {hasDeployedTeam && (
            <Switch
              checked={isEnabled}
              disabled={isToggling}
              onCheckedChange={(checked) => onToggle(agent, checked)}
              aria-label={`${isEnabled ? "Disable" : "Enable"} ${agent.name}`}
            />
          )}
        </div>
        <h3 className="font-semibold truncate">{agent.name}</h3>
        {!isEnabled && (
          <span className="text-xs text-muted-foreground">Disabled</span>
        )}
      </div>

      {/* Stats */}
      <div className="px-4 pb-3 space-y-1.5 text-sm text-muted-foreground flex-1">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4" />
          <span>{stats.conversations} conversations</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4" />
          <span>{stats.completed} tasks completed</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="size-4" />
          <span>{stats.scheduled} scheduled</span>
        </div>
      </div>

      {/* Tool badges */}
      {agent.tools && agent.tools.length > 0 && (
        <div className="px-4 pb-2">
          <AgentToolBadges tools={agent.tools} maxVisible={3} />
        </div>
      )}

      {/* Action buttons */}
      <div className="p-4 pt-0 flex gap-2">
        <Button
          asChild
          variant="secondary"
          className="flex-1"
          disabled={!isEnabled}
        >
          <Link href={`/agents/${agent.localAgentId || agent.id}`}>
            Meet Agent
            <ArrowRight className="size-4 ml-2" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="icon">
          <Link href={`/agents/configure/${agent.localAgentId || agent.id}`}>
            <Settings className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
