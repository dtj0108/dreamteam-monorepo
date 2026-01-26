"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useAgents } from "@/providers/agents-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import type { AgentScheduleExecution, ScheduleExecutionStatus } from "@/lib/types/agents"

interface ActivitySectionProps {
  agentId: string
}

const statusConfig: Record<ScheduleExecutionStatus, {
  label: string
  icon: React.ElementType
  variant: "default" | "secondary" | "destructive" | "outline"
}> = {
  pending_approval: { label: "Pending", icon: Clock, variant: "secondary" },
  approved: { label: "Approved", icon: CheckCircle2, variant: "default" },
  rejected: { label: "Rejected", icon: XCircle, variant: "destructive" },
  running: { label: "Running", icon: Play, variant: "secondary" },
  completed: { label: "Completed", icon: CheckCircle2, variant: "default" },
  failed: { label: "Failed", icon: AlertCircle, variant: "destructive" },
  cancelled: { label: "Cancelled", icon: XCircle, variant: "outline" },
}

export function ActivitySection({ agentId }: ActivitySectionProps) {
  const { executions, fetchActivity, isLoadingActivity } = useAgents()

  // Fetch activity for this agent
  useEffect(() => {
    fetchActivity({ agent_id: agentId, limit: 20 })
  }, [fetchActivity, agentId])

  // Filter executions for this agent
  const agentExecutions = executions.filter(
    e => e.agent_id === agentId
  )

  if (isLoadingActivity) {
    return (
      <div className="space-y-4">
        <div>
          <Skeleton className="h-6 w-24 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Activity</h2>
          <p className="text-sm text-muted-foreground">
            Recent task executions for this agent
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/agents/activity?agent=${agentId}`}>
            View All
            <ExternalLink className="size-3 ml-2" />
          </Link>
        </Button>
      </div>

      {agentExecutions.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <Activity className="size-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-medium mb-1">No activity yet</h3>
          <p className="text-sm text-muted-foreground">
            Task executions will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {agentExecutions.slice(0, 10).map(execution => (
            <ExecutionCard key={execution.id} execution={execution} />
          ))}
        </div>
      )}
    </div>
  )
}

function ExecutionCard({ execution }: { execution: AgentScheduleExecution }) {
  const config = statusConfig[execution.status]
  const StatusIcon = config.icon

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-sm">
            {execution.schedule?.name || "Manual execution"}
          </h4>
          <p className="text-xs text-muted-foreground">
            {execution.scheduled_for
              ? new Date(execution.scheduled_for).toLocaleString()
              : new Date(execution.created_at).toLocaleString()}
          </p>
        </div>
        <Badge variant={config.variant} className="gap-1">
          <StatusIcon className="size-3" />
          {config.label}
        </Badge>
      </div>

      {execution.schedule?.task_prompt && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {execution.schedule.task_prompt}
        </p>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {execution.duration_ms && (
          <span>Duration: {(execution.duration_ms / 1000).toFixed(1)}s</span>
        )}
        {execution.tokens_input != null && execution.tokens_output != null && (
          <span>
            Tokens: {execution.tokens_input.toLocaleString()} in / {execution.tokens_output.toLocaleString()} out
          </span>
        )}
      </div>

      {execution.error_message && (
        <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {execution.error_message}
        </div>
      )}

      {execution.result && Object.keys(execution.result).length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            View result
          </summary>
          <pre className="mt-2 p-2 bg-muted rounded-md overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(execution.result, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}
