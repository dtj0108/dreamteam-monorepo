"use client"

import { useEffect, useState } from "react"
import { useAgents } from "@/providers/agents-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  AlertCircle,
  Sparkles,
  Filter,
} from "lucide-react"
import type { AgentScheduleExecution, ScheduleExecutionStatus } from "@/lib/types/agents"

const statusConfig: Record<ScheduleExecutionStatus, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_approval: { label: "Pending", icon: Clock, variant: "secondary" },
  approved: { label: "Approved", icon: CheckCircle2, variant: "default" },
  rejected: { label: "Rejected", icon: XCircle, variant: "destructive" },
  running: { label: "Running", icon: Play, variant: "secondary" },
  completed: { label: "Completed", icon: CheckCircle2, variant: "default" },
  failed: { label: "Failed", icon: AlertCircle, variant: "destructive" },
  cancelled: { label: "Cancelled", icon: XCircle, variant: "outline" },
}

function ExecutionCard({ execution }: { execution: AgentScheduleExecution }) {
  const config = statusConfig[execution.status]
  const StatusIcon = config.icon

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-xl">
              {execution.agent?.avatar_url || <Sparkles className="size-5 text-muted-foreground" />}
            </div>
            <div>
              <CardTitle className="text-base">{execution.agent?.name || "Unknown Agent"}</CardTitle>
              <CardDescription className="text-xs">
                {execution.schedule?.name || "Manual execution"}
              </CardDescription>
            </div>
          </div>
          <Badge variant={config.variant} className="gap-1">
            <StatusIcon className="size-3" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {execution.schedule?.task_prompt || "No task prompt"}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {execution.scheduled_for
              ? new Date(execution.scheduled_for).toLocaleString()
              : new Date(execution.created_at).toLocaleString()}
          </span>
          {execution.duration_ms && (
            <span>{(execution.duration_ms / 1000).toFixed(1)}s</span>
          )}
        </div>

        {execution.error_message && (
          <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            {execution.error_message}
          </div>
        )}

        {execution.result && (
          <div className="rounded-md bg-muted p-2 text-xs">
            <pre className="whitespace-pre-wrap overflow-hidden">
              {JSON.stringify(execution.result, null, 2).slice(0, 200)}...
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ExecutionCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}

export default function ActivityPage() {
  const { executions, fetchActivity, isLoadingActivity, myAgents } = useAgents()
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [agentFilter, setAgentFilter] = useState<string>("all")

  useEffect(() => {
    const filters: { status?: ScheduleExecutionStatus; agent_id?: string } = {}
    if (statusFilter !== "all") filters.status = statusFilter as ScheduleExecutionStatus
    if (agentFilter !== "all") filters.agent_id = agentFilter
    fetchActivity(filters)
  }, [fetchActivity, statusFilter, agentFilter])

  const filteredExecutions = executions.filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false
    if (agentFilter !== "all" && e.agent_id !== agentFilter) return false
    return true
  })

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="size-6" />
            Activity
          </h1>
          <p className="text-muted-foreground mt-1">
            View agent execution history and results
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending_approval">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All agents</SelectItem>
              {myAgents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Executions List */}
        {isLoadingActivity ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <ExecutionCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredExecutions.length > 0 ? (
          <div className="space-y-4">
            {filteredExecutions.map((execution) => (
              <ExecutionCard key={execution.id} execution={execution} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Activity className="size-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No activity yet</h3>
            <p className="text-muted-foreground mt-1">
              Agent executions will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
