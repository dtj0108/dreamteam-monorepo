"use client"

import { useState, useEffect, useCallback } from "react"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@dreamteam/ui/alert-dialog"
import { XIcon, InfoIcon, Trash2Icon, Loader2, SearchIcon, PlusIcon, CheckIcon, TrophyIcon, XCircleIcon } from "lucide-react"

interface NylasGrant {
  id: string
  email: string
  provider: string
}

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
import type {
  WorkflowAction,
  TriggerType,
  ConditionActionConfig,
  WorkflowCondition,
  ConditionOperator,
} from "@/types/workflow"
import { getActionDefinition, CONDITION_OPERATORS } from "@/types/workflow"
import { ConditionFieldPicker } from "./condition-field-picker"
import { PipelineStagePicker } from "./pipeline-stage-picker"
import { DealSourceSelector, type DealSource } from "./deal-source-selector"
import { TemplateSelector } from "@/components/email-templates/template-selector"
import { SMSTemplateSelector } from "@/components/sms-templates"
import { getSegmentInfo, SMS_TEMPLATE_VARIABLES } from "@/types/sms-template"

interface ConfigSidePanelProps {
  action: WorkflowAction | null
  onClose: () => void
  onSave: (action: WorkflowAction) => void
  onDelete: (actionId: string) => void
  triggerType?: TriggerType
  allActions?: WorkflowAction[]  // For getting previous actions for condition checks
}

export function ConfigSidePanel({
  action,
  onClose,
  onSave,
  onDelete,
  triggerType = "lead_created",
  allActions = [],
}: ConfigSidePanelProps) {
  const [config, setConfig] = useState<Record<string, unknown>>({})
  const [emailGrants, setEmailGrants] = useState<NylasGrant[]>([])
  const [loadingGrants, setLoadingGrants] = useState(false)

  // Tag-related state
  const [availableTags, setAvailableTags] = useState<LeadTag[]>([])
  const [tagsLoading, setTagsLoading] = useState(false)
  const [tagSearchQuery, setTagSearchQuery] = useState("")
  const [showCreateTag, setShowCreateTag] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const [creatingTag, setCreatingTag] = useState(false)

  // Get actions that come before this action (for condition checking)
  const previousActions = action
    ? allActions.filter((a) => a.order < action.order && a.id !== action.id)
    : []

  // Fetch email grants when email action is selected
  const fetchEmailGrants = useCallback(async () => {
    setLoadingGrants(true)
    try {
      const res = await fetch('/api/nylas/grants')
      if (res.ok) {
        const data = await res.json()
        setEmailGrants(data.grants || [])
      }
    } catch (error) {
      console.error('Failed to fetch email grants:', error)
    } finally {
      setLoadingGrants(false)
    }
  }, [])

  // Fetch tags for tag-related actions
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
        setConfig(prev => ({ ...prev, tags: [...currentTags, newTag] }))
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
      setConfig(prev => ({ ...prev, tags: currentTags.filter(t => t.id !== tag.id) }))
    } else {
      setConfig(prev => ({ ...prev, tags: [...currentTags, tag] }))
    }
  }

  // Filter tags by search query
  const filteredTags = availableTags.filter(tag =>
    tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
  )

  useEffect(() => {
    if (action) {
      setConfig(action.config || {})
      // Fetch grants for email action
      if (action.type === 'send_email') {
        fetchEmailGrants()
      }
      // Fetch tags for tag actions
      if (action.type === 'add_tag' || action.type === 'remove_tag') {
        fetchTags()
        setTagSearchQuery("")
        setShowCreateTag(false)
        setNewTagName("")
        setNewTagColor(TAG_COLORS[0])
      }
    }
  }, [action, fetchEmailGrants, fetchTags])

  if (!action) return null

  const definition = getActionDefinition(action.type)

  const handleSave = () => {
    onSave({ ...action, config })
    onClose()
  }

  const updateConfig = (key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const renderContextInfo = () => {
    // Communication actions - show recipient info
    if (["send_sms", "send_email", "send_notification"].includes(action.type)) {
      return (
        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Recipient:</span>
            <span className="text-muted-foreground">Contact that triggers it</span>
            <InfoIcon className="size-3 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-muted-foreground">↳</span>
            <span>Run Workflow once per Contact</span>
          </div>
        </div>
      )
    }

    // CRM/Lead actions - show lead context
    if (["update_status", "add_note", "assign_user", "add_tag", "remove_tag", "move_lead_stage"].includes(action.type)) {
      return (
        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Applies to:</span>
            <span className="text-muted-foreground">Lead that triggers the workflow</span>
            <InfoIcon className="size-3 text-muted-foreground" />
          </div>
        </div>
      )
    }

    // Task creation - show where task is created
    if (action.type === "create_task") {
      return (
        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Creates task for:</span>
            <span className="text-muted-foreground">Lead that triggers the workflow</span>
            <InfoIcon className="size-3 text-muted-foreground" />
          </div>
        </div>
      )
    }

    // Deal/Opportunity actions - show deal context
    if (["create_deal", "update_deal", "move_deal_stage", "close_deal"].includes(action.type)) {
      return (
        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Applies to:</span>
            <span className="text-muted-foreground">
              {action.type === "create_deal" ? "Lead that triggers the workflow" : "Opportunity"}
            </span>
            <InfoIcon className="size-3 text-muted-foreground" />
          </div>
        </div>
      )
    }

    // Flow control actions (wait, condition) - no context info needed
    return null
  }

  const renderForm = () => {
    switch (action.type) {
      case "send_email":
        return (
          <div className="space-y-4">
            {/* Template Selector */}
            <div className="space-y-2">
              <Label>Use Template (optional)</Label>
              <TemplateSelector
                value={config.template_id as string | undefined}
                onSelect={(templateId, template) => {
                  updateConfig("template_id", templateId)
                  if (template) {
                    updateConfig("subject", template.subject)
                    updateConfig("body", template.body)
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Select a template to auto-fill subject and body
              </p>
            </div>

            {/* Email Account Selector */}
            <div className="space-y-2">
              <Label htmlFor="nylas_grant_id">Send From</Label>
              {loadingGrants ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading accounts...
                </div>
              ) : emailGrants.length > 0 ? (
                <Select
                  value={(config.nylas_grant_id as string) || "default"}
                  onValueChange={(v) => updateConfig("nylas_grant_id", v === "default" ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Use default account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Use default account</SelectItem>
                    {emailGrants.map((grant) => (
                      <SelectItem key={grant.id} value={grant.id}>
                        {grant.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No email accounts connected. Will use default account.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient">To</Label>
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

            {/* CC and BCC */}
            <div className="space-y-2">
              <Label htmlFor="email_cc">CC</Label>
              <Input
                id="email_cc"
                value={(config.email_cc as string) || ""}
                onChange={(e) => updateConfig("email_cc", e.target.value)}
                placeholder="cc1@example.com, cc2@example.com"
              />
              <p className="text-xs text-muted-foreground">Separate multiple emails with commas</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email_bcc">BCC</Label>
              <Input
                id="email_bcc"
                value={(config.email_bcc as string) || ""}
                onChange={(e) => updateConfig("email_bcc", e.target.value)}
                placeholder="bcc@example.com"
              />
            </div>

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

      case "send_sms": {
        const messageText = (config.message as string) || ""
        const segmentInfo = getSegmentInfo(messageText)

        return (
          <div className="space-y-4">
            {/* Template Selector */}
            <div className="space-y-2">
              <Label>Use Template (optional)</Label>
              <SMSTemplateSelector
                value={config.template_id as string | undefined}
                onSelect={(templateId, template) => {
                  updateConfig("template_id", templateId)
                  if (template) {
                    updateConfig("message", template.body)
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Select a template to auto-fill the message
              </p>
            </div>

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
                value={messageText}
                onChange={(e) => updateConfig("message", e.target.value)}
                placeholder="SMS message content..."
                rows={3}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {segmentInfo.charCount} chars • {segmentInfo.segments} segment{segmentInfo.segments !== 1 ? "s" : ""} ({segmentInfo.encoding})
                </span>
                <span>{segmentInfo.remaining} remaining</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Use {SMS_TEMPLATE_VARIABLES.slice(0, 3).map(v => v.variable).join(", ")} for dynamic content
              </p>
            </div>
          </div>
        )
      }

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
                  placeholder="User ID"
                />
              </div>
            )}
          </div>
        )

      case "wait":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wait_duration">Wait Duration</Label>
              <div className="flex gap-2">
                <Input
                  id="wait_duration"
                  type="number"
                  min={1}
                  value={(config.wait_duration as number) || 1}
                  onChange={(e) => updateConfig("wait_duration", parseInt(e.target.value) || 1)}
                  className="flex-1"
                />
                <Select
                  value={(config.wait_unit as string) || "hours"}
                  onValueChange={(v) => updateConfig("wait_unit", v)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                The workflow will pause and resume after this time
              </p>
            </div>
          </div>
        )

      case "condition": {
        // Initialize condition config if not present
        const condConfig = config as Partial<ConditionActionConfig>
        const condition = condConfig.condition || {} as Partial<WorkflowCondition>
        const ifBranchCount = (condConfig.if_branch || []).length
        const elseBranchCount = (condConfig.else_branch || []).length

        const updateCondition = (updates: Partial<WorkflowCondition>) => {
          setConfig((prev) => ({
            ...prev,
            condition: { ...(prev.condition as WorkflowCondition || {}), ...updates },
            if_branch: (prev as unknown as ConditionActionConfig).if_branch || [],
            else_branch: (prev as unknown as ConditionActionConfig).else_branch || [],
          }))
        }

        // Get the operator definition to check if value is required
        const selectedOperator = CONDITION_OPERATORS.find(
          (op) => op.operator === condition.operator
        )
        const requiresValue = selectedOperator?.requiresValue ?? true

        return (
          <div className="space-y-4">
            {/* Field selector */}
            <div className="space-y-2">
              <Label>Field to check</Label>
              <ConditionFieldPicker
                triggerType={triggerType}
                value={
                  condition.field_path
                    ? {
                        source: condition.field_source || "trigger",
                        path: condition.field_path,
                        fieldId: condition.field_id,
                      }
                    : null
                }
                onChange={(field) =>
                  updateCondition({
                    field_source: field.source,
                    field_path: field.path,
                    field_id: field.fieldId,
                  })
                }
                previousActions={previousActions}
              />
            </div>

            {/* Operator selector */}
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select
                value={condition.operator || ""}
                onValueChange={(v) => updateCondition({ operator: v as ConditionOperator })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select comparison" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPERATORS.map((op) => (
                    <SelectItem key={op.operator} value={op.operator}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Value input (only shown if operator requires a value) */}
            {requiresValue && (
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  value={condition.value || ""}
                  onChange={(e) => updateCondition({ value: e.target.value })}
                  placeholder="Enter value to compare"
                />
              </div>
            )}

            {/* Branch summary */}
            <div className="mt-4 pt-4 border-t space-y-2">
              <p className="text-sm font-medium">Branches</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-green-600 font-medium">If True</p>
                  <p className="text-lg font-semibold text-green-700">{ifBranchCount}</p>
                  <p className="text-xs text-green-600">
                    {ifBranchCount === 1 ? "action" : "actions"}
                  </p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-orange-600 font-medium">Else</p>
                  <p className="text-lg font-semibold text-orange-700">{elseBranchCount}</p>
                  <p className="text-xs text-orange-600">
                    {elseBranchCount === 1 ? "action" : "actions"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Add actions to each branch in the workflow canvas
              </p>
            </div>
          </div>
        )
      }

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
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
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
                    <Loader2 className="size-4 animate-spin mr-2" />
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
                  setConfig(prev => ({
                    ...prev,
                    remove_all: e.target.checked,
                    tags: e.target.checked ? [] : prev.tags,
                  }))
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
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
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

      case "move_lead_stage":
        return (
          <div className="space-y-4">
            <PipelineStagePicker
              pipelineId={config.pipeline_id as string | undefined}
              stageId={config.stage_id as string | undefined}
              onPipelineChange={(id) => updateConfig("pipeline_id", id)}
              onStageChange={(id, stageName) => {
                updateConfig("stage_id", id)
                updateConfig("stage_name", stageName)
              }}
              showStageSelector={true}
              stageRequired={true}
            />
          </div>
        )

      case "create_deal":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deal_name">Opportunity Name</Label>
              <Input
                id="deal_name"
                value={(config.name as string) || ""}
                onChange={(e) => updateConfig("name", e.target.value)}
                placeholder="New opportunity from {{lead_name}}"
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{lead_name}}"}, {"{{contact_name}}"} for dynamic content
              </p>
            </div>

            <PipelineStagePicker
              pipelineId={config.pipeline_id as string | undefined}
              stageId={config.stage_id as string | undefined}
              onPipelineChange={(id) => updateConfig("pipeline_id", id)}
              onStageChange={(id) => updateConfig("stage_id", id)}
              showStageSelector={true}
              stageRequired={false}
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="deal_value">Value</Label>
                <Input
                  id="deal_value"
                  type="number"
                  min={0}
                  value={(config.value as number) || ""}
                  onChange={(e) => updateConfig("value", e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deal_currency">Currency</Label>
                <Select
                  value={(config.currency as string) || "USD"}
                  onValueChange={(v) => updateConfig("currency", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="USD" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_close_offset">Expected Close (days from now)</Label>
              <Input
                id="expected_close_offset"
                type="number"
                min={0}
                value={(config.expected_close_date_offset as number) || ""}
                onChange={(e) => updateConfig("expected_close_date_offset", e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="30"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="link_to_trigger_contact"
                checked={(config.link_to_trigger_contact as boolean) ?? true}
                onChange={(e) => updateConfig("link_to_trigger_contact", e.target.checked)}
                className="size-4 rounded border-gray-300"
              />
              <Label htmlFor="link_to_trigger_contact" className="font-normal">
                Link to trigger contact
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deal_notes">Notes</Label>
              <Textarea
                id="deal_notes"
                value={(config.notes as string) || ""}
                onChange={(e) => updateConfig("notes", e.target.value)}
                placeholder="Add notes about this opportunity..."
                rows={3}
              />
            </div>
          </div>
        )

      case "update_deal":
        return (
          <div className="space-y-4">
            <DealSourceSelector
              value={(config.deal_source as DealSource) || "trigger"}
              onChange={(v) => updateConfig("deal_source", v)}
              triggerType={triggerType}
            />

            <div className="space-y-2">
              <Label htmlFor="update_value">Value (optional)</Label>
              <Input
                id="update_value"
                type="number"
                min={0}
                value={(config.value as number) ?? ""}
                onChange={(e) => updateConfig("value", e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="Leave empty to keep current"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="update_probability">Probability % (optional)</Label>
              <Input
                id="update_probability"
                type="number"
                min={0}
                max={100}
                value={(config.probability as number) ?? ""}
                onChange={(e) => updateConfig("probability", e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="0-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="update_close_offset">Expected Close (days from now)</Label>
              <Input
                id="update_close_offset"
                type="number"
                min={0}
                value={(config.expected_close_date_offset as number) ?? ""}
                onChange={(e) => updateConfig("expected_close_date_offset", e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Leave empty to keep current"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="update_notes">Notes</Label>
              <Textarea
                id="update_notes"
                value={(config.notes as string) || ""}
                onChange={(e) => updateConfig("notes", e.target.value)}
                placeholder="Add notes..."
                rows={3}
              />
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="notes_mode"
                    value="append"
                    checked={(config.notes_mode as string) !== "replace"}
                    onChange={() => updateConfig("notes_mode", "append")}
                  />
                  Append to existing
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="notes_mode"
                    value="replace"
                    checked={(config.notes_mode as string) === "replace"}
                    onChange={() => updateConfig("notes_mode", "replace")}
                  />
                  Replace existing
                </label>
              </div>
            </div>
          </div>
        )

      case "move_deal_stage":
        return (
          <div className="space-y-4">
            <DealSourceSelector
              value={(config.deal_source as DealSource) || "trigger"}
              onChange={(v) => updateConfig("deal_source", v)}
              triggerType={triggerType}
            />

            <PipelineStagePicker
              pipelineId={config.pipeline_id as string | undefined}
              stageId={config.stage_id as string | undefined}
              onPipelineChange={(id) => updateConfig("pipeline_id", id)}
              onStageChange={(id) => updateConfig("stage_id", id)}
              showStageSelector={true}
              stageRequired={true}
            />

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto_update_probability"
                checked={(config.auto_update_probability as boolean) ?? true}
                onChange={(e) => updateConfig("auto_update_probability", e.target.checked)}
                className="size-4 rounded border-gray-300"
              />
              <Label htmlFor="auto_update_probability" className="font-normal">
                Auto-update probability from stage
              </Label>
            </div>
          </div>
        )

      case "close_deal":
        return (
          <div className="space-y-4">
            <DealSourceSelector
              value={(config.deal_source as DealSource) || "trigger"}
              onChange={(v) => updateConfig("deal_source", v)}
              triggerType={triggerType}
            />

            <div className="space-y-2">
              <Label>Outcome</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateConfig("outcome", "won")}
                  className={`
                    flex flex-col items-center gap-2 p-4 border rounded-lg transition-all
                    ${(config.outcome as string) === "won"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-border hover:border-green-300 hover:bg-green-50/50"
                    }
                  `}
                >
                  <TrophyIcon className="size-6" />
                  <span className="font-medium">Won</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateConfig("outcome", "lost")}
                  className={`
                    flex flex-col items-center gap-2 p-4 border rounded-lg transition-all
                    ${(config.outcome as string) === "lost"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-border hover:border-red-300 hover:bg-red-50/50"
                    }
                  `}
                >
                  <XCircleIcon className="size-6" />
                  <span className="font-medium">Lost</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="close_reason">Close Reason / Notes</Label>
              <Textarea
                id="close_reason"
                value={(config.close_reason as string) || ""}
                onChange={(e) => updateConfig("close_reason", e.target.value)}
                placeholder="Reason for winning/losing this opportunity..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto_set_close_date"
                checked={(config.auto_set_close_date as boolean) ?? true}
                onChange={(e) => updateConfig("auto_set_close_date", e.target.checked)}
                className="size-4 rounded border-gray-300"
              />
              <Label htmlFor="auto_set_close_date" className="font-normal">
                Set close date to today
              </Label>
            </div>
          </div>
        )

      case "log_activity":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="activity_type">Activity Type</Label>
              <Select
                value={(config.activity_type as string) || "note"}
                onValueChange={(v) => updateConfig("activity_type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select activity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity_subject">Subject</Label>
              <Input
                id="activity_subject"
                value={(config.activity_subject as string) || ""}
                onChange={(e) => updateConfig("activity_subject", e.target.value)}
                placeholder="Activity subject"
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{contact_first_name}}"}, {"{{lead_name}}"} for dynamic content
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity_description">Description (optional)</Label>
              <Textarea
                id="activity_description"
                value={(config.activity_description as string) || ""}
                onChange={(e) => updateConfig("activity_description", e.target.value)}
                placeholder="Additional details about the activity..."
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="activity_completed"
                checked={(config.activity_completed as boolean) ?? true}
                onChange={(e) => updateConfig("activity_completed", e.target.checked)}
                className="size-4 rounded border-gray-300"
              />
              <Label htmlFor="activity_completed" className="font-normal">
                Mark as completed
              </Label>
            </div>
          </div>
        )

      default:
        return (
          <p className="text-muted-foreground">No configuration options for this action.</p>
        )
    }
  }

  return (
    <div className="w-full md:w-96 fixed inset-y-0 right-0 md:relative md:inset-auto border-l bg-background flex flex-col h-full z-50 shadow-lg md:shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold">{definition?.label || action.type}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <XIcon className="size-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Context info - varies by action type */}
        {renderContextInfo()}

        {/* Form fields */}
        {renderForm()}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2Icon className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this action?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the "{definition?.label || action.type}" action from your workflow.
                This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(action.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Done</Button>
        </div>
      </div>
    </div>
  )
}
