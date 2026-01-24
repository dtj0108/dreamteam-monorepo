"use client"

import { useState, useMemo, useCallback } from "react"
import { useAutoScroll } from "@/hooks/use-auto-scroll"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  GripVertical,
  MoreHorizontal,
  Trash2,
  MoveRight,
  ArrowDown,
  Briefcase,
  Building,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Simplified pipeline type (compatible with filter bar)
interface LeadPipelineStage {
  id: string
  name: string
  color: string | null
  position: number
  is_won: boolean
  is_lost: boolean
}

interface LeadPipeline {
  id: string
  name: string
  is_default?: boolean
  stages?: LeadPipelineStage[]
}

// @dnd-kit imports
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  defaultAnimateLayoutChanges,
  type AnimateLayoutChanges,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

// Opportunity type for Kanban (flattened with lead info)
export interface KanbanOpportunity {
  id: string
  name: string
  value: number | null
  probability: number
  status: string
  value_type: string
  expected_close_date: string | null
  lead_id: string
  lead_name: string
  stage_id: string | null
  contact?: { id: string; first_name: string | null; last_name: string | null } | null
  user?: { id: string; full_name: string | null; email: string | null } | null
}

// Custom animation config
const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true })

// Format currency value
function formatCompactValue(value: number | null, valueType: string): string {
  if (value === null) return "-"

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(valueType === "recurring" ? value * 12 : value)

  return valueType === "recurring" ? `${formatted}/yr` : formatted
}

// Format short date
function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

// Sortable Opportunity Card
interface SortableOpportunityCardProps {
  opportunity: KanbanOpportunity
  stages: LeadPipelineStage[]
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
  onMoveToStage: (stageId: string) => void
  isDragging?: boolean
}

function SortableOpportunityCard({
  opportunity,
  stages,
  onClick,
  onDelete,
  onMoveToStage,
  isDragging,
}: SortableOpportunityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: opportunity.id,
    animateLayoutChanges,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isActuallyDragging = isDragging || isSortableDragging
  const isOverdue =
    opportunity.expected_close_date &&
    opportunity.status === "active" &&
    new Date(opportunity.expected_close_date) < new Date()

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group rounded-xl p-4",
        "bg-white/80 dark:bg-white/[0.08] backdrop-blur-md",
        "border border-white/60 dark:border-white/10",
        "shadow-lg shadow-black/[0.03] dark:shadow-black/20",
        "hover:shadow-xl hover:shadow-black/[0.08] dark:hover:shadow-black/30",
        "hover:bg-white/95 dark:hover:bg-white/[0.12]",
        "transition-all duration-200 ease-out",
        "cursor-pointer",
        isActuallyDragging && "opacity-50 scale-[0.98] rotate-1"
      )}
      onClick={onClick}
    >
      {/* Quick Actions */}
      <div
        className={cn(
          "absolute -top-2 -right-2 flex gap-1",
          "opacity-0 group-hover:opacity-100 transition-all duration-200",
          "translate-y-1 group-hover:translate-y-0"
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 rounded-lg shadow-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <MoveRight className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {stages
              .filter((s) => s.id !== opportunity.stage_id)
              .map((stage) => (
                <DropdownMenuItem
                  key={stage.id}
                  onClick={() => onMoveToStage(stage.id)}
                >
                  <div
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: stage.color || "#6b7280" }}
                  />
                  Move to {stage.name}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7 rounded-lg shadow-md bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute top-3 left-1.5 p-1 rounded cursor-grab active:cursor-grabbing",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "hover:bg-slate-100 dark:hover:bg-slate-800"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="space-y-2 pl-4">
        {/* Opportunity Name */}
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium leading-tight text-slate-900 dark:text-slate-100">
            {opportunity.name}
          </p>
        </div>

        {/* Lead Name Badge */}
        <Link
          href={`/sales/leads/${opportunity.lead_id}`}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Building className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium text-sky-600 dark:text-sky-400">
            {opportunity.lead_name}
          </span>
        </Link>

        {/* Value · Probability · Date */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {formatCompactValue(opportunity.value, opportunity.value_type)}
          </span>
          <span className="text-slate-400">·</span>
          <span>{opportunity.probability}%</span>
          {opportunity.expected_close_date && (
            <>
              <span className="text-slate-400">·</span>
              <span
                className={cn(
                  "flex items-center gap-1",
                  isOverdue && "text-red-500 font-medium"
                )}
              >
                <Calendar className="h-3 w-3" />
                {formatShortDate(opportunity.expected_close_date)}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Drag Overlay Card
function DragOverlayCard({ opportunity }: { opportunity: KanbanOpportunity }) {
  return (
    <div
      className={cn(
        "rounded-xl p-4 w-72",
        "bg-white dark:bg-slate-900 backdrop-blur-md",
        "border border-white/60 dark:border-white/10",
        "shadow-2xl shadow-black/20",
        "rotate-3 scale-105",
        "cursor-grabbing"
      )}
    >
      <div className="space-y-2 pl-4">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium leading-tight">{opportunity.name}</p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-800/50">
          <Building className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium text-sky-600 dark:text-sky-400">
            {opportunity.lead_name}
          </span>
        </div>
      </div>
    </div>
  )
}

// Empty Column State
function EmptyColumnState({ onAddOpportunity }: { onAddOpportunity: () => void }) {
  return (
    <div
      className={cn(
        "flex-1 flex flex-col items-center justify-center",
        "border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl",
        "m-2 py-8 px-4",
        "transition-colors hover:border-slate-300 dark:hover:border-slate-600",
        "hover:bg-slate-50/50 dark:hover:bg-slate-800/30",
        "cursor-pointer"
      )}
      onClick={onAddOpportunity}
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
        <Plus className="h-5 w-5 text-slate-400" />
      </div>
      <p className="text-sm text-muted-foreground text-center">Drop opportunities here</p>
      <p className="text-xs text-muted-foreground/60 mt-1">or click to add</p>
    </div>
  )
}

// Drop Placeholder
function DropPlaceholder() {
  return (
    <div
      className={cn(
        "h-24 rounded-xl",
        "border-2 border-dashed border-blue-400 dark:border-blue-500",
        "bg-gradient-to-br from-blue-50/80 to-indigo-50/80",
        "dark:from-blue-900/30 dark:to-indigo-900/30",
        "flex items-center justify-center gap-2",
        "animate-pulse"
      )}
    >
      <ArrowDown className="h-4 w-4 text-blue-500 animate-bounce" />
      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
        Drop here
      </span>
    </div>
  )
}

// Kanban Column
interface KanbanColumnProps {
  stage: LeadPipelineStage
  stages: LeadPipelineStage[]
  opportunities: KanbanOpportunity[]
  onOpportunityClick: (opportunity: KanbanOpportunity) => void
  onAddOpportunity: (stageId: string) => void
  onDeleteOpportunity: (opportunityId: string) => void
  onMoveOpportunity: (opportunityId: string, stageId: string) => void
  isDragOver: boolean
  showPlaceholder: boolean
  stageValue: string
}

function KanbanColumn({
  stage,
  stages,
  opportunities,
  onOpportunityClick,
  onAddOpportunity,
  onDeleteOpportunity,
  onMoveOpportunity,
  isDragOver,
  showPlaceholder,
  stageValue,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const isDropTarget = isDragOver || isOver
  const stageColor = stage.color || "#6b7280"

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-80 h-full shrink-0 rounded-2xl",
        "bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl",
        "border border-white/50 dark:border-white/[0.08]",
        "shadow-xl shadow-black/[0.03] dark:shadow-black/30",
        "transition-all duration-300 ease-out",
        isDropTarget &&
          cn(
            "ring-2 ring-blue-400 ring-offset-2 ring-offset-background",
            "bg-gradient-to-b from-blue-50/80 to-blue-100/50",
            "dark:from-blue-900/30 dark:to-blue-800/20",
            "scale-[1.02] shadow-2xl shadow-blue-500/20",
            "border-blue-300 dark:border-blue-600"
          )
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          "flex items-center justify-between p-4 border-b border-slate-200/50 dark:border-white/5",
          isDropTarget && "bg-blue-50/50 dark:bg-blue-900/20"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="w-3 h-3 rounded-full shadow-lg"
              style={{ backgroundColor: stageColor }}
            />
            {isDropTarget && (
              <div
                className="absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-75"
                style={{ backgroundColor: stageColor }}
              />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">
              {stage.name}
            </h3>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="text-[10px] font-semibold h-4 min-w-[16px] justify-center px-1"
              >
                {opportunities.length}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-medium">
                {stageValue}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onAddOpportunity(stage.id)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAddOpportunity(stage.id)}>
                <Plus className="mr-2 h-4 w-4" />
                Add opportunity
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Opportunities Container */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3 min-h-[200px]">
          <SortableContext
            items={opportunities.map((o) => o.id)}
            strategy={verticalListSortingStrategy}
          >
            {showPlaceholder && <DropPlaceholder />}

            {opportunities.length > 0 ? (
              opportunities.map((opportunity) => (
                <SortableOpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  stages={stages}
                  onClick={() => onOpportunityClick(opportunity)}
                  onDelete={(e) => {
                    e.stopPropagation()
                    onDeleteOpportunity(opportunity.id)
                  }}
                  onMoveToStage={(stageId) => onMoveOpportunity(opportunity.id, stageId)}
                />
              ))
            ) : !showPlaceholder ? (
              <EmptyColumnState onAddOpportunity={() => onAddOpportunity(stage.id)} />
            ) : null}
          </SortableContext>
        </div>
      </ScrollArea>

      {/* Add Opportunity Footer */}
      <div className="p-2 border-t border-slate-200/50 dark:border-white/5">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => onAddOpportunity(stage.id)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add opportunity
        </Button>
      </div>
    </div>
  )
}

// Props for the main component
interface OpportunitiesKanbanBoardProps {
  pipeline: LeadPipeline | null
  opportunities: KanbanOpportunity[]
  onOpportunityClick: (opportunity: KanbanOpportunity) => void
  onAddOpportunity: (stageId: string) => void
  onDeleteOpportunity: (opportunityId: string) => void
  onMoveOpportunity: (opportunityId: string, stageId: string) => Promise<void>
  valueDisplay?: "annualized" | "weighted" | "actual"
}

// Main Opportunities Kanban Board
export function OpportunitiesKanbanBoard({
  pipeline,
  opportunities,
  onOpportunityClick,
  onAddOpportunity,
  onDeleteOpportunity,
  onMoveOpportunity,
  valueDisplay = "annualized",
}: OpportunitiesKanbanBoardProps) {
  const [activeOpportunity, setActiveOpportunity] = useState<KanbanOpportunity | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)

  // Auto-scroll when dragging near edges
  const { scrollContainerRef, handleDragMove, stopAutoScroll } = useAutoScroll({
    threshold: 100,
    maxSpeed: 15,
  })

  const stages = pipeline?.stages || []

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Group opportunities by stage
  const opportunitiesByStage = useMemo(() => {
    const grouped: Record<string, KanbanOpportunity[]> = {}
    stages.forEach((stage) => {
      grouped[stage.id] = []
    })
    opportunities.forEach((opp) => {
      if (opp.stage_id && grouped[opp.stage_id]) {
        grouped[opp.stage_id].push(opp)
      }
    })
    return grouped
  }, [opportunities, stages])

  // Calculate stage values
  const stageValues = useMemo(() => {
    const values: Record<string, string> = {}
    stages.forEach((stage) => {
      const stageOpps = opportunitiesByStage[stage.id] || []
      let total = 0
      stageOpps.forEach((opp) => {
        if (opp.status === "active") {
          const value = opp.value || 0
          const annualized = opp.value_type === "recurring" ? value * 12 : value
          if (valueDisplay === "weighted") {
            total += annualized * (opp.probability / 100)
          } else {
            total += annualized
          }
        }
      })
      values[stage.id] = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        notation: "compact",
      }).format(total)
    })
    return values
  }, [opportunitiesByStage, stages, valueDisplay])

  // Find stage by opportunity ID
  const findStageByOpportunityId = useCallback(
    (opportunityId: string): string | null => {
      for (const [stageId, stageOpps] of Object.entries(opportunitiesByStage)) {
        if (stageOpps.some((o) => o.id === opportunityId)) return stageId
      }
      return null
    },
    [opportunitiesByStage]
  )

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const opp = opportunities.find((o) => o.id === event.active.id)
    if (opp) setActiveOpportunity(opp)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (!over) {
      setDragOverStage(null)
      return
    }

    const overId = over.id as string
    const overStage = stages.find((s) => s.id === overId)
    if (overStage) {
      setDragOverStage(overStage.id)
    } else {
      const oppStage = findStageByOpportunityId(overId)
      if (oppStage) setDragOverStage(oppStage)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    stopAutoScroll() // Stop any auto-scrolling
    const { active, over } = event
    setActiveOpportunity(null)
    setDragOverStage(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    const activeOppData = opportunities.find((o) => o.id === activeId)
    if (!activeOppData) return

    // Determine target stage
    let targetStageId: string | null = null
    const targetStage = stages.find((s) => s.id === overId)
    if (targetStage) {
      targetStageId = targetStage.id
    } else {
      targetStageId = findStageByOpportunityId(overId)
    }

    if (targetStageId && targetStageId !== activeOppData.stage_id) {
      await onMoveOpportunity(activeId, targetStageId)
    }
  }

  if (!pipeline || stages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p>No pipeline configured</p>
          <p className="text-sm">Create a pipeline to get started</p>
        </div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={scrollContainerRef}
        className="flex gap-5 pb-4 px-1 h-full overflow-x-auto overflow-y-hidden"
      >
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            stages={stages}
            opportunities={opportunitiesByStage[stage.id] || []}
            onOpportunityClick={onOpportunityClick}
            onAddOpportunity={onAddOpportunity}
            onDeleteOpportunity={onDeleteOpportunity}
            onMoveOpportunity={onMoveOpportunity}
            isDragOver={dragOverStage === stage.id}
            showPlaceholder={
              dragOverStage === stage.id && activeOpportunity?.stage_id !== stage.id
            }
            stageValue={stageValues[stage.id] || "$0"}
          />
        ))}
      </div>

      <DragOverlay
        dropAnimation={{
          duration: 300,
          easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
        }}
      >
        {activeOpportunity ? <DragOverlayCard opportunity={activeOpportunity} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
