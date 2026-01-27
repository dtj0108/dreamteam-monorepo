"use client"

import { useState, useEffect } from "react"
import { Button } from "@dreamteam/ui/button"
import { Input } from "@dreamteam/ui/input"
import { Label } from "@dreamteam/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@dreamteam/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@dreamteam/ui/alert-dialog"
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  Loader2Icon,
  TagIcon,
} from "lucide-react"

interface LeadTag {
  id: string
  workspace_id: string
  name: string
  color: string
  created_at: string
  updated_at: string
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

function TagItem({
  tag,
  onEdit,
  onDelete,
}: {
  tag: LeadTag
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-background border rounded-lg">
      <div
        className="size-4 rounded-full shrink-0"
        style={{ backgroundColor: tag.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{tag.name}</span>
        </div>
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

export function LeadTagsTab() {
  const [tags, setTags] = useState<LeadTag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<LeadTag | null>(null)
  const [deletingTag, setDeletingTag] = useState<LeadTag | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [color, setColor] = useState("#6b7280")

  useEffect(() => {
    fetchTags()
  }, [])

  async function fetchTags() {
    try {
      const res = await fetch("/api/lead-tags")
      if (res.ok) {
        const data = await res.json()
        setTags(data)
      }
    } catch (error) {
      console.error("Error fetching lead tags:", error)
    } finally {
      setIsLoading(false)
    }
  }

  function resetForm() {
    setName("")
    setColor("#6b7280")
    setEditingTag(null)
  }

  function openCreateDialog() {
    resetForm()
    setDialogOpen(true)
  }

  function openEditDialog(tag: LeadTag) {
    setEditingTag(tag)
    setName(tag.name)
    setColor(tag.color)
    setDialogOpen(true)
  }

  function openDeleteDialog(tag: LeadTag) {
    setDeletingTag(tag)
    setDeleteDialogOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) return

    setIsSaving(true)
    try {
      if (editingTag) {
        const res = await fetch(`/api/lead-tags/${editingTag.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, color }),
        })
        if (res.ok) {
          const updated = await res.json()
          setTags((prev) =>
            prev.map((t) => (t.id === updated.id ? updated : t))
          )
        }
      } else {
        const res = await fetch("/api/lead-tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, color }),
        })
        if (res.ok) {
          const created = await res.json()
          setTags((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
        }
      }
      setDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error saving lead tag:", error)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingTag) return

    try {
      const res = await fetch(`/api/lead-tags/${deletingTag.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setTags((prev) => prev.filter((t) => t.id !== deletingTag.id))
      }
    } catch (error) {
      console.error("Error deleting lead tag:", error)
    } finally {
      setDeleteDialogOpen(false)
      setDeletingTag(null)
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
          <h2 className="text-lg font-medium">Tags</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage tags to categorize your leads
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <PlusIcon className="size-4 mr-2" />
          Add Tag
        </Button>
      </div>

      {tags.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <TagIcon className="size-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No tags configured</p>
          <Button variant="link" onClick={openCreateDialog}>
            Create your first tag
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <TagItem
              key={tag.id}
              tag={tag}
              onEdit={() => openEditDialog(tag)}
              onDelete={() => openDeleteDialog(tag)}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTag ? "Edit Tag" : "Add Tag"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tag Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Hot Lead"
                maxLength={50}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
              {isSaving ? "Saving..." : editingTag ? "Save Changes" : "Create Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the tag "{deletingTag?.name}"? This will
              remove the tag from all leads it's assigned to. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
