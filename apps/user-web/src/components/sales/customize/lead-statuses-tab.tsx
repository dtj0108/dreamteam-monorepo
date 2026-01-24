"use client"

import { useState, useEffect } from "react"
import { Button } from "@dreamteam/ui/button"
import { Input } from "@dreamteam/ui/input"
import { Label } from "@dreamteam/ui/label"
import { Switch } from "@dreamteam/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@dreamteam/ui/dialog"
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
} from "lucide-react"

interface LeadStatus {
  id: string
  user_id: string
  name: string
  color: string
  position: number
  is_default: boolean
  is_won: boolean
  is_lost: boolean
  created_at: string
}

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

function SortableStatusItem({
  status,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  status: LeadStatus
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-background border rounded-lg"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <div
        className="size-4 rounded-full shrink-0"
        style={{ backgroundColor: status.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{status.name}</span>
          {status.is_default && (
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1">
              <StarIcon className="size-3" />
              Default
            </span>
          )}
          {status.is_won && (
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-1">
              <CheckCircleIcon className="size-3" />
              Won
            </span>
          )}
          {status.is_lost && (
            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded flex items-center gap-1">
              <XCircleIcon className="size-3" />
              Lost
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {!status.is_default && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSetDefault}
            className="text-muted-foreground text-xs"
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
          disabled={status.is_default}
          className="text-muted-foreground hover:text-destructive disabled:opacity-50"
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export function LeadStatusesTab() {
  const [statuses, setStatuses] = useState<LeadStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStatus, setEditingStatus] = useState<LeadStatus | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [color, setColor] = useState("#6b7280")
  const [isDefault, setIsDefault] = useState(false)
  const [isWon, setIsWon] = useState(false)
  const [isLost, setIsLost] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchStatuses()
  }, [])

  async function fetchStatuses() {
    try {
      const res = await fetch("/api/lead-statuses")
      if (res.ok) {
        const data = await res.json()
        setStatuses(data)
      }
    } catch (error) {
      console.error("Error fetching lead statuses:", error)
    } finally {
      setIsLoading(false)
    }
  }

  function resetForm() {
    setName("")
    setColor("#6b7280")
    setIsDefault(false)
    setIsWon(false)
    setIsLost(false)
    setEditingStatus(null)
  }

  function openCreateDialog() {
    resetForm()
    setDialogOpen(true)
  }

  function openEditDialog(status: LeadStatus) {
    setEditingStatus(status)
    setName(status.name)
    setColor(status.color)
    setIsDefault(status.is_default)
    setIsWon(status.is_won)
    setIsLost(status.is_lost)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) return

    setIsSaving(true)
    try {
      if (editingStatus) {
        const res = await fetch(`/api/lead-statuses/${editingStatus.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            color,
            is_default: isDefault,
            is_won: isWon,
            is_lost: isLost,
          }),
        })
        if (res.ok) {
          const updated = await res.json()
          setStatuses((prev) =>
            prev.map((s) => {
              if (s.id === updated.id) return updated
              // If this status was set as default, unset others
              if (isDefault && s.is_default) return { ...s, is_default: false }
              return s
            })
          )
        }
      } else {
        const res = await fetch("/api/lead-statuses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            color,
            is_default: isDefault,
            is_won: isWon,
            is_lost: isLost,
          }),
        })
        if (res.ok) {
          const created = await res.json()
          setStatuses((prev) => {
            // If new status is default, unset others
            if (isDefault) {
              return [...prev.map((s) => ({ ...s, is_default: false })), created]
            }
            return [...prev, created]
          })
        }
      }
      setDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error saving lead status:", error)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/lead-statuses/${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setStatuses((prev) => prev.filter((s) => s.id !== id))
      }
    } catch (error) {
      console.error("Error deleting lead status:", error)
    }
  }

  async function handleSetDefault(id: string) {
    try {
      const res = await fetch(`/api/lead-statuses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      })
      if (res.ok) {
        setStatuses((prev) =>
          prev.map((s) => ({
            ...s,
            is_default: s.id === id,
          }))
        )
      }
    } catch (error) {
      console.error("Error setting default status:", error)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = statuses.findIndex((s) => s.id === active.id)
      const newIndex = statuses.findIndex((s) => s.id === over.id)
      const newStatuses = arrayMove(statuses, oldIndex, newIndex)

      setStatuses(newStatuses)

      // Update positions on server
      for (let i = 0; i < newStatuses.length; i++) {
        if (newStatuses[i].position !== i) {
          await fetch(`/api/lead-statuses/${newStatuses[i].id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position: i }),
          })
        }
      }
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Lead Statuses</h2>
          <p className="text-sm text-muted-foreground">
            Customize the status options for your leads
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <PlusIcon className="size-4 mr-2" />
          Add Status
        </Button>
      </div>

      {statuses.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">No statuses configured</p>
          <Button variant="link" onClick={openCreateDialog}>
            Create your first status
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={statuses.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {statuses.map((status) => (
                <SortableStatusItem
                  key={status.id}
                  status={status}
                  onEdit={() => openEditDialog(status)}
                  onDelete={() => handleDelete(status.id)}
                  onSetDefault={() => handleSetDefault(status.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStatus ? "Edit Status" : "Add Status"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Status Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                    onClick={() => setColor(c)}
                    className={`size-8 rounded-full border-2 transition-all ${
                      color === c ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="default"
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                />
                <Label htmlFor="default">Default status for new leads</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="won"
                  checked={isWon}
                  onCheckedChange={(checked) => {
                    setIsWon(checked)
                    if (checked) setIsLost(false)
                  }}
                />
                <Label htmlFor="won">Mark as &quot;Won&quot; outcome</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="lost"
                  checked={isLost}
                  onCheckedChange={(checked) => {
                    setIsLost(checked)
                    if (checked) setIsWon(false)
                  }}
                />
                <Label htmlFor="lost">Mark as &quot;Lost&quot; outcome</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
              {isSaving ? "Saving..." : editingStatus ? "Save Changes" : "Create Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
