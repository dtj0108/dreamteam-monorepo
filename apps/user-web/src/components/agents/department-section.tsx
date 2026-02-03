"use client"

import { useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { SortableAgentCard } from "./sortable-agent-card"
import type { AgentWithHireStatus, AgentDepartment } from "@/lib/types/agents"

interface DepartmentSectionProps {
  department: AgentDepartment | null // null = "General" section
  agents: AgentWithHireStatus[]
  getAgentStats: (agent: AgentWithHireStatus) => {
    conversations: number
    completed: number
    scheduled: number
  }
  togglingAgents: Set<string>
  hasDeployedTeam: boolean
  onToggle: (agent: AgentWithHireStatus, enabled: boolean) => void
  isDragOver: boolean
}

export function DepartmentSection({
  department,
  agents,
  getAgentStats,
  togglingAgents,
  hasDeployedTeam,
  onToggle,
  isDragOver,
}: DepartmentSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const departmentId = department?.id ?? "general"
  const departmentName = department?.name ?? "General"
  const departmentIcon = department?.icon ?? "📁"

  // Set up droppable zone for this department
  const { setNodeRef, isOver } = useDroppable({
    id: `department-${departmentId}`,
    data: {
      type: "department",
      departmentId: department?.id ?? null,
    },
  })

  const isDropTarget = isDragOver || isOver

  // Don't render empty sections (except General which may need to show drop zone)
  if (agents.length === 0 && !isDropTarget && department !== null) {
    return null
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border bg-card/50 backdrop-blur-sm transition-all duration-200",
        isDropTarget && [
          "ring-2 ring-blue-400 ring-offset-2 ring-offset-background",
          "bg-gradient-to-b from-blue-50/50 to-blue-100/30",
          "dark:from-blue-900/20 dark:to-blue-800/10",
          "border-blue-300 dark:border-blue-600",
        ]
      )}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <Button
          variant="ghost"
          className="flex items-center gap-3 p-0 h-auto hover:bg-transparent"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
          <span className="text-xl">{departmentIcon}</span>
          <h2 className="font-semibold text-lg">{departmentName}</h2>
          <Badge variant="secondary" className="ml-2">
            {agents.length}
          </Badge>
        </Button>

        {isDropTarget && (
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 animate-pulse">
            <span>Drop here</span>
          </div>
        )}
      </div>

      {/* Agents Grid */}
      {!isCollapsed && (
        <div className="p-4">
          {agents.length > 0 ? (
            <SortableContext
              items={agents.map(a => a.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {agents.map((agent) => (
                  <SortableAgentCard
                    key={agent.id}
                    agent={agent}
                    stats={getAgentStats(agent)}
                    isToggling={togglingAgents.has(agent.id)}
                    hasDeployedTeam={hasDeployedTeam}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            </SortableContext>
          ) : (
            <div
              className={cn(
                "flex flex-col items-center justify-center py-8 rounded-lg border-2 border-dashed",
                isDropTarget
                  ? "border-blue-400 bg-blue-50/50 dark:bg-blue-900/20"
                  : "border-border/50"
              )}
            >
              <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Users className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {isDropTarget ? "Drop agents here" : "No agents in this department"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
