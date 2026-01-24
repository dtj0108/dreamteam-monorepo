"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@dreamteam/ui/button"
import { Input } from "@dreamteam/ui/input"
import {
  ArrowLeftIcon,
  Loader2Icon,
  PlusIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
} from "lucide-react"
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
import { TriggerCard } from "@/components/workflows/trigger-card"
import { ActionCard } from "@/components/workflows/action-card"
import { ActionPicker } from "@/components/workflows/action-picker"
import { ConfigSidePanel } from "@/components/workflows/config-side-panel"
import { FlowConnector } from "@/components/workflows/flow-connector"
import type { Workflow, WorkflowAction } from "@/types/workflow"

// Sortable wrapper for ActionCard
function SortableActionCard({
  action,
  selected,
  onClick,
}: {
  action: WorkflowAction
  selected: boolean
  onClick: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: action.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <ActionCard
        action={action}
        selected={selected}
      />
    </div>
  )
}

export default function WorkflowBuilderPage() {
  const params = useParams()
  const router = useRouter()

  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [workflowName, setWorkflowName] = useState("")
  const [actions, setActions] = useState<WorkflowAction[]>([])

  // Track saved state for dirty detection
  const lastSavedState = useRef<{ name: string; actions: string }>({ name: "", actions: "[]" })

  const isDirty = useMemo(() => {
    const currentActionsJson = JSON.stringify(actions)
    return workflowName !== lastSavedState.current.name || currentActionsJson !== lastSavedState.current.actions
  }, [workflowName, actions])

  // Selection & dialogs
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null)
  const [showActionPicker, setShowActionPicker] = useState(false)

  // DnD sensors - require 8px movement to start drag (allows clicks to work)
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

  // Fetch workflow
  useEffect(() => {
    async function fetchWorkflow() {
      try {
        const res = await fetch(`/api/workflows/${params.id}`)
        if (!res.ok) {
          router.push("/sales/workflows")
          return
        }
        const data = await res.json()
        setWorkflow(data)
        setWorkflowName(data.name)
        setActions(data.actions || [])
        // Initialize saved state for dirty tracking
        lastSavedState.current = {
          name: data.name,
          actions: JSON.stringify(data.actions || [])
        }
      } catch (error) {
        console.error("Error fetching workflow:", error)
        router.push("/sales/workflows")
      } finally {
        setIsLoading(false)
      }
    }
    fetchWorkflow()
  }, [params.id, router])

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setActions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        return newItems.map((item, idx) => ({ ...item, order: idx }))
      })
    }
  }

  // Add new action
  const handleAddAction = (action: WorkflowAction) => {
    setActions((prev) => [...prev, action])
    setSelectedActionId(action.id)
  }

  // Save edited action
  const handleSaveAction = (updatedAction: WorkflowAction) => {
    setActions((prev) =>
      prev.map((a) => (a.id === updatedAction.id ? updatedAction : a))
    )
  }

  // Delete action
  const handleDeleteAction = (actionId: string) => {
    setActions((prev) => {
      const filtered = prev.filter((a) => a.id !== actionId)
      return filtered.map((item, idx) => ({ ...item, order: idx }))
    })
    setSelectedActionId(null)
  }

  // Save workflow
  const handleSave = async () => {
    if (!workflow) return

    // Client-side validation
    if (!workflowName.trim()) {
      setSaveError("Workflow name is required")
      setSaveStatus("error")
      setTimeout(() => {
        setSaveStatus("idle")
        setSaveError(null)
      }, 3000)
      return
    }

    setIsSaving(true)
    setSaveStatus("idle")
    setSaveError(null)
    try {
      const res = await fetch(`/api/workflows/${workflow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workflowName.trim(),
          actions,
        }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        const errorMessage = errorData.error || `Save failed (${res.status})`
        throw new Error(errorMessage)
      }
      // Update saved state to clear dirty flag
      lastSavedState.current = {
        name: workflowName,
        actions: JSON.stringify(actions)
      }
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch (error) {
      console.error("Error saving workflow:", error)
      setSaveError(error instanceof Error ? error.message : "Failed to save")
      setSaveStatus("error")
      setTimeout(() => {
        setSaveStatus("idle")
        setSaveError(null)
      }, 3000)
    } finally {
      setIsSaving(false)
    }
  }

  // Activate workflow
  const handleActivate = async () => {
    if (!workflow) return

    setIsSaving(true)
    try {
      await fetch(`/api/workflows/${workflow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workflowName,
          actions,
          is_active: true,
        }),
      })
      router.push("/sales/workflows")
    } catch (error) {
      console.error("Error activating workflow:", error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!workflow) {
    return null
  }

  const selectedAction = actions.find((a) => a.id === selectedActionId) || null

  return (
    <div className="flex h-screen">
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/sales/workflows")}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeftIcon className="size-4" />
              Workflows
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <PencilIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={isSaving}
              className={
                saveStatus === "saved"
                  ? "text-green-600 border-green-300"
                  : saveStatus === "error"
                  ? "text-red-600 border-red-300"
                  : ""
              }
            >
              {isSaving ? (
                <>
                  <Loader2Icon className="size-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : saveStatus === "saved" ? (
                <>
                  <CheckIcon className="size-4 mr-1" />
                  Saved!
                </>
              ) : saveStatus === "error" ? (
                <>
                  <XIcon className="size-4 mr-1" />
                  {saveError || "Error"}
                </>
              ) : (
                <>
                  Save Draft
                  {isDirty && (
                    <span className="ml-1.5 size-2 rounded-full bg-amber-400" />
                  )}
                </>
              )}
            </Button>
            <Button onClick={handleActivate} disabled={isSaving}>
              Activate
            </Button>
          </div>
        </div>

        {/* Workflow name */}
        <div className="px-6 py-4 border-b">
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-2xl font-semibold border-none shadow-none h-auto px-0 focus-visible:ring-0 max-w-md"
            placeholder="Workflow name"
          />
          <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
            DRAFT
          </span>
        </div>

        {/* Flow canvas */}
        <div className="flex-1 overflow-auto p-8 bg-gray-50/50">
          <div className="flex flex-col items-center">
            {/* Trigger */}
            <TriggerCard
              triggerType={workflow.trigger_type}
              triggerConfig={workflow.trigger_config}
            />

            {/* Connector with inline "+ Add Step" */}
            <FlowConnector>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full bg-background shadow-sm"
                onClick={() => setShowActionPicker(true)}
              >
                <PlusIcon className="size-4 mr-1" />
                Add Step
              </Button>
            </FlowConnector>

            {/* Actions */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={actions.map((a) => a.id)}
                strategy={verticalListSortingStrategy}
              >
                {actions.map((action) => (
                  <div key={action.id} className="flex flex-col items-center">
                    <SortableActionCard
                      action={action}
                      selected={selectedActionId === action.id}
                      onClick={() => setSelectedActionId(action.id)}
                    />
                    <FlowConnector />
                  </div>
                ))}
              </SortableContext>
            </DndContext>

            {/* Bottom add button if there are actions */}
            {actions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full bg-background shadow-sm"
                onClick={() => setShowActionPicker(true)}
              >
                <PlusIcon className="size-4 mr-1" />
                Add Step
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Config side panel */}
      {selectedAction && (
        <ConfigSidePanel
          action={selectedAction}
          onClose={() => setSelectedActionId(null)}
          onSave={handleSaveAction}
          onDelete={handleDeleteAction}
        />
      )}

      {/* Action picker dialog */}
      <ActionPicker
        open={showActionPicker}
        onOpenChange={setShowActionPicker}
        onSelectAction={handleAddAction}
        existingActionsCount={actions.length}
      />
    </div>
  )
}
