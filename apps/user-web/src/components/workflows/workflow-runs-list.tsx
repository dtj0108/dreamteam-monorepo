"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  XCircleIcon,
  Loader2Icon,
  PauseCircleIcon,
  InboxIcon,
} from "lucide-react"
import { useWorkflowRuns } from "@/hooks/use-workflow-runs"
import { WorkflowRunDetails } from "@/components/workflows/workflow-run-details"
import type { WorkflowExecution } from "@/types/workflow"
import { getTriggerDefinition } from "@/types/workflow"

interface WorkflowRunsListProps {
  workflowId: string
}

function getStatusIcon(status: WorkflowExecution['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="size-4 text-green-600" />
    case 'failed':
      return <XCircleIcon className="size-4 text-red-600" />
    case 'running':
      return <Loader2Icon className="size-4 text-blue-600 animate-spin" />
    case 'paused':
      return <PauseCircleIcon className="size-4 text-yellow-600" />
    default:
      return null
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
  if (!completedAt) return '-'

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

function formatTriggerInfo(execution: WorkflowExecution): string {
  const trigger = getTriggerDefinition(execution.trigger_type as any)
  const triggerLabel = trigger?.label || execution.trigger_type

  // Try to get a name from the context
  const ctx = execution.trigger_context || {}
  const name = ctx.lead_name || ctx.leadName || ctx.contact_name || ctx.contactName || ctx.deal_name || ctx.dealName

  if (name) {
    return `${triggerLabel}: ${String(name).substring(0, 30)}`
  }

  return triggerLabel
}

function RunRow({
  execution,
  isExpanded,
  onToggle,
}: {
  execution: WorkflowExecution
  isExpanded: boolean
  onToggle: () => void
}) {
  const actionCount = execution.action_results?.length || 0
  const successCount = execution.action_results?.filter(r => r.success).length || 0

  return (
    <div className="border-b last:border-b-0">
      <div
        className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        {/* Expand/Collapse button */}
        <button className="text-muted-foreground hover:text-foreground">
          {isExpanded ? (
            <ChevronUpIcon className="size-4" />
          ) : (
            <ChevronDownIcon className="size-4" />
          )}
        </button>

        {/* Status */}
        <div className="flex items-center gap-2 w-28">
          {getStatusIcon(execution.status)}
          <Badge variant={getStatusBadgeVariant(execution.status)} className="text-xs">
            {execution.status === 'completed' ? 'Success' :
             execution.status === 'failed' ? 'Failed' :
             execution.status === 'running' ? 'Running' :
             execution.status === 'paused' ? 'Paused' :
             execution.status}
          </Badge>
        </div>

        {/* Trigger info */}
        <div className="flex-1 min-w-0">
          <span className="text-sm truncate">{formatTriggerInfo(execution)}</span>
        </div>

        {/* Started at */}
        <div className="text-sm text-muted-foreground w-32">
          {formatDistanceToNow(new Date(execution.started_at), { addSuffix: true })}
        </div>

        {/* Duration */}
        <div className="text-sm text-muted-foreground w-20 text-right">
          {execution.status === 'paused' ? 'Waiting...' : formatDuration(execution.started_at, execution.completed_at)}
        </div>

        {/* Actions count */}
        <div className="text-sm text-muted-foreground w-24 text-right">
          {actionCount > 0 ? (
            <span className={execution.status === 'failed' ? 'text-red-600' : ''}>
              {successCount}/{actionCount} actions
            </span>
          ) : (
            <span>-</span>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <WorkflowRunDetails execution={execution} />
        </div>
      )}
    </div>
  )
}

export function WorkflowRunsList({ workflowId }: WorkflowRunsListProps) {
  const { runs, total, isLoading, error, page, setPage, refresh, hasNextPage, hasPrevPage } = useWorkflowRuns(workflowId)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refresh()
    setIsRefreshing(false)
  }

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  if (isLoading && runs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <XCircleIcon className="size-12 text-red-400 mb-4" />
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCwIcon className="size-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <InboxIcon className="size-12 text-muted-foreground/50 mb-4" />
        <h3 className="font-medium text-lg mb-2">No runs yet</h3>
        <p className="text-muted-foreground max-w-sm">
          This workflow hasn't been triggered yet. Runs will appear here once the workflow is activated and triggered.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {total} total run{total === 1 ? '' : 's'}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCwIcon className={`size-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Table header */}
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b">
          <div className="w-4" /> {/* Expand column */}
          <div className="w-28">Status</div>
          <div className="flex-1">Trigger</div>
          <div className="w-32">Started</div>
          <div className="w-20 text-right">Duration</div>
          <div className="w-24 text-right">Actions</div>
        </div>

        {/* Runs list */}
        <div className={isLoading ? 'opacity-50' : ''}>
          {runs.map((execution) => (
            <RunRow
              key={execution.id}
              execution={execution}
              isExpanded={expandedId === execution.id}
              onToggle={() => toggleExpanded(execution.id)}
            />
          ))}
        </div>
      </div>

      {/* Pagination */}
      {(hasNextPage || hasPrevPage) && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {page * 20 + 1}-{Math.min((page + 1) * 20, total)} of {total}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={!hasPrevPage || isLoading}
            >
              <ChevronLeftIcon className="size-4 mr-1" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={!hasNextPage || isLoading}
            >
              Next
              <ChevronRightIcon className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
