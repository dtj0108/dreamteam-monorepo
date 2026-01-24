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
import { XIcon, InfoIcon, Trash2Icon, Loader2 } from "lucide-react"

interface NylasGrant {
  id: string
  email: string
  provider: string
}
import type {
  WorkflowAction,
  TriggerType,
  ConditionActionConfig,
  WorkflowCondition,
  ConditionOperator,
} from "@/types/workflow"
import { getActionDefinition, CONDITION_OPERATORS } from "@/types/workflow"
import { ConditionFieldPicker } from "./condition-field-picker"

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

  useEffect(() => {
    if (action) {
      setConfig(action.config || {})
      // Fetch grants for email action
      if (action.type === 'send_email') {
        fetchEmailGrants()
      }
    }
  }, [action, fetchEmailGrants])

  if (!action) return null

  const definition = getActionDefinition(action.type)

  const handleSave = () => {
    onSave({ ...action, config })
    onClose()
  }

  const updateConfig = (key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const renderForm = () => {
    switch (action.type) {
      case "send_email":
        return (
          <div className="space-y-4">
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
                {160 - ((config.message as string)?.length || 0)} characters remaining
              </p>
            </div>
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
                  placeholder="User ID"
                />
              </div>
            )}
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
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="record"
                checked={(config.record as boolean) ?? true}
                onChange={(e) => updateConfig("record", e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="record">Record call</Label>
            </div>
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
        {/* Recipient info */}
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
