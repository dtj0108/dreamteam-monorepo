"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useAgents } from "@/providers/agents-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Users } from "lucide-react"
import type { AgentWithHireStatus } from "@/lib/types/agents"

// DnD Kit imports
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import {
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable"

// Components
import { DepartmentSection } from "@/components/agents/department-section"
import { AgentDragOverlay } from "@/components/agents/agent-drag-overlay"

export default function HiredAgentsPage() {
  const {
    myAgents,
    planAgents,
    executions,
    schedules,
    departments,
    agentOrganization,
    isLoading,
    fetchActivity,
    fetchSchedules,
    toggleAgent,
    reorderAgents,
    moveAgentToDepartment,
    getAgentsByDepartment,
  } = useAgents()

  const [togglingAgents, setTogglingAgents] = useState<Set<string>>(new Set())
  const [activeAgent, setActiveAgent] = useState<AgentWithHireStatus | null>(null)
  const [dragOverDepartment, setDragOverDepartment] = useState<string | null>(null)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Fetch activity and schedules on mount
  useEffect(() => {
    fetchActivity({ limit: 50 })
    fetchSchedules()
  }, [fetchActivity, fetchSchedules])

  // Get stats for an agent
  const getAgentStats = (agent: AgentWithHireStatus) => {
    const agentExecutions = executions.filter(
      e => e.agent_id === agent.localAgentId || e.agent_id === agent.id
    )
    const agentSchedules = schedules.filter(
      s => s.agent_id === agent.localAgentId || s.agent_id === agent.id
    )
    return {
      conversations: 0,
      completed: agentExecutions.filter(e => e.status === "completed").length,
      scheduled: agentSchedules.length,
    }
  }

  // Handle agent enable/disable toggle
  const handleToggle = async (agent: AgentWithHireStatus, enabled: boolean) => {
    setTogglingAgents(prev => new Set(prev).add(agent.id))
    try {
      await toggleAgent(agent.id, enabled)
    } catch (error) {
      console.error("Failed to toggle agent:", error)
    } finally {
      setTogglingAgents(prev => {
        const next = new Set(prev)
        next.delete(agent.id)
        return next
      })
    }
  }

  // Determine which agents to show - all plan agents if available, otherwise only hired
  const agentsToShow = planAgents.length > 0 ? planAgents : myAgents
  const hasDeployedTeam = planAgents.length > 0

  // Get agents grouped by department
  const agentsByDepartment = useMemo(() => {
    return getAgentsByDepartment()
  }, [getAgentsByDepartment])

  // Get list of departments that have agents or are drag targets
  const activeDepartments = useMemo(() => {
    const deptIds = new Set<string | null>()
    agentsByDepartment.forEach((agents, deptId) => {
      if (agents.length > 0 || deptId === null) {
        deptIds.add(deptId)
      }
    })
    // Add all known departments
    departments.forEach(d => deptIds.add(d.id))
    return Array.from(deptIds)
  }, [agentsByDepartment, departments])

  // Find which department an agent belongs to
  const findAgentDepartment = (agentId: string): string | null => {
    for (const [deptId, agents] of agentsByDepartment) {
      if (agents.some(a => a.id === agentId)) {
        return deptId
      }
    }
    return null
  }

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const agent = agentsToShow.find(a => a.id === active.id)
    if (agent) setActiveAgent(agent)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (!over) {
      setDragOverDepartment(null)
      return
    }

    const overId = over.id as string

    // Check if we're over a department drop zone
    if (overId.startsWith("department-")) {
      const deptId = overId.replace("department-", "")
      setDragOverDepartment(deptId === "general" ? null : deptId)
    } else {
      // We're over another agent - find its department
      const deptId = findAgentDepartment(overId)
      setDragOverDepartment(deptId)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveAgent(null)
    setDragOverDepartment(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const draggedAgent = agentsToShow.find(a => a.id === activeId)
    if (!draggedAgent) return

    // Determine target department
    let targetDepartmentId: string | null = null

    if (overId.startsWith("department-")) {
      const deptId = overId.replace("department-", "")
      targetDepartmentId = deptId === "general" ? null : deptId
    } else {
      // Dropped on another agent - find its department
      targetDepartmentId = findAgentDepartment(overId)
    }

    // Get current department of dragged agent
    const currentDepartmentId = findAgentDepartment(activeId)

    // Check if we need to move to a different department
    if (targetDepartmentId !== currentDepartmentId) {
      try {
        await moveAgentToDepartment(activeId, targetDepartmentId)
      } catch (error) {
        console.error("Failed to move agent:", error)
      }
      return
    }

    // Reorder within same department
    if (!overId.startsWith("department-") && activeId !== overId) {
      const departmentAgents = agentsByDepartment.get(currentDepartmentId) || []
      const oldIndex = departmentAgents.findIndex(a => a.id === activeId)
      const newIndex = departmentAgents.findIndex(a => a.id === overId)

      if (oldIndex !== -1 && newIndex !== -1) {
        // Create new order
        const reorderedAgents = arrayMove(departmentAgents, oldIndex, newIndex)

        // Build full position order (maintaining other departments)
        const newPositionOrder: string[] = []
        agentsByDepartment.forEach((agents, deptId) => {
          if (deptId === currentDepartmentId) {
            reorderedAgents.forEach(a => newPositionOrder.push(a.id))
          } else {
            agents.forEach(a => newPositionOrder.push(a.id))
          }
        })

        try {
          await reorderAgents(newPositionOrder)
        } catch (error) {
          console.error("Failed to reorder agents:", error)
        }
      }
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>
          {/* Skeleton for department sections */}
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border bg-card/50 p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-6" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-8" />
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="rounded-lg border bg-card flex flex-col">
                    <div className="p-4 pb-3">
                      <Skeleton className="size-14 rounded-xl mb-3" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                    <div className="px-4 pb-3 space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="p-4 pt-0">
                      <Skeleton className="h-9 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Agents</h1>
          <p className="text-muted-foreground">
            {hasDeployedTeam
              ? "Agents included in your plan - drag to reorganize, toggle to enable or disable"
              : "Agents you've hired to help with your work"}
          </p>
        </div>
        {!hasDeployedTeam && (
          <Button asChild>
            <Link href="/agents/discover">
              <Plus className="size-4 mr-2" />
              Discover More
            </Link>
          </Button>
        )}
      </div>

      {agentsToShow.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="size-14 rounded-xl bg-muted flex items-center justify-center mb-4">
              <Users className="size-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No agents available</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
              {hasDeployedTeam
                ? "Your plan doesn't include any agents yet. Contact support or upgrade your plan."
                : "Subscribe to a plan to get access to AI agents that can help automate your work."}
            </p>
            <Button asChild>
              <Link href="/billing">View Plans</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-6">
            {/* Render department sections - known departments first */}
            {departments.map((dept) => {
              const deptAgents = agentsByDepartment.get(dept.id) || []
              const isDropTarget = dragOverDepartment === dept.id

              // Only show departments that have agents or are being dragged over
              if (deptAgents.length === 0 && !isDropTarget) return null

              return (
                <DepartmentSection
                  key={dept.id}
                  department={dept}
                  agents={deptAgents}
                  getAgentStats={getAgentStats}
                  togglingAgents={togglingAgents}
                  hasDeployedTeam={hasDeployedTeam}
                  onToggle={handleToggle}
                  isDragOver={isDropTarget}
                />
              )
            })}

            {/* General section (no department) - always show at bottom */}
            {(() => {
              const generalAgents = agentsByDepartment.get(null) || []
              const isDropTarget = dragOverDepartment === null && activeAgent !== null

              // Show if has agents or is being dragged over
              if (generalAgents.length === 0 && !isDropTarget) return null

              return (
                <DepartmentSection
                  department={null}
                  agents={generalAgents}
                  getAgentStats={getAgentStats}
                  togglingAgents={togglingAgents}
                  hasDeployedTeam={hasDeployedTeam}
                  onToggle={handleToggle}
                  isDragOver={isDropTarget}
                />
              )
            })()}
          </div>

          {/* Drag Overlay */}
          <DragOverlay
            dropAnimation={{
              duration: 300,
              easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
            }}
          >
            {activeAgent ? <AgentDragOverlay agent={activeAgent} /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
