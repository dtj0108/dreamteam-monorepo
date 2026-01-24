"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAgents } from "@/providers/agents-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowLeft,
  Calendar,
  Clock,
  MoreHorizontal,
  Sparkles,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Globe,
  Timer,
  Pause,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import type { AgentSchedule, AgentScheduleExecution, ScheduleExecutionStatus } from "@/lib/types/agents"
import { formatCron, formatRelativeTime } from "../columns"

// Status configuration for executions
const statusConfig: Record<ScheduleExecutionStatus, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_approval: { label: "Pending", icon: Clock, variant: "secondary" },
  approved: { label: "Approved", icon: CheckCircle2, variant: "default" },
  rejected: { label: "Rejected", icon: XCircle, variant: "destructive" },
  running: { label: "Running", icon: Play, variant: "secondary" },
  completed: { label: "Completed", icon: CheckCircle2, variant: "default" },
  failed: { label: "Failed", icon: AlertCircle, variant: "destructive" },
  cancelled: { label: "Cancelled", icon: XCircle, variant: "outline" },
}

// Single execution row
function ExecutionRow({ execution }: { execution: AgentScheduleExecution }) {
  const config = statusConfig[execution.status]
  const StatusIcon = config.icon

  return (
    <div className="flex items-center gap-3 border rounded-md p-3 bg-background">
      <Badge variant={config.variant} className="gap-1 shrink-0">
        <StatusIcon className="size-3" />
        {config.label}
      </Badge>

      <div className="flex-1 min-w-0">
        <span className="text-sm text-muted-foreground">
          {execution.scheduled_for
            ? new Date(execution.scheduled_for).toLocaleString()
            : new Date(execution.created_at).toLocaleString()}
        </span>
      </div>

      {execution.duration_ms && (
        <span className="text-xs text-muted-foreground shrink-0">
          {(execution.duration_ms / 1000).toFixed(1)}s
        </span>
      )}

      {execution.error_message && (
        <span className="text-xs text-destructive truncate max-w-[200px]">
          {execution.error_message}
        </span>
      )}
    </div>
  )
}

// Loading skeleton for executions
function ExecutionsLoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 border rounded-md p-3 bg-background">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  )
}

// Loading skeleton for the entire page
function PageLoadingSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
      {/* Content skeleton */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[350px] border-r p-6 space-y-6">
          <Skeleton className="h-6 w-20" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <ExecutionsLoadingSkeleton />
        </div>
      </div>
    </div>
  )
}

export default function ScheduleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toggleSchedule, workspaceId } = useAgents()

  const [schedule, setSchedule] = useState<AgentSchedule | null>(null)
  const [executions, setExecutions] = useState<AgentScheduleExecution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingExecutions, setIsLoadingExecutions] = useState(true)
  const [executionOffset, setExecutionOffset] = useState(0)
  const [hasMoreExecutions, setHasMoreExecutions] = useState(true)
  const EXECUTIONS_LIMIT = 10

  // Fetch the schedule
  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/schedules/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setSchedule(data.schedule)
      } else if (res.status === 404) {
        router.push("/agents/schedules")
      }
    } catch (error) {
      console.error("Error fetching schedule:", error)
    } finally {
      setIsLoading(false)
    }
  }, [params.id, router])

  // Fetch executions
  const fetchExecutions = useCallback(async (offset = 0, append = false) => {
    if (!workspaceId) return

    setIsLoadingExecutions(true)
    try {
      const res = await fetch(
        `/api/agents/activity?workspaceId=${workspaceId}&schedule_id=${params.id}&limit=${EXECUTIONS_LIMIT}&offset=${offset}`
      )
      if (res.ok) {
        const data = await res.json()
        const newExecutions = data.executions || []

        if (append) {
          setExecutions(prev => [...prev, ...newExecutions])
        } else {
          setExecutions(newExecutions)
        }

        setHasMoreExecutions(newExecutions.length === EXECUTIONS_LIMIT)
      }
    } catch (error) {
      console.error("Failed to fetch executions:", error)
    } finally {
      setIsLoadingExecutions(false)
    }
  }, [params.id, workspaceId])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  useEffect(() => {
    if (workspaceId && schedule) {
      fetchExecutions()
    }
  }, [workspaceId, schedule, fetchExecutions])

  const handleToggle = async (enabled: boolean) => {
    if (!schedule) return
    await toggleSchedule(schedule.id, enabled)
    setSchedule(prev => prev ? { ...prev, is_enabled: enabled } : null)
  }

  const handleLoadMore = () => {
    const newOffset = executionOffset + EXECUTIONS_LIMIT
    setExecutionOffset(newOffset)
    fetchExecutions(newOffset, true)
  }

  if (isLoading) {
    return <PageLoadingSkeleton />
  }

  if (!schedule) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Schedule not found</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/agents/schedules" className="gap-2">
              <ArrowLeft className="size-4" />
              Back to Schedules
            </Link>
          </Button>
          <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0">
            {schedule.agent?.avatar_url || (
              <Sparkles className="size-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold">{schedule.name}</h1>
            <p className="text-sm text-muted-foreground">
              {schedule.agent?.name || "Unknown Agent"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {schedule.is_enabled ? "Enabled" : "Paused"}
            </span>
            <Switch
              checked={schedule.is_enabled}
              onCheckedChange={handleToggle}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>
                Edit Schedule
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="text-destructive">
                Delete Schedule
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Details */}
        <div className="w-[350px] border-r flex flex-col overflow-hidden bg-background">
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Status badges */}
              <div className="flex items-center gap-2">
                {schedule.is_enabled ? (
                  <Badge variant="default" className="gap-1">
                    <span className="size-1.5 rounded-full bg-current animate-pulse" />
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <Pause className="size-3" />
                    Paused
                  </Badge>
                )}
                {schedule.requires_approval && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <AlertTriangle className="size-3" />
                    Requires Approval
                  </Badge>
                )}
              </div>

              {/* Details Section */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">DETAILS</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Agent:</span>
                    <span className="font-medium">{schedule.agent?.name || "Unknown"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Frequency:</span>
                    <span className="font-medium">{formatCron(schedule.cron_expression)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Timezone:</span>
                    <span className="font-medium">{schedule.timezone}</span>
                  </div>
                  {schedule.next_run_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="size-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Next Run:</span>
                      <span className="font-medium">{formatRelativeTime(schedule.next_run_at)}</span>
                    </div>
                  )}
                  {schedule.last_run_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <Timer className="size-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Last Run:</span>
                      <span className="font-medium">{formatRelativeTime(schedule.last_run_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Task Section */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">TASK</h3>
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm whitespace-pre-wrap">{schedule.task_prompt}</p>
                </div>
              </div>

              {/* Description Section */}
              {schedule.description && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">DESCRIPTION</h3>
                  <p className="text-sm text-muted-foreground">{schedule.description}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
                <p>Created: {new Date(schedule.created_at).toLocaleString()}</p>
                <p>Updated: {new Date(schedule.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Execution History */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/30">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Execution History</h2>
          </div>
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-2 pb-6">
              {isLoadingExecutions && executions.length === 0 ? (
                <ExecutionsLoadingSkeleton />
              ) : executions.length > 0 ? (
                <>
                  {executions.map((execution) => (
                    <ExecutionRow key={execution.id} execution={execution} />
                  ))}
                  {hasMoreExecutions && (
                    <div className="pt-4">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleLoadMore}
                        disabled={isLoadingExecutions}
                      >
                        {isLoadingExecutions ? "Loading..." : "Load more"}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 bg-background rounded-md border">
                  <Calendar className="size-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No executions yet</h3>
                  <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
                    This schedule hasn't run yet. Executions will appear here once the schedule triggers.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
