"use client"

import { useState, useEffect } from "react"
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
import type { WorkflowAction } from "@/types/workflow"
import { getActionDefinition } from "@/types/workflow"

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

  useEffect(() => {
    if (action) {
      setConfig(action.config || {})
    }
  }, [action])

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
