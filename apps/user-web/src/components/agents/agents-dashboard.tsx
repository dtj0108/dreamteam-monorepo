"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useAgents } from "@/providers/agents-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Bot,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  ArrowRight,
  Plus,
  Sparkles,
  Play,
  Loader2,
  MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"

function StatCard({
  title,
  value,
  icon: Icon,
  href,
  alert,
  loading,
}: {
  title: string
  value: number
  icon: React.ElementType
  href?: string
  alert?: boolean
  loading?: boolean
}) {
  const content = (
    <Card className={cn("hover:shadow-md transition-shadow", href && "cursor-pointer")}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-12 mt-1" />
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{value}</p>
                {alert && value > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    Action needed
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className={cn(
            "size-10 rounded-full flex items-center justify-center",
            alert && value > 0 ? "bg-destructive/10" : "bg-muted"
          )}>
            <Icon className={cn(
              "size-5",
              alert && value > 0 ? "text-destructive" : "text-muted-foreground"
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    completed: { icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    failed: { icon: XCircle, className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    pending_approval: { icon: Clock, className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    running: { icon: Loader2, className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    approved: { icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    rejected: { icon: XCircle, className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  }[status] || { icon: AlertCircle, className: "bg-gray-100 text-gray-700" }

  const Icon = config.icon

  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", config.className)}>
      <Icon className={cn("size-3", status === "running" && "animate-spin")} />
      {status.replace("_", " ")}
    </span>
  )
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function AgentsDashboard() {
  const {
    myAgents,
    executions,
    pendingApprovals,
    pendingCount,
    schedules,
    isLoading,
    isLoadingActivity,
    isLoadingSchedules,
    fetchActivity,
    fetchSchedules,
    approveExecution,
    rejectExecution,
  } = useAgents()

  // Fetch activity and schedules on mount
  useEffect(() => {
    fetchActivity({ limit: 10 })
    fetchSchedules()
  }, [fetchActivity, fetchSchedules])

  // Computed stats
  const completedCount = executions.filter(e => e.status === "completed").length
  const activeSchedulesCount = schedules.filter(s => s.is_enabled).length
  const recentActivity = executions.slice(0, 5)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">
            Your AI agents and their activity
          </p>
        </div>
        <Button asChild>
          <Link href="/agents/discover">
            <Plus className="size-4 mr-2" />
            Discover Agents
          </Link>
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Hired Agents"
          value={myAgents.length}
          icon={Bot}
          href="/agents/hired"
          loading={isLoading}
        />
        <StatCard
          title="Pending Approvals"
          value={pendingCount}
          icon={Clock}
          href="/agents/activity/pending"
          alert
          loading={isLoadingActivity}
        />
        <StatCard
          title="Completed Tasks"
          value={completedCount}
          icon={CheckCircle2}
          href="/agents/activity"
          loading={isLoadingActivity}
        />
        <StatCard
          title="Active Schedules"
          value={activeSchedulesCount}
          icon={Calendar}
          href="/agents/schedules"
          loading={isLoadingSchedules}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>Latest agent task executions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/agents/activity">
                View all
                <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map(execution => (
                  <div key={execution.id} className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-muted flex items-center justify-center text-sm">
                      {execution.agent?.avatar_url || <Bot className="size-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {execution.agent?.name || "Agent"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {execution.schedule?.task_prompt || "Task execution"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={execution.status} />
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(execution.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Play className="size-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Schedule tasks for your agents to see activity here
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Pending Approvals</CardTitle>
              <CardDescription>Tasks waiting for your review</CardDescription>
            </div>
            {pendingCount > 0 && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/agents/activity/pending">
                  View all
                  <ArrowRight className="size-4 ml-1" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : pendingApprovals.length > 0 ? (
              <div className="space-y-3">
                {pendingApprovals.slice(0, 4).map(execution => (
                  <div key={execution.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <div className="size-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mt-0.5">
                      <Clock className="size-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {execution.agent?.name || "Agent"}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {execution.schedule?.task_prompt || "Scheduled task"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Scheduled: {new Date(execution.scheduled_for).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => rejectExecution(execution.id)}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => approveExecution(execution.id)}
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="size-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No tasks pending approval
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* My Agents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base">My Agents</CardTitle>
            <CardDescription>Agents you&apos;ve hired</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/agents/hired">
              View all
              <ArrowRight className="size-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-56 w-56 shrink-0 rounded-lg" />
              ))}
            </div>
          ) : myAgents.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {myAgents.slice(0, 6).map(agent => {
                // Calculate stats for this agent
                const agentExecutions = executions.filter(e => e.agent_id === agent.localAgentId || e.agent_id === agent.id)
                const completedTasks = agentExecutions.filter(e => e.status === "completed").length
                const agentSchedules = schedules.filter(s => s.agent_id === agent.localAgentId || s.agent_id === agent.id)

                return (
                  <div
                    key={agent.id}
                    className="shrink-0 w-56 rounded-lg border bg-card hover:shadow-md transition-shadow flex flex-col"
                  >
                    {/* Header with avatar */}
                    <div className="p-4 pb-3">
                      <div className="size-14 rounded-xl bg-muted flex items-center justify-center text-2xl mb-3">
                        {agent.avatar_url || "✨"}
                      </div>
                      <h3 className="font-semibold truncate">{agent.name}</h3>
                    </div>

                    {/* Stats */}
                    <div className="px-4 pb-3 space-y-1.5 text-sm text-muted-foreground flex-1">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="size-4" />
                        <span>0 conversations</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4" />
                        <span>{completedTasks} tasks completed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4" />
                        <span>{agentSchedules.length} scheduled</span>
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="p-4 pt-0">
                      <Button asChild variant="secondary" className="w-full">
                        <Link href={`/agents/${agent.localAgentId || agent.id}`}>
                          Meet Agent
                          <ArrowRight className="size-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                )
              })}
              {/* Discover More Card */}
              <Link
                href="/agents/discover"
                className="shrink-0 w-56 h-56 rounded-lg border border-dashed bg-muted/30 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-3"
              >
                <div className="size-14 rounded-xl bg-muted flex items-center justify-center">
                  <Plus className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Discover More</p>
              </Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <Bot className="size-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No agents hired yet</p>
              <Button asChild className="mt-3">
                <Link href="/agents/discover">
                  <Plus className="size-4 mr-2" />
                  Discover Agents
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
