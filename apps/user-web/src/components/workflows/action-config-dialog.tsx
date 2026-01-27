"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@dreamteam/ui/dialog"
import { Button } from "@dreamteam/ui/button"
import { Input } from "@dreamteam/ui/input"
import { Label } from "@dreamteam/ui/label"
import { Textarea } from "@dreamteam/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dreamteam/ui/select"
import { SearchIcon, PlusIcon, XIcon, CheckIcon, Loader2Icon } from "lucide-react"
import type { WorkflowAction } from "@/types/workflow"
import { getActionDefinition } from "@/types/workflow"

// Tag type for the selector
interface LeadTag {
  id: string
  name: string
  color: string
}

// Preset colors for new tags
const TAG_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#a855f7", // purple
  "#f97316", // orange
  "#ef4444", // red
  "#eab308", // yellow
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#6b7280", // gray
]

interface ActionConfigDialogProps {
  action: WorkflowAction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (action: WorkflowAction) => void
}

export function ActionConfigDialog({
  action,
  open,
  onOpenChange,
  onSave,
}: ActionConfigDialogProps) {
  const [config, setConfig] = useState<Record<string, unknown>>({})

  // Tag-related state
  const [availableTags, setAvailableTags] = useState<LeadTag[]>([])
  const [tagsLoading, setTagsLoading] = useState(false)
  const [tagSearchQuery, setTagSearchQuery] = useState("")
  const [showCreateTag, setShowCreateTag] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const [creatingTag, setCreatingTag] = useState(false)

  useEffect(() => {
    if (action) {
      setConfig(action.config || {})
    }
  }, [action])

  // Fetch tags when dialog opens for tag-related actions
  const fetchTags = useCallback(async () => {
    if (!action || (action.type !== "add_tag" && action.type !== "remove_tag")) return

    setTagsLoading(true)
    try {
      const response = await fetch("/api/lead-tags")
      if (response.ok) {
        const data = await response.json()
        setAvailableTags(data)
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error)
    } finally {
      setTagsLoading(false)
    }
  }, [action])

  useEffect(() => {
    if (open && action && (action.type === "add_tag" || action.type === "remove_tag")) {
      fetchTags()
      setTagSearchQuery("")
      setShowCreateTag(false)
      setNewTagName("")
      setNewTagColor(TAG_COLORS[0])
    }
  }, [open, action, fetchTags])

  // Create a new tag
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return

    setCreatingTag(true)
    try {
      const response = await fetch("/api/lead-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      })

      if (response.ok) {
        const newTag = await response.json()
        setAvailableTags(prev => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)))
        // Auto-select the new tag
        const currentTags = (config.tags as LeadTag[]) || []
        updateConfig("tags", [...currentTags, newTag])
        // Reset form
        setShowCreateTag(false)
        setNewTagName("")
        setNewTagColor(TAG_COLORS[0])
      }
    } catch (error) {
      console.error("Failed to create tag:", error)
    } finally {
      setCreatingTag(false)
    }
  }

  // Toggle tag selection
  const toggleTagSelection = (tag: LeadTag) => {
    const currentTags = (config.tags as LeadTag[]) || []
    const isSelected = currentTags.some(t => t.id === tag.id)

    if (isSelected) {
      updateConfig("tags", currentTags.filter(t => t.id !== tag.id))
    } else {
      updateConfig("tags", [...currentTags, tag])
    }
  }

  // Filter tags by search query
  const filteredTags = availableTags.filter(tag =>
    tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
  )

  if (!action) return null

  const definition = getActionDefinition(action.type)

  const handleSave = () => {
    onSave({ ...action, config })
    onOpenChange(false)
  }

  const updateConfig = (key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const renderForm = () => {
    switch (action.type) {
      case "send_email":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient</Label>
              <Select
                value={(config.recipient as string) || "lead_email"}
                onValueChange={(v) => updateConfig("recipient", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead_email">Lead Email</SelectItem>
                  <SelectItem value="assigned_user">Assigned User</SelectItem>
                  <SelectItem value="custom">Custom Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.recipient === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="custom_email">Custom Email</Label>
                <Input
                  id="custom_email"
                  value={(config.custom_email as string) || ""}
                  onChange={(e) => updateConfig("custom_email", e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={(config.subject as string) || ""}
                onChange={(e) => updateConfig("subject", e.target.value)}
                placeholder="Email subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Body</Label>
              <Textarea
                id="body"
                value={(config.body as string) || ""}
                onChange={(e) => updateConfig("body", e.target.value)}
                placeholder="Email body content..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{lead_name}}"}, {"{{lead_email}}"}, {"{{deal_value}}"} for dynamic content
              </p>
            </div>
          </div>
        )

      case "send_sms":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone_source">Phone Number</Label>
              <Select
                value={(config.phone_source as string) || "lead_phone"}
                onValueChange={(v) => updateConfig("phone_source", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select phone source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead_phone">Lead Phone</SelectItem>
                  <SelectItem value="custom">Custom Number</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.phone_source === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="custom_phone">Custom Phone Number</Label>
                <Input
                  id="custom_phone"
                  value={(config.custom_phone as string) || ""}
                  onChange={(e) => updateConfig("custom_phone", e.target.value)}
                  placeholder="+1234567890"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={(config.message as string) || ""}
                onChange={(e) => updateConfig("message", e.target.value)}
                placeholder="SMS message content..."
                rows={3}
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground">
                {160 - ((config.message as string)?.length || 0)} characters remaining.
                Use {"{{lead_name}}"}, {"{{contact_name}}"} for dynamic content
              </p>
            </div>
          </div>
        )

      case "make_call":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone_source">Phone Number</Label>
              <Select
                value={(config.phone_source as string) || "contact_phone"}
                onValueChange={(v) => updateConfig("phone_source", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select phone source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contact_phone">Contact Phone</SelectItem>
                  <SelectItem value="custom">Custom Number</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.phone_source === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="custom_phone">Custom Phone Number</Label>
                <Input
                  id="custom_phone"
                  value={(config.custom_phone as string) || ""}
                  onChange={(e) => updateConfig("custom_phone", e.target.value)}
                  placeholder="+1234567890"
                />
              </div>
            )}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="record"
                checked={(config.record as boolean) ?? true}
                onChange={(e) => updateConfig("record", e.target.checked)}
                className="size-4 rounded border-gray-300"
              />
              <Label htmlFor="record" className="font-normal">
                Record this call
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Outbound calls will connect through Twilio. Make sure you have a Twilio phone number configured.
            </p>
          </div>
        )

      case "send_notification":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={(config.title as string) || ""}
                onChange={(e) => updateConfig("title", e.target.value)}
                placeholder="Notification title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={(config.message as string) || ""}
                onChange={(e) => updateConfig("message", e.target.value)}
                placeholder="Notification message..."
                rows={3}
              />
            </div>
          </div>
        )

      case "create_task":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                value={(config.title as string) || ""}
                onChange={(e) => updateConfig("title", e.target.value)}
                placeholder="Follow up with lead"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={(config.description as string) || ""}
                onChange={(e) => updateConfig("description", e.target.value)}
                placeholder="Task description..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_days">Due In (Days)</Label>
              <Input
                id="due_days"
                type="number"
                min={0}
                value={(config.due_days as number) || 1}
                onChange={(e) => updateConfig("due_days", parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={(config.priority as string) || "medium"}
                onValueChange={(v) => updateConfig("priority", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case "update_status":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">New Status</Label>
              <Select
                value={(config.status as string) || ""}
                onValueChange={(v) => updateConfig("status", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case "add_note":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note">Note Content</Label>
              <Textarea
                id="note"
                value={(config.note as string) || ""}
                onChange={(e) => updateConfig("note", e.target.value)}
                placeholder="Add a note to the record..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{trigger_event}}"} to include trigger details
              </p>
            </div>
          </div>
        )

      case "assign_user":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assignment_type">Assignment Type</Label>
              <Select
                value={(config.assignment_type as string) || "round_robin"}
                onValueChange={(v) => updateConfig("assignment_type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round_robin">Round Robin</SelectItem>
                  <SelectItem value="specific_user">Specific User</SelectItem>
                  <SelectItem value="least_leads">Least Leads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.assignment_type === "specific_user" && (
              <div className="space-y-2">
                <Label htmlFor="user_id">User</Label>
                <Input
                  id="user_id"
                  value={(config.user_id as string) || ""}
                  onChange={(e) => updateConfig("user_id", e.target.value)}
                  placeholder="User ID (will be a dropdown in production)"
                />
              </div>
            )}
          </div>
        )

      case "add_tag":
        return (
          <div className="space-y-4">
            <Label>Select tags to add</Label>

            {/* Search input */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search tags..."
                value={tagSearchQuery}
                onChange={(e) => setTagSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Tags list */}
            <div className="border rounded-lg max-h-48 overflow-auto">
              {tagsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTags.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-sm">
                  {tagSearchQuery ? "No tags match your search" : "No tags available"}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredTags.map(tag => {
                    const isSelected = ((config.tags as LeadTag[]) || []).some(t => t.id === tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTagSelection(tag)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                          isSelected ? "bg-sky-50 border border-sky-200" : "hover:bg-muted/50"
                        }`}
                      >
                        <div
                          className="size-3 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="flex-1 text-sm">{tag.name}</span>
                        {isSelected && <CheckIcon className="size-4 text-sky-600" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Create new tag section */}
            {showCreateTag ? (
              <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Create new tag</span>
                  <button
                    type="button"
                    onClick={() => setShowCreateTag(false)}
                    className="size-6 rounded flex items-center justify-center hover:bg-muted"
                  >
                    <XIcon className="size-4" />
                  </button>
                </div>
                <Input
                  placeholder="Tag name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  maxLength={50}
                />
                <div className="flex gap-1.5 flex-wrap">
                  {TAG_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewTagColor(color)}
                      className={`size-6 rounded-full transition-all ${
                        newTagColor === color ? "ring-2 ring-offset-2 ring-sky-500" : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <Button
                  size="sm"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim() || creatingTag}
                  className="w-full"
                >
                  {creatingTag ? (
                    <Loader2Icon className="size-4 animate-spin mr-2" />
                  ) : (
                    <PlusIcon className="size-4 mr-2" />
                  )}
                  Create Tag
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreateTag(true)}
                className="flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 font-medium"
              >
                <PlusIcon className="size-4" />
                Create new tag
              </button>
            )}

            {/* Selected tags display */}
            {((config.tags as LeadTag[]) || []).length > 0 && (
              <div className="pt-2 border-t">
                <span className="text-xs text-muted-foreground">Selected:</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {((config.tags as LeadTag[]) || []).map(tag => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => toggleTagSelection(tag)}
                        className="hover:bg-white/20 rounded-full p-0.5"
                      >
                        <XIcon className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case "remove_tag":
        return (
          <div className="space-y-4">
            {/* Remove all checkbox */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="remove_all"
                checked={(config.remove_all as boolean) || false}
                onChange={(e) => {
                  updateConfig("remove_all", e.target.checked)
                  if (e.target.checked) {
                    updateConfig("tags", [])
                  }
                }}
                className="size-4 rounded border-gray-300"
              />
              <Label htmlFor="remove_all" className="font-normal">
                Remove ALL tags from lead
              </Label>
            </div>

            {!config.remove_all && (
              <>
                <Label>Or select specific tags to remove</Label>

                {/* Search input */}
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tags..."
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Tags list */}
                <div className="border rounded-lg max-h-48 overflow-auto">
                  {tagsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredTags.length === 0 ? (
                    <div className="py-6 text-center text-muted-foreground text-sm">
                      {tagSearchQuery ? "No tags match your search" : "No tags available"}
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {filteredTags.map(tag => {
                        const isSelected = ((config.tags as LeadTag[]) || []).some(t => t.id === tag.id)
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTagSelection(tag)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                              isSelected ? "bg-red-50 border border-red-200" : "hover:bg-muted/50"
                            }`}
                          >
                            <div
                              className="size-3 rounded-full shrink-0"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="flex-1 text-sm">{tag.name}</span>
                            {isSelected && <CheckIcon className="size-4 text-red-600" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Selected tags display */}
                {((config.tags as LeadTag[]) || []).length > 0 && (
                  <div className="pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Selected for removal:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {((config.tags as LeadTag[]) || []).map(tag => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                          <button
                            type="button"
                            onClick={() => toggleTagSelection(tag)}
                            className="hover:bg-white/20 rounded-full p-0.5"
                          >
                            <XIcon className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )

      default:
        return (
          <p className="text-muted-foreground">No configuration options for this action.</p>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure: {definition?.label || action.type}</DialogTitle>
        </DialogHeader>

        <div className="py-4">{renderForm()}</div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Action</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
