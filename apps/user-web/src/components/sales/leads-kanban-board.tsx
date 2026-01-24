"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
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
  Building,
  Users,
  Globe,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { LeadPipeline, LeadPipelineStage } from "@/types/customization"

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

// Lead type for Kanban
interface KanbanLead {
  id: string
  name: string
  website?: string
  industry?: string
  pipeline_id?: string
  stage_id?: string
  contactCount: number
  created_at: string
  stage?: {
    id: string
    name: string
    color: string | null
  }
}

// Custom animation config
const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true })

// Sortable Lead Card
interface SortableLeadCardProps {
  lead: KanbanLead
  stages: LeadPipelineStage[]
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
  onMoveToStage: (stageId: string) => void
  isDragging?: boolean
}

function SortableLeadCard({
  lead,
  stages,
  onClick,
  onDelete,
  onMoveToStage,
  isDragging,
}: SortableLeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: lead.id,
    animateLayoutChanges,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isActuallyDragging = isDragging || isSortableDragging

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
              .filter((s) => s.id !== lead.stage_id)
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
        {/* Lead Name */}
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium leading-tight text-slate-900 dark:text-slate-100">
            {lead.name}
          </p>
        </div>

        {/* Industry & Contacts */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {lead.industry && (
            <Badge variant="secondary" className="text-[10px] font-medium">
              {lead.industry}
            </Badge>
          )}
          {lead.contactCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-800/50">
              <Users className="h-3 w-3" />
              <span className="text-[11px] font-medium">
                {lead.contactCount}
              </span>
            </div>
          )}
        </div>

        {/* Website */}
        {lead.website && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe className="h-3 w-3" />
            <span className="truncate max-w-[150px]">
              {lead.website.replace(/^https?:\/\//, "")}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Drag Overlay Card
function DragOverlayCard({ lead }: { lead: KanbanLead }) {
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
          <Building className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium leading-tight">{lead.name}</p>
        </div>
        {lead.industry && (
          <Badge variant="secondary" className="text-[10px] font-medium">
            {lead.industry}
          </Badge>
        )}
      </div>
    </div>
  )
}

// Empty Column State
function EmptyColumnState({ onAddLead }: { onAddLead: () => void }) {
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
      onClick={onAddLead}
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
        <Plus className="h-5 w-5 text-slate-400" />
      </div>
      <p className="text-sm text-muted-foreground text-center">Drop leads here</p>
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
  leads: KanbanLead[]
  onLeadClick: (lead: KanbanLead) => void
  onAddLead: (stageId: string) => void
  onDeleteLead: (leadId: string) => void
  onMoveLead: (leadId: string, stageId: string) => void
  isDragOver: boolean
  showPlaceholder: boolean
}

function KanbanColumn({
  stage,
  stages,
  leads,
  onLeadClick,
  onAddLead,
  onDeleteLead,
  onMoveLead,
  isDragOver,
  showPlaceholder,
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
            <Badge
              variant="secondary"
              className="text-[10px] font-semibold h-4 min-w-[16px] justify-center px-1"
            >
              {leads.length}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onAddLead(stage.id)}
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
              <DropdownMenuItem onClick={() => onAddLead(stage.id)}>
                <Plus className="mr-2 h-4 w-4" />
                Add lead
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Leads Container */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3 min-h-[200px]">
          <SortableContext
            items={leads.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            {showPlaceholder && <DropPlaceholder />}

            {leads.length > 0 ? (
              leads.map((lead) => (
                <SortableLeadCard
                  key={lead.id}
                  lead={lead}
                  stages={stages}
                  onClick={() => onLeadClick(lead)}
                  onDelete={(e) => {
                    e.stopPropagation()
                    onDeleteLead(lead.id)
                  }}
                  onMoveToStage={(stageId) => onMoveLead(lead.id, stageId)}
                />
              ))
            ) : !showPlaceholder ? (
              <EmptyColumnState onAddLead={() => onAddLead(stage.id)} />
            ) : null}
          </SortableContext>
        </div>
      </ScrollArea>

      {/* Add Lead Footer */}
      <div className="p-2 border-t border-slate-200/50 dark:border-white/5">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => onAddLead(stage.id)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add lead
        </Button>
      </div>
    </div>
  )
}

// Props for the main component
interface LeadsKanbanBoardProps {
  pipeline: LeadPipeline | null
  leads: KanbanLead[]
  onLeadClick: (lead: KanbanLead) => void
  onAddLead: (stageId: string) => void
  onDeleteLead: (leadId: string) => void
  onMoveLead: (leadId: string, stageId: string) => Promise<void>
}

// Main Leads Kanban Board
export function LeadsKanbanBoard({
  pipeline,
  leads,
  onLeadClick,
  onAddLead,
  onDeleteLead,
  onMoveLead,
}: LeadsKanbanBoardProps) {
  const [activeLead, setActiveLead] = useState<KanbanLead | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)

  const stages = pipeline?.stages || []

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Group leads by stage
  const leadsByStage = useMemo(() => {
    const grouped: Record<string, KanbanLead[]> = {}
    stages.forEach((stage) => {
      grouped[stage.id] = []
    })
    leads.forEach((lead) => {
      if (lead.stage_id && grouped[lead.stage_id]) {
        grouped[lead.stage_id].push(lead)
      }
    })
    return grouped
  }, [leads, stages])

  // Find stage by lead ID
  const findStageByLeadId = useCallback(
    (leadId: string): string | null => {
      for (const [stageId, stageLeads] of Object.entries(leadsByStage)) {
        if (stageLeads.some((l) => l.id === leadId)) return stageId
      }
      return null
    },
    [leadsByStage]
  )

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id)
    if (lead) setActiveLead(lead)
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
      const leadStage = findStageByLeadId(overId)
      if (leadStage) setDragOverStage(leadStage)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveLead(null)
    setDragOverStage(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    const activeLeadData = leads.find((l) => l.id === activeId)
    if (!activeLeadData) return

    // Determine target stage
    let targetStageId: string | null = null
    const targetStage = stages.find((s) => s.id === overId)
    if (targetStage) {
      targetStageId = targetStage.id
    } else {
      targetStageId = findStageByLeadId(overId)
    }

    if (targetStageId && targetStageId !== activeLeadData.stage_id) {
      await onMoveLead(activeId, targetStageId)
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
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-5 pb-4 px-1 h-full overflow-x-auto overflow-y-hidden">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            stages={stages}
            leads={leadsByStage[stage.id] || []}
            onLeadClick={onLeadClick}
            onAddLead={onAddLead}
            onDeleteLead={onDeleteLead}
            onMoveLead={onMoveLead}
            isDragOver={dragOverStage === stage.id}
            showPlaceholder={
              dragOverStage === stage.id && activeLead?.stage_id !== stage.id
            }
          />
        ))}
      </div>

      <DragOverlay
        dropAnimation={{
          duration: 300,
          easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
        }}
      >
        {activeLead ? <DragOverlayCard lead={activeLead} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
