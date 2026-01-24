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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dreamteam/ui/select"
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
} from "lucide-react"

type FieldType = "text" | "number" | "date" | "select" | "checkbox" | "url" | "email" | "phone"

interface CustomField {
  id: string
  user_id: string
  entity_type: string
  name: string
  field_type: FieldType
  options: { value: string; label: string }[]
  is_required: boolean
  position: number
  created_at: string
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "url", label: "URL" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
]

function SortableFieldItem({
  field,
  onEdit,
  onDelete,
}: {
  field: CustomField
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
  } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const fieldTypeLabel = FIELD_TYPES.find((t) => t.value === field.field_type)?.label || field.field_type

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
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{field.name}</span>
          {field.is_required && (
            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
              Required
            </span>
          )}
        </div>
        <span className="text-sm text-muted-foreground">{fieldTypeLabel}</span>
      </div>
      <div className="flex items-center gap-1">
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
  )
}

export function CustomFieldsTab() {
  const [fields, setFields] = useState<CustomField[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [fieldType, setFieldType] = useState<FieldType>("text")
  const [isRequired, setIsRequired] = useState(false)
  const [options, setOptions] = useState<string[]>([])
  const [newOption, setNewOption] = useState("")

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchFields()
  }, [])

  async function fetchFields() {
    try {
      const res = await fetch("/api/custom-fields?entity_type=lead")
      if (res.ok) {
        const data = await res.json()
        setFields(data)
      }
    } catch (error) {
      console.error("Error fetching custom fields:", error)
    } finally {
      setIsLoading(false)
    }
  }

  function resetForm() {
    setName("")
    setFieldType("text")
    setIsRequired(false)
    setOptions([])
    setNewOption("")
    setEditingField(null)
  }

  function openCreateDialog() {
    resetForm()
    setDialogOpen(true)
  }

  function openEditDialog(field: CustomField) {
    setEditingField(field)
    setName(field.name)
    setFieldType(field.field_type)
    setIsRequired(field.is_required)
    setOptions(field.options.map((o) => o.label))
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) return

    setIsSaving(true)
    try {
      const fieldOptions = options.map((label) => ({
        value: label.toLowerCase().replace(/\s+/g, "_"),
        label,
      }))

      if (editingField) {
        const res = await fetch(`/api/custom-fields/${editingField.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            field_type: fieldType,
            is_required: isRequired,
            options: fieldOptions,
          }),
        })
        if (res.ok) {
          const updated = await res.json()
          setFields((prev) =>
            prev.map((f) => (f.id === updated.id ? updated : f))
          )
        }
      } else {
        const res = await fetch("/api/custom-fields", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            field_type: fieldType,
            entity_type: "lead",
            is_required: isRequired,
            options: fieldOptions,
          }),
        })
        if (res.ok) {
          const created = await res.json()
          setFields((prev) => [...prev, created])
        }
      }
      setDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error saving custom field:", error)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/custom-fields/${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setFields((prev) => prev.filter((f) => f.id !== id))
      }
    } catch (error) {
      console.error("Error deleting custom field:", error)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id)
      const newIndex = fields.findIndex((f) => f.id === over.id)
      const newFields = arrayMove(fields, oldIndex, newIndex)

      setFields(newFields)

      // Update positions on server
      for (let i = 0; i < newFields.length; i++) {
        if (newFields[i].position !== i) {
          await fetch(`/api/custom-fields/${newFields[i].id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position: i }),
          })
        }
      }
    }
  }

  function addOption() {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()])
      setNewOption("")
    }
  }

  function removeOption(index: number) {
    setOptions(options.filter((_, i) => i !== index))
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
          <h2 className="text-lg font-medium">Custom Fields</h2>
          <p className="text-sm text-muted-foreground">
            Add custom fields to capture additional information on leads
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <PlusIcon className="size-4 mr-2" />
          Add Field
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">No custom fields yet</p>
          <Button variant="link" onClick={openCreateDialog}>
            Create your first custom field
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {fields.map((field) => (
                <SortableFieldItem
                  key={field.id}
                  field={field}
                  onEdit={() => openEditDialog(field)}
                  onDelete={() => handleDelete(field.id)}
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
              {editingField ? "Edit Field" : "Add Custom Field"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Field Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Company Size"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Field Type</Label>
              <Select value={fieldType} onValueChange={(v) => setFieldType(v as FieldType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {fieldType === "select" && (
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="flex gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Add an option"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addOption()
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addOption}>
                    Add
                  </Button>
                </div>
                {options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {options.map((option, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm"
                      >
                        {option}
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                id="required"
                checked={isRequired}
                onCheckedChange={setIsRequired}
              />
              <Label htmlFor="required">Required field</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
              {isSaving ? "Saving..." : editingField ? "Save Changes" : "Create Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
