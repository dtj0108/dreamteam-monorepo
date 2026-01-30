"use client"

import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircleIcon,
  XCircleIcon,
  CircleIcon,
  ClockIcon,
  AlertCircleIcon,
} from "lucide-react"
import type { WorkflowExecution, ExecutionResult } from "@/types/workflow"
import { getActionDefinition, getTriggerDefinition } from "@/types/workflow"
import * as LucideIcons from "lucide-react"

interface WorkflowRunDetailsProps {
  execution: WorkflowExecution
}

function getStatusIcon(status: WorkflowExecution['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="size-5 text-green-600" />
    case 'failed':
      return <XCircleIcon className="size-5 text-red-600" />
    case 'running':
      return <ClockIcon className="size-5 text-blue-600 animate-spin" />
    case 'paused':
      return <AlertCircleIcon className="size-5 text-yellow-600" />
    default:
      return <CircleIcon className="size-5 text-muted-foreground" />
  }
}

function getStatusBadgeVariant(status: WorkflowExecution['status']): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'completed':
      return 'default'
    case 'failed':
      return 'destructive'
    case 'running':
      return 'secondary'
    case 'paused':
      return 'outline'
    default:
      return 'outline'
  }
}

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return 'In progress...'

  const start = new Date(startedAt).getTime()
  const end = new Date(completedAt).getTime()
  const durationMs = end - start

  if (durationMs < 1000) {
    return `${durationMs}ms`
  } else if (durationMs < 60000) {
    return `${(durationMs / 1000).toFixed(1)}s`
  } else {
    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.round((durationMs % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }
}

function formatTriggerContext(triggerType: string, context: Record<string, unknown>): string {
  const trigger = getTriggerDefinition(triggerType as any)
  const triggerLabel = trigger?.label || triggerType

  // Try to extract a meaningful name from the context
  const leadName = context.lead_name || context.leadName
  const contactName = context.contact_name || context.contactName
  const dealName = context.deal_name || context.dealName
  const entityName = leadName || contactName || dealName

  if (entityName) {
    return `${triggerLabel}: ${entityName}`
  }

  return triggerLabel
}

function ActionResultItem({ result, index }: { result: ExecutionResult; index: number }) {
  const action = getActionDefinition(result.actionType)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = action?.icon ? (LucideIcons as any)[action.icon] as React.ComponentType<{ className?: string }> | undefined : null

  return (
    <div className="flex gap-3 py-3 border-b last:border-b-0">
      <div className="flex flex-col items-center">
        <div className={`size-6 rounded-full flex items-center justify-center ${
          result.success
            ? 'bg-green-100 text-green-600'
            : 'bg-red-100 text-red-600'
        }`}>
          {result.success ? (
            <CheckCircleIcon className="size-4" />
          ) : (
            <XCircleIcon className="size-4" />
          )}
        </div>
        {/* Connector line (not for last item) */}
        <div className="w-0.5 flex-1 bg-muted-foreground/20 mt-1" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {IconComponent && <IconComponent className="size-4 text-muted-foreground" />}
          <span className="font-medium text-sm">{action?.label || result.actionType}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(result.executedAt), 'HH:mm:ss')}
          </span>
        </div>

        {result.error && (
          <div className="mt-1 text-sm text-red-600 bg-red-50 px-2 py-1 rounded">
            {result.error}
          </div>
        )}

        {result.data && Object.keys(result.data).length > 0 && (
          <div className="mt-1 text-xs text-muted-foreground">
            {formatResultData(result.actionType, result.data)}
          </div>
        )}
      </div>
    </div>
  )
}

function formatResultData(actionType: string, data: Record<string, unknown>): string {
  switch (actionType) {
    case 'send_sms':
      return data.phone ? `Sent to ${data.phone}` : 'SMS sent'
    case 'send_email':
      return data.email ? `Sent to ${data.email}` : 'Email sent'
    case 'create_task':
      return data.title ? `Created: "${data.title}"` : 'Task created'
    case 'add_note':
      return data.note ? `"${String(data.note).substring(0, 50)}..."` : 'Note added'
    case 'wait':
      return data.duration ? `Waited ${data.duration}` : 'Wait completed'
    default:
      // For other actions, show first key-value pair
      const firstKey = Object.keys(data)[0]
      if (firstKey) {
        return `${firstKey}: ${String(data[firstKey]).substring(0, 50)}`
      }
      return 'Action completed'
  }
}

export function WorkflowRunDetails({ execution }: WorkflowRunDetailsProps) {
  return (
    <div className="border rounded-lg bg-muted/30 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            {getStatusIcon(execution.status)}
            <span className="font-medium">Run #{execution.id.slice(0, 8)}</span>
            <Badge variant={getStatusBadgeVariant(execution.status)}>
              {execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            <span>Started: {format(new Date(execution.started_at), 'MMM d, yyyy h:mm a')}</span>
            <span className="mx-2">|</span>
            <span>Duration: {formatDuration(execution.started_at, execution.completed_at)}</span>
          </div>
        </div>
      </div>

      {/* Trigger info */}
      <div className="bg-background rounded p-3 border">
        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Trigger</div>
        <div className="font-medium text-sm">
          {formatTriggerContext(execution.trigger_type, execution.trigger_context)}
        </div>
        {execution.trigger_context && Object.keys(execution.trigger_context).length > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            {Object.entries(execution.trigger_context).slice(0, 5).map(([key, value]) => {
              // Format the value appropriately
              let displayValue: string
              if (value === null || value === undefined) {
                displayValue = '-'
              } else if (typeof value === 'object') {
                // For objects, try to extract a meaningful name
                const obj = value as Record<string, unknown>
                const extracted = obj.name || obj.title || obj.id
                displayValue = typeof extracted === 'string' ? extracted : JSON.stringify(value).substring(0, 30)
              } else {
                displayValue = String(value).substring(0, 30)
              }
              return (
                <span key={key} className="mr-3">
                  {key}: {displayValue}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* Error message */}
      {execution.error_message && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <div className="text-xs text-red-600 uppercase tracking-wide mb-1">Error</div>
          <div className="text-sm text-red-700">{execution.error_message}</div>
        </div>
      )}

      {/* Actions timeline */}
      {execution.action_results && execution.action_results.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
            Actions Timeline ({execution.action_results.length} executed)
          </div>
          <div className="bg-background rounded border p-3">
            {execution.action_results.map((result, index) => (
              <ActionResultItem key={result.actionId || index} result={result} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Empty actions state */}
      {(!execution.action_results || execution.action_results.length === 0) && (
        <div className="bg-background rounded border p-4 text-center text-muted-foreground text-sm">
          No actions executed yet
        </div>
      )}
    </div>
  )
}
