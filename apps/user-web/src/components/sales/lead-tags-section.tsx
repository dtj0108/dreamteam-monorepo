"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { PlusIcon, XIcon, CheckIcon, Loader2Icon, TagIcon, ChevronLeftIcon } from "lucide-react"
import { CollapsibleSection } from "@/components/sales/collapsible-section"

interface LeadTag {
  id: string
  name: string
  color: string
}

interface LeadTagsSectionProps {
  leadId: string
  initialTags?: LeadTag[]
  onTagsChange?: () => void
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

export function LeadTagsSection({
  leadId,
  initialTags = [],
  onTagsChange,
}: LeadTagsSectionProps) {
  const [assignedTags, setAssignedTags] = React.useState<LeadTag[]>(initialTags)
  const [availableTags, setAvailableTags] = React.useState<LeadTag[]>([])
  const [isLoadingTags, setIsLoadingTags] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [popoverOpen, setPopoverOpen] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)

  // Create form state
  const [showCreateForm, setShowCreateForm] = React.useState(false)
  const [newTagName, setNewTagName] = React.useState("")
  const [newTagColor, setNewTagColor] = React.useState("#3b82f6")

  // Fetch all available tags when popover opens
  const fetchAvailableTags = React.useCallback(async () => {
    setIsLoadingTags(true)
    try {
      const res = await fetch("/api/lead-tags")
      if (res.ok) {
        const data = await res.json()
        setAvailableTags(data)
      }
    } catch (error) {
      console.error("Error fetching tags:", error)
    } finally {
      setIsLoadingTags(false)
    }
  }, [])

  React.useEffect(() => {
    if (popoverOpen) {
      fetchAvailableTags()
      setShowCreateForm(false)
      setNewTagName("")
      setNewTagColor("#3b82f6")
      setSearch("")
    }
  }, [popoverOpen, fetchAvailableTags])

  // Sync initialTags when they change externally
  React.useEffect(() => {
    setAssignedTags(initialTags)
  }, [initialTags])

  const assignedTagIds = new Set(assignedTags.map((t) => t.id))

  const filteredTags = availableTags.filter(
    (tag) => tag.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAssignTag(tag: LeadTag) {
    if (assignedTagIds.has(tag.id)) return

    // Optimistic update
    setAssignedTags((prev) => [...prev, tag])

    try {
      const res = await fetch(`/api/leads/${leadId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag_id: tag.id }),
      })
      if (!res.ok) {
        // Revert on error
        setAssignedTags((prev) => prev.filter((t) => t.id !== tag.id))
      }
      onTagsChange?.()
    } catch (error) {
      // Revert on error
      setAssignedTags((prev) => prev.filter((t) => t.id !== tag.id))
      console.error("Error assigning tag:", error)
    }
  }

  async function handleRemoveTag(tagId: string) {
    const tagToRemove = assignedTags.find((t) => t.id === tagId)
    if (!tagToRemove) return

    // Optimistic update
    setAssignedTags((prev) => prev.filter((t) => t.id !== tagId))

    try {
      const res = await fetch(`/api/leads/${leadId}/tags?tag_id=${tagId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        // Revert on error
        setAssignedTags((prev) => [...prev, tagToRemove])
      }
      onTagsChange?.()
    } catch (error) {
      // Revert on error
      setAssignedTags((prev) => [...prev, tagToRemove])
      console.error("Error removing tag:", error)
    }
  }

  async function handleCreateTag() {
    if (!newTagName.trim() || isCreating) return

    setIsCreating(true)

    try {
      // Create the tag
      const createRes = await fetch("/api/lead-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      })
      if (!createRes.ok) {
        console.error("Error creating tag")
        return
      }

      const newTag = await createRes.json()
      setAvailableTags((prev) => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)))

      // Assign the new tag to the lead
      await handleAssignTag(newTag)

      // Reset form and go back to list
      setNewTagName("")
      setNewTagColor("#3b82f6")
      setShowCreateForm(false)
    } catch (error) {
      console.error("Error creating tag:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const renderPopoverContent = () => (
    <PopoverContent className="w-64 p-0" align="start">
      {showCreateForm ? (
        // Create new tag form
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateForm(false)}
              className="p-1 hover:bg-muted rounded"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <span className="font-medium text-sm">Create new tag</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tag-name" className="text-xs">Name</Label>
            <Input
              id="tag-name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name"
              className="h-8"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <div className="flex gap-1.5 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewTagColor(c)}
                  className={`size-6 rounded-full border-2 transition-all ${
                    newTagColor === c ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <Button
            onClick={handleCreateTag}
            disabled={!newTagName.trim() || isCreating}
            className="w-full h-8"
            size="sm"
          >
            {isCreating ? (
              <>
                <Loader2Icon className="size-3 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              "Create & Add"
            )}
          </Button>
        </div>
      ) : (
        // Tag selection list
        <div>
          <div className="p-2">
            <Input
              placeholder="Search tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
              autoFocus
            />
          </div>

          <ScrollArea className="h-40">
            {isLoadingTags ? (
              <div className="flex items-center justify-center py-4">
                <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTags.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {search ? "No matching tags" : "No tags yet"}
              </p>
            ) : (
              <div className="px-1 pb-1">
                {filteredTags.map((tag) => {
                  const isAssigned = assignedTagIds.has(tag.id)
                  return (
                    <button
                      key={tag.id}
                      onClick={() => !isAssigned && handleAssignTag(tag)}
                      disabled={isAssigned}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left hover:bg-muted transition-colors ${
                        isAssigned ? "opacity-50 cursor-default" : ""
                      }`}
                    >
                      <div
                        className="size-3 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1 truncate">{tag.name}</span>
                      {isAssigned && (
                        <CheckIcon className="size-4 text-muted-foreground" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          <Separator />

          <div className="p-2">
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left hover:bg-muted transition-colors text-primary font-medium"
            >
              <PlusIcon className="size-4" />
              <span>Create new tag</span>
            </button>
          </div>
        </div>
      )}
    </PopoverContent>
  )

  return (
    <CollapsibleSection
      icon={<TagIcon className="size-4" />}
      title="TAGS"
      count={assignedTags.length}
      onAdd={() => setPopoverOpen(true)}
    >
      <div className="pl-6">
        {assignedTags.length === 0 ? (
          <div>
            <p className="text-sm text-muted-foreground">No tags assigned</p>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground mt-2"
                >
                  <PlusIcon className="size-3 mr-1" />
                  Add tag
                </Button>
              </PopoverTrigger>
              {renderPopoverContent()}
            </Popover>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {assignedTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-xs gap-1 pr-1"
                style={{
                  backgroundColor: `${tag.color}20`,
                  color: tag.color,
                  borderColor: tag.color,
                }}
              >
                {tag.name}
                <button
                  onClick={() => handleRemoveTag(tag.id)}
                  className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            ))}
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground"
                >
                  <PlusIcon className="size-3 mr-1" />
                  Add
                </Button>
              </PopoverTrigger>
              {renderPopoverContent()}
            </Popover>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}
