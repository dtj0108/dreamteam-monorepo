"use client"

import { useState, useEffect } from "react"
import { Button } from "@dreamteam/ui/button"
import { Input } from "@dreamteam/ui/input"
import { Label } from "@dreamteam/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@dreamteam/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@dreamteam/ui/dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dreamteam/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@dreamteam/ui/collapsible"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  PlusIcon,
  GripVerticalIcon,
  PencilIcon,
  Trash2Icon,
  Loader2Icon,
  StarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "lucide-react"
import type { LeadPipeline, LeadPipelineStage } from "@/types/customization"

const COLOR_OPTIONS = [
  "#6b7280", // gray
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
]

function SortableStageItem({
  stage,
  onEdit,
  onDelete,
}: {
  stage: LeadPipelineStage
  onEdit: () => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-muted/50 rounded-md"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
      >
        <GripVerticalIcon className="size-3" />
      </button>
      <div
        className="size-3 rounded-full shrink-0"
        style={{ backgroundColor: stage.color || "#6b7280" }}
      />
      <span className="flex-1 text-sm">{stage.name}</span>
      {stage.is_won && (
        <CheckCircleIcon className="size-3 text-green-500" />
      )}
      {stage.is_lost && (
        <XCircleIcon className="size-3 text-red-500" />
      )}
      <Button variant="ghost" size="icon" className="size-6" onClick={onEdit}>
        <PencilIcon className="size-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-6 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2Icon className="size-3" />
      </Button>
    </div>
  )
}

function PipelineCard({
  pipeline,
  onEdit,
  onDelete,
  onSetDefault,
  onEditStage,
  onDeleteStage,
  onAddStage,
  onReorderStages,
}: {
  pipeline: LeadPipeline
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
  onEditStage: (stage: LeadPipelineStage) => void
  onDeleteStage: (stageId: string) => void
  onAddStage: () => void
  onReorderStages: (stages: LeadPipelineStage[]) => void
}) {
  const [isOpen, setIsOpen] = useState(true)
  const stages = pipeline.stages || []

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = stages.findIndex((s) => s.id === active.id)
      const newIndex = stages.findIndex((s) => s.id === over.id)
      const newStages = arrayMove(stages, oldIndex, newIndex).map((s, i) => ({
        ...s,
        position: i,
      }))
      onReorderStages(newStages)
    }
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6">
                  {isOpen ? (
                    <ChevronDownIcon className="size-4" />
                  ) : (
                    <ChevronRightIcon className="size-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{pipeline.name}</CardTitle>
                  {pipeline.is_default && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <StarIcon className="size-3" />
                      Default
                    </span>
                  )}
                </div>
                {pipeline.description && (
                  <CardDescription className="text-xs mt-0.5">
                    {pipeline.description}
                  </CardDescription>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!pipeline.is_default && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSetDefault}
                  className="text-xs"
                >
                  Set Default
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <PencilIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Stages ({stages.length})
                </span>
                <Button variant="outline" size="sm" onClick={onAddStage}>
                  <PlusIcon className="size-3 mr-1" />
                  Add Stage
                </Button>
              </div>
              {stages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No stages defined
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={stages.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1">
                      {stages.map((stage) => (
                        <SortableStageItem
                          key={stage.id}
                          stage={stage}
                          onEdit={() => onEditStage(stage)}
                          onDelete={() => onDeleteStage(stage.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export function PipelinesTab() {
  const [pipelines, setPipelines] = useState<LeadPipeline[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Pipeline dialog state
  const [pipelineDialogOpen, setPipelineDialogOpen] = useState(false)
  const [editingPipeline, setEditingPipeline] = useState<LeadPipeline | null>(null)
  const [pipelineName, setPipelineName] = useState("")
  const [pipelineDescription, setPipelineDescription] = useState("")
  const [pipelineIsDefault, setPipelineIsDefault] = useState(false)

  // Stage dialog state
  const [stageDialogOpen, setStageDialogOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<LeadPipelineStage | null>(null)
  const [stagePipelineId, setStagePipelineId] = useState<string | null>(null)
  const [stageName, setStageName] = useState("")
  const [stageColor, setStageColor] = useState("#6b7280")
  const [stageIsWon, setStageIsWon] = useState(false)
  const [stageIsLost, setStageIsLost] = useState(false)

  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchPipelines()
  }, [])

  async function fetchPipelines() {
    try {
      const res = await fetch("/api/lead-pipelines")
      if (res.ok) {
        const data = await res.json()
        setPipelines(data)
      }
    } catch (error) {
      console.error("Error fetching lead pipelines:", error)
    } finally {
      setIsLoading(false)
    }
  }

  function resetPipelineForm() {
    setPipelineName("")
    setPipelineDescription("")
    setPipelineIsDefault(false)
    setEditingPipeline(null)
  }

  function resetStageForm() {
    setStageName("")
    setStageColor("#6b7280")
    setStageIsWon(false)
    setStageIsLost(false)
    setEditingStage(null)
    setStagePipelineId(null)
  }

  function openCreatePipelineDialog() {
    resetPipelineForm()
    setPipelineDialogOpen(true)
  }

  function openEditPipelineDialog(pipeline: LeadPipeline) {
    setEditingPipeline(pipeline)
    setPipelineName(pipeline.name)
    setPipelineDescription(pipeline.description || "")
    setPipelineIsDefault(pipeline.is_default)
    setPipelineDialogOpen(true)
  }

  function openAddStageDialog(pipelineId: string) {
    resetStageForm()
    setStagePipelineId(pipelineId)
    setStageDialogOpen(true)
  }

  function openEditStageDialog(stage: LeadPipelineStage) {
    setEditingStage(stage)
    setStagePipelineId(stage.pipeline_id)
    setStageName(stage.name)
    setStageColor(stage.color || "#6b7280")
    setStageIsWon(stage.is_won)
    setStageIsLost(stage.is_lost)
    setStageDialogOpen(true)
  }

  async function handleSavePipeline() {
    if (!pipelineName.trim()) return

    setIsSaving(true)
    try {
      if (editingPipeline) {
        const res = await fetch(`/api/lead-pipelines/${editingPipeline.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: pipelineName,
            description: pipelineDescription || null,
            is_default: pipelineIsDefault,
          }),
        })
        if (res.ok) {
          const updated = await res.json()
          setPipelines((prev) =>
            prev.map((p) => {
              if (p.id === updated.id) return updated
              if (pipelineIsDefault && p.is_default) return { ...p, is_default: false }
              return p
            })
          )
        }
      } else {
        // Create with default stages
        const res = await fetch("/api/lead-pipelines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: pipelineName,
            description: pipelineDescription || null,
            is_default: pipelineIsDefault,
            stages: [
              { name: "New", color: "#3b82f6" },
              { name: "In Progress", color: "#eab308" },
              { name: "Qualified", color: "#10b981" },
              { name: "Won", color: "#22c55e", is_won: true },
              { name: "Lost", color: "#ef4444", is_lost: true },
            ],
          }),
        })
        if (res.ok) {
          const created = await res.json()
          setPipelines((prev) => {
            if (pipelineIsDefault) {
              return [...prev.map((p) => ({ ...p, is_default: false })), created]
            }
            return [...prev, created]
          })
        }
      }
      setPipelineDialogOpen(false)
      resetPipelineForm()
    } catch (error) {
      console.error("Error saving pipeline:", error)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeletePipeline(id: string) {
    try {
      const res = await fetch(`/api/lead-pipelines/${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setPipelines((prev) => prev.filter((p) => p.id !== id))
      } else {
        const error = await res.json()
        alert(error.error || "Failed to delete pipeline")
      }
    } catch (error) {
      console.error("Error deleting pipeline:", error)
    }
  }

  async function handleSetDefaultPipeline(id: string) {
    try {
      const res = await fetch(`/api/lead-pipelines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      })
      if (res.ok) {
        setPipelines((prev) =>
          prev.map((p) => ({
            ...p,
            is_default: p.id === id,
          }))
        )
      }
    } catch (error) {
      console.error("Error setting default pipeline:", error)
    }
  }

  async function handleSaveStage() {
    if (!stageName.trim() || !stagePipelineId) return

    setIsSaving(true)
    try {
      if (editingStage) {
        const res = await fetch(`/api/lead-pipelines/${stagePipelineId}/stages`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stages: [{
              id: editingStage.id,
              name: stageName,
              color: stageColor,
              is_won: stageIsWon,
              is_lost: stageIsLost,
            }],
          }),
        })
        if (res.ok) {
          const updatedStages = await res.json()
          setPipelines((prev) =>
            prev.map((p) =>
              p.id === stagePipelineId ? { ...p, stages: updatedStages } : p
            )
          )
        }
      } else {
        const res = await fetch(`/api/lead-pipelines/${stagePipelineId}/stages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: stageName,
            color: stageColor,
            is_won: stageIsWon,
            is_lost: stageIsLost,
          }),
        })
        if (res.ok) {
          const newStage = await res.json()
          setPipelines((prev) =>
            prev.map((p) =>
              p.id === stagePipelineId
                ? { ...p, stages: [...(p.stages || []), newStage] }
                : p
            )
          )
        }
      }
      setStageDialogOpen(false)
      resetStageForm()
    } catch (error) {
      console.error("Error saving stage:", error)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteStage(pipelineId: string, stageId: string) {
    try {
      const res = await fetch(
        `/api/lead-pipelines/${pipelineId}/stages?stageId=${stageId}`,
        { method: "DELETE" }
      )
      if (res.ok) {
        setPipelines((prev) =>
          prev.map((p) =>
            p.id === pipelineId
              ? { ...p, stages: (p.stages || []).filter((s) => s.id !== stageId) }
              : p
          )
        )
      } else {
        const error = await res.json()
        alert(error.error || "Failed to delete stage")
      }
    } catch (error) {
      console.error("Error deleting stage:", error)
    }
  }

  async function handleReorderStages(pipelineId: string, stages: LeadPipelineStage[]) {
    // Optimistic update
    setPipelines((prev) =>
      prev.map((p) => (p.id === pipelineId ? { ...p, stages } : p))
    )

    // Persist to server
    try {
      await fetch(`/api/lead-pipelines/${pipelineId}/stages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stages: stages.map((s, i) => ({ id: s.id, position: i })),
        }),
      })
    } catch (error) {
      console.error("Error reordering stages:", error)
      // Refetch on error
      fetchPipelines()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-medium">Lead Pipelines</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage pipelines with custom stages for your leads
          </p>
        </div>
        <Button onClick={openCreatePipelineDialog}>
          <PlusIcon className="size-4 mr-2" />
          Add Pipeline
        </Button>
      </div>

      {pipelines.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">No pipelines configured</p>
          <Button variant="link" onClick={openCreatePipelineDialog}>
            Create your first pipeline
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {pipelines.map((pipeline) => (
            <PipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              onEdit={() => openEditPipelineDialog(pipeline)}
              onDelete={() => handleDeletePipeline(pipeline.id)}
              onSetDefault={() => handleSetDefaultPipeline(pipeline.id)}
              onEditStage={openEditStageDialog}
              onDeleteStage={(stageId) => handleDeleteStage(pipeline.id, stageId)}
              onAddStage={() => openAddStageDialog(pipeline.id)}
              onReorderStages={(stages) => handleReorderStages(pipeline.id, stages)}
            />
          ))}
        </div>
      )}

      {/* Pipeline Dialog */}
      <Dialog open={pipelineDialogOpen} onOpenChange={setPipelineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPipeline ? "Edit Pipeline" : "Create Pipeline"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pipeline-name">Pipeline Name</Label>
              <Input
                id="pipeline-name"
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                placeholder="e.g., Sales Pipeline"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pipeline-description">Description (optional)</Label>
              <Textarea
                id="pipeline-description"
                value={pipelineDescription}
                onChange={(e) => setPipelineDescription(e.target.value)}
                placeholder="Describe this pipeline..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="pipeline-default"
                checked={pipelineIsDefault}
                onCheckedChange={setPipelineIsDefault}
                className="data-[state=unchecked]:!bg-gray-400 data-[state=checked]:!bg-sky-500"
              />
              <Label htmlFor="pipeline-default">Set as default pipeline</Label>
            </div>

            {!editingPipeline && (
              <p className="text-sm text-muted-foreground">
                Default stages (New, In Progress, Qualified, Won, Lost) will be created automatically.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPipelineDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePipeline} disabled={!pipelineName.trim() || isSaving}>
              {isSaving ? "Saving..." : editingPipeline ? "Save Changes" : "Create Pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stage Dialog */}
      <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStage ? "Edit Stage" : "Add Stage"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stage-name">Stage Name</Label>
              <Input
                id="stage-name"
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                placeholder="e.g., Qualified"
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setStageColor(c)}
                    className={`size-8 rounded-full border-2 transition-all ${
                      stageColor === c ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="stage-won"
                  checked={stageIsWon}
                  onCheckedChange={(checked) => {
                    setStageIsWon(checked)
                    if (checked) setStageIsLost(false)
                  }}
                />
                <Label htmlFor="stage-won">Mark as &quot;Won&quot; outcome</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="stage-lost"
                  checked={stageIsLost}
                  onCheckedChange={(checked) => {
                    setStageIsLost(checked)
                    if (checked) setStageIsWon(false)
                  }}
                />
                <Label htmlFor="stage-lost">Mark as &quot;Lost&quot; outcome</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStageDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStage} disabled={!stageName.trim() || isSaving}>
              {isSaving ? "Saving..." : editingStage ? "Save Changes" : "Add Stage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
