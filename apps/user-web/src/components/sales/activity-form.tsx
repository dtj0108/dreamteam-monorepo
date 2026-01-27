"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ActivityAssigneePicker, WorkspaceMember } from "@/components/sales/activity-assignee-picker"

export interface Activity {
  id?: string
  type: "call" | "email" | "meeting" | "note" | "task"
  subject?: string
  description?: string
  contact_id?: string
  due_date?: string
  is_completed?: boolean
  assignees?: string[]
}

interface Contact {
  id?: string
  first_name: string
  last_name?: string
}

interface ActivityFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contacts: Contact[]
  members?: WorkspaceMember[]
  currentUserId?: string
  activity?: Activity
  onSubmit: (activity: Activity) => Promise<void>
  defaultType?: "call" | "email" | "meeting" | "note" | "task"
}

const activityTypes = [
  { value: "call", label: "Phone Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "note", label: "Note" },
  { value: "task", label: "Task" },
]

export function ActivityForm({ open, onOpenChange, contacts, members = [], currentUserId, activity, onSubmit, defaultType }: ActivityFormProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [formData, setFormData] = React.useState<Activity>({
    type: "call",
    subject: "",
    description: "",
    contact_id: "",
    due_date: "",
    is_completed: false,
    assignees: [],
  })

  React.useEffect(() => {
    if (activity) {
      setFormData({
        ...activity,
        assignees: activity.assignees || [],
      })
    } else {
      const firstContactWithId = contacts.find(c => c.id)
      setFormData({
        type: defaultType || "call",
        subject: "",
        description: "",
        contact_id: firstContactWithId?.id || "",
        due_date: "",
        is_completed: false,
        // Default to current user when creating a new activity
        assignees: currentUserId ? [currentUserId] : [],
      })
    }
  }, [activity, open, contacts, defaultType, currentUserId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!formData.subject?.trim()) {
      return
    }
    if (!formData.description?.trim()) {
      return
    }
    if (!formData.due_date) {
      return
    }

    setIsLoading(true)
    try {
      await onSubmit(formData)
      onOpenChange(false)
    } catch (error) {
      console.error("Error submitting activity:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{activity ? "Edit Activity" : "Log Activity"}</DialogTitle>
          <DialogDescription>
            {activity
              ? "Update the activity details below."
              : "Log a new activity for this lead."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as Activity["type"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contact">Contact</Label>
                <Select
                  value={formData.contact_id || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, contact_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.filter(c => c.id).map((contact) => (
                      <SelectItem key={contact.id} value={contact.id!}>
                        {contact.first_name} {contact.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={formData.subject || ""}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="Brief summary of the activity"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Add details about the activity..."
                rows={3}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="due_date">Due Date *</Label>
              <Input
                id="due_date"
                type="datetime-local"
                value={formData.due_date || ""}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
                required
              />
            </div>

            {members.length > 0 && (
              <div className="grid gap-2">
                <Label>Assignees</Label>
                <ActivityAssigneePicker
                  members={members}
                  selectedIds={formData.assignees || []}
                  onChange={(ids) => setFormData({ ...formData, assignees: ids })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.subject?.trim() || !formData.description?.trim() || !formData.due_date}
            >
              {isLoading ? "Saving..." : activity ? "Update Activity" : "Log Activity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
