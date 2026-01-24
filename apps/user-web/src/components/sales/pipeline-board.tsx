"use client"

import { useState, useMemo, useEffect } from "react"
import { useSales, type Deal, type PipelineStage } from "@/providers/sales-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  GripVertical,
  Calendar,
  MoreHorizontal,
  Trash2,
  MoveRight,
  ArrowDown,
  DollarSign,
  Percent,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CreateDealDialog } from "./create-deal-dialog"
import { DealDetailSheet } from "./deal-detail-sheet"

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

// Custom animation config
const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true })

// Format currency
function formatCurrency(value: number | null, currency = "USD"): string {
  if (value === null) return "-"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Sortable Deal Card
interface SortableDealCardProps {
  deal: Deal
  stages: PipelineStage[]
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
  onMoveToStage: (stageId: string) => void
  isDragging?: boolean
}

function SortableDealCard({
  deal,
  stages,
  onClick,
  onDelete,
  onMoveToStage,
  isDragging
}: SortableDealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: deal.id,
    animateLayoutChanges,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isActuallyDragging = isDragging || isSortableDragging
  const contactName = deal.contact
    ? `${deal.contact.first_name} ${deal.contact.last_name || ""}`.trim()
    : null

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
        isActuallyDragging && "opacity-50 scale-[0.98] rotate-1",
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
      )}
      onClick={onClick}
    >
      {/* Quick Actions */}
      <div className={cn(
        "absolute -top-2 -right-2 flex gap-1",
        "opacity-0 group-hover:opacity-100 transition-all duration-200",
        "translate-y-1 group-hover:translate-y-0"
      )}>
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
            {stages.filter(s => s.id !== deal.stage_id).map((stage) => (
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

      <div className="space-y-3 pl-4">
        {/* Deal Name */}
        <p className="text-sm font-medium leading-tight text-slate-900 dark:text-slate-100">
          {deal.name}
        </p>

        {/* Value */}
        {deal.value !== null && (
          <div className="flex items-center gap-1.5 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
            <DollarSign className="h-4 w-4" />
            {formatCurrency(deal.value, deal.currency).replace("$", "")}
          </div>
        )}

        {/* Contact & Probability */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {contactName && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-800/50">
              {deal.contact?.avatar_url ? (
                <Avatar className="h-4 w-4">
                  <AvatarImage src={deal.contact.avatar_url} />
                  <AvatarFallback className="text-[8px]">
                    {contactName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <User className="h-3 w-3" />
              )}
              <span className="text-[11px] font-medium truncate max-w-[100px]">
                {contactName}
              </span>
            </div>
          )}

          {deal.probability !== null && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Percent className="h-3 w-3" />
              <span className="text-[11px] font-medium">{deal.probability}%</span>
            </div>
          )}
        </div>

        {/* Expected Close Date */}
        {deal.expected_close_date && (
          <div className={cn(
            "flex items-center gap-1.5 text-xs",
            new Date(deal.expected_close_date) < new Date()
              ? "text-red-500"
              : "text-muted-foreground"
          )}>
            <Calendar className="h-3 w-3" />
            <span>
              {new Date(deal.expected_close_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Drag Overlay Card
function DragOverlayCard({ deal }: { deal: Deal }) {
  return (
    <div className={cn(
      "rounded-xl p-4 w-72",
      "bg-white dark:bg-slate-900 backdrop-blur-md",
      "border border-white/60 dark:border-white/10",
      "shadow-2xl shadow-black/20",
      "rotate-3 scale-105",
      "cursor-grabbing"
    )}>
      <div className="space-y-2 pl-4">
        <p className="text-sm font-medium leading-tight">{deal.name}</p>
        {deal.value !== null && (
          <div className="text-lg font-semibold text-emerald-600">
            {formatCurrency(deal.value, deal.currency)}
          </div>
        )}
      </div>
    </div>
  )
}

// Empty Column State
function EmptyColumnState({ onAddDeal }: { onAddDeal: () => void }) {
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
      onClick={onAddDeal}
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
        <Plus className="h-5 w-5 text-slate-400" />
      </div>
      <p className="text-sm text-muted-foreground text-center">
        Drop deals here
      </p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        or click to add
      </p>
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

// Pipeline Column
interface PipelineColumnProps {
  stage: PipelineStage
  stages: PipelineStage[]
  deals: Deal[]
  totalValue: number
  onDealClick: (deal: Deal) => void
  onAddDeal: (stageId: string) => void
  onDeleteDeal: (dealId: string) => void
  onMoveDeal: (dealId: string, stageId: string) => void
  isDragOver: boolean
  showPlaceholder: boolean
}

function PipelineColumn({
  stage,
  stages,
  deals,
  totalValue,
  onDealClick,
  onAddDeal,
  onDeleteDeal,
  onMoveDeal,
  isDragOver,
  showPlaceholder,
}: PipelineColumnProps) {
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
        isDropTarget && cn(
          "ring-2 ring-blue-400 ring-offset-2 ring-offset-background",
          "bg-gradient-to-b from-blue-50/80 to-blue-100/50",
          "dark:from-blue-900/30 dark:to-blue-800/20",
          "scale-[1.02] shadow-2xl shadow-blue-500/20",
          "border-blue-300 dark:border-blue-600"
        )
      )}
    >
      {/* Column Header */}
      <div className={cn(
        "flex items-center justify-between p-4 border-b border-slate-200/50 dark:border-white/5",
        isDropTarget && "bg-blue-50/50 dark:bg-blue-900/20"
      )}>
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge
                variant="secondary"
                className="text-[10px] font-semibold h-4 min-w-[16px] justify-center px-1"
              >
                {deals.length}
              </Badge>
              {totalValue > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {formatCurrency(totalValue)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onAddDeal(stage.id)}
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
              <DropdownMenuItem onClick={() => onAddDeal(stage.id)}>
                <Plus className="mr-2 h-4 w-4" />
                Add deal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Deals Container */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3 min-h-[200px]">
          <SortableContext
            items={deals.map(d => d.id)}
            strategy={verticalListSortingStrategy}
          >
            {showPlaceholder && <DropPlaceholder />}

            {deals.length > 0 ? (
              deals.map((deal) => (
                <SortableDealCard
                  key={deal.id}
                  deal={deal}
                  stages={stages}
                  onClick={() => onDealClick(deal)}
                  onDelete={(e) => {
                    e.stopPropagation()
                    onDeleteDeal(deal.id)
                  }}
                  onMoveToStage={(stageId) => onMoveDeal(deal.id, stageId)}
                />
              ))
            ) : !showPlaceholder ? (
              <EmptyColumnState onAddDeal={() => onAddDeal(stage.id)} />
            ) : null}
          </SortableContext>
        </div>
      </ScrollArea>

      {/* Add Deal Footer */}
      <div className="p-2 border-t border-slate-200/50 dark:border-white/5">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => onAddDeal(stage.id)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add deal
        </Button>
      </div>
    </div>
  )
}

// Main Pipeline Board
export function PipelineBoard() {
  const {
    currentPipeline,
    deals,
    fetchDeals,
    moveDealToStage,
    deleteDeal,
  } = useSales()

  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createDealStageId, setCreateDealStageId] = useState<string | null>(null)

  const stages = currentPipeline?.stages || []

  // Fetch deals when pipeline changes
  useEffect(() => {
    if (currentPipeline?.id) {
      fetchDeals(currentPipeline.id)
    }
  }, [currentPipeline?.id, fetchDeals])

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const grouped: Record<string, Deal[]> = {}
    stages.forEach(stage => { grouped[stage.id] = [] })
    deals.forEach(deal => {
      if (deal.stage_id && grouped[deal.stage_id]) {
        grouped[deal.stage_id].push(deal)
      }
    })
    return grouped
  }, [deals, stages])

  // Calculate total value per stage
  const stageValues = useMemo(() => {
    const values: Record<string, number> = {}
    stages.forEach(stage => {
      values[stage.id] = dealsByStage[stage.id]?.reduce(
        (sum, deal) => sum + (deal.value || 0), 0
      ) || 0
    })
    return values
  }, [dealsByStage, stages])

  // Find stage by deal ID
  const findStageByDealId = (dealId: string): string | null => {
    for (const [stageId, stageDeals] of Object.entries(dealsByStage)) {
      if (stageDeals.some(d => d.id === dealId)) return stageId
    }
    return null
  }

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find(d => d.id === event.active.id)
    if (deal) setActiveDeal(deal)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (!over) {
      setDragOverStage(null)
      return
    }

    const overId = over.id as string
    const overStage = stages.find(s => s.id === overId)
    if (overStage) {
      setDragOverStage(overStage.id)
    } else {
      const dealStage = findStageByDealId(overId)
      if (dealStage) setDragOverStage(dealStage)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDeal(null)
    setDragOverStage(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    const activeDealData = deals.find(d => d.id === activeId)
    if (!activeDealData) return

    // Determine target stage
    let targetStageId: string | null = null
    const targetStage = stages.find(s => s.id === overId)
    if (targetStage) {
      targetStageId = targetStage.id
    } else {
      targetStageId = findStageByDealId(overId)
    }

    if (targetStageId && targetStageId !== activeDealData.stage_id) {
      await moveDealToStage(activeId, targetStageId)
    }
  }

  const handleAddDeal = (stageId: string) => {
    setCreateDealStageId(stageId)
    setShowCreateDialog(true)
  }

  const handleDeleteDeal = async (dealId: string) => {
    await deleteDeal(dealId)
  }

  const handleMoveDeal = async (dealId: string, stageId: string) => {
    await moveDealToStage(dealId, stageId)
  }

  if (!currentPipeline || stages.length === 0) {
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
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-5 pb-4 px-1 h-full overflow-x-auto overflow-y-hidden scrollbar-hide">
          {stages.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              stages={stages}
              deals={dealsByStage[stage.id] || []}
              totalValue={stageValues[stage.id] || 0}
              onDealClick={setSelectedDeal}
              onAddDeal={handleAddDeal}
              onDeleteDeal={handleDeleteDeal}
              onMoveDeal={handleMoveDeal}
              isDragOver={dragOverStage === stage.id}
              showPlaceholder={dragOverStage === stage.id && activeDeal?.stage_id !== stage.id}
            />
          ))}
        </div>

        <DragOverlay
          dropAnimation={{
            duration: 300,
            easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
          }}
        >
          {activeDeal ? <DragOverlayCard deal={activeDeal} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Create Deal Dialog */}
      <CreateDealDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        pipelineId={currentPipeline.id}
        defaultStageId={createDealStageId}
      />

      {/* Deal Detail Sheet */}
      <DealDetailSheet
        deal={selectedDeal}
        open={!!selectedDeal}
        onOpenChange={(open) => !open && setSelectedDeal(null)}
      />
    </>
  )
}
