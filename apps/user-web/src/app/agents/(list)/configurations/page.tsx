"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useAgents } from "@/providers/agents-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Settings,
  Zap,
  Check,
  Sparkles,
  Users,
  Store,
  ChevronRight,
  Clock,
  Plus,
} from "lucide-react"
import type { AgentWithHireStatus } from "@/lib/types/agents"

type ConfigStatus = "autopilot" | "configured" | "needs_setup"

export default function AgentConfigurationsPage() {
  const {
    myAgents,
    planAgents,
    schedules,
    executions,
    isLoading,
    fetchSchedules,
    fetchActivity,
  } = useAgents()

  // Fetch schedules and activity on mount
  useEffect(() => {
    fetchSchedules()
    fetchActivity({ limit: 100 })
  }, [fetchSchedules, fetchActivity])

  // Determine which agents to show - same logic as hired page
  const agentsToShow = planAgents.length > 0 ? planAgents : myAgents

  // Get stats for an agent
  const getAgentStats = (agent: AgentWithHireStatus) => {
    const agentSchedules = schedules.filter(
      s => s.agent_id === agent.localAgentId || s.agent_id === agent.id
    )
    const agentExecutions = executions.filter(
      e => e.agent_id === agent.localAgentId || e.agent_id === agent.id
    )
    const completedRuns = agentExecutions.filter(e => e.status === "completed").length

    return {
      autonomousActions: agentSchedules.length,
      totalRuns: completedRuns,
      hasActiveAutopilot: agentSchedules.some(s => s.is_enabled),
    }
  }

  // Get configuration status for an agent
  const getConfigStatus = (agent: AgentWithHireStatus): { status: ConfigStatus; label: string } => {
    const stats = getAgentStats(agent)

    // Check for autonomous actions (schedules) first
    if (stats.autonomousActions > 0) {
      return {
        status: "autopilot",
        label: stats.hasActiveAutopilot ? "Autopilot on" : "Autopilot paused",
      }
    }

    // Check for custom instructions or style presets (from config if available)
    const config = agent.config as Record<string, unknown> | undefined
    const hasCustomInstructions = config?.custom_instructions &&
      typeof config.custom_instructions === "string" &&
      config.custom_instructions.trim().length > 0

    const stylePresets = config?.style_presets as {
      verbosity?: string
      tone?: string
      examples?: string
    } | undefined

    const hasStylePresets = stylePresets && (
      stylePresets.verbosity !== "balanced" ||
      stylePresets.tone !== "balanced" ||
      stylePresets.examples !== "moderate"
    )

    if (hasCustomInstructions || hasStylePresets) {
      return { status: "configured", label: "Customized" }
    }

    return { status: "needs_setup", label: "Not configured" }
  }

  // Get status icon
  const getStatusIcon = (status: ConfigStatus, isActive?: boolean) => {
    switch (status) {
      case "autopilot":
        return <Zap className={`size-3.5 ${isActive ? "fill-current" : ""}`} />
      case "configured":
        return <Check className="size-3.5" />
      case "needs_setup":
        return <Sparkles className="size-3.5" />
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-6">
          {/* Header skeleton */}
          <div>
            <Skeleton className="h-7 w-52 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>

          {/* Grid skeleton */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl border bg-card p-4">
                <div className="flex gap-3">
                  <Skeleton className="size-11 rounded-xl flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-1.5" />
                    <Skeleton className="h-3.5 w-32" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Agent Configurations</h1>
        <p className="text-sm text-muted-foreground">
          Customize behavior and set up autonomous actions
        </p>
      </div>

      {agentsToShow.length === 0 ? (
        /* Empty state */
        <div className="rounded-2xl bg-muted/50 p-10">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="size-14 rounded-2xl bg-background border flex items-center justify-center mb-4">
              <Users className="size-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No agents to configure</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs">
              Hire your first agent to start customizing their behavior.
            </p>
            <Button variant="outline" asChild>
              <Link href="/agents/discover">
                <Store className="size-4 mr-2" />
                Browse Agents
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Agent cards grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {agentsToShow.map((agent) => {
              const { status, label } = getConfigStatus(agent)
              const stats = getAgentStats(agent)

              return (
                <Link
                  key={agent.id}
                  href={`/agents/configure/${agent.localAgentId || agent.id}`}
                  className="group"
                >
                  <Card className="h-full rounded-2xl border bg-card transition-all hover:bg-muted/50 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        {/* Avatar */}
                        <div className="size-11 rounded-xl bg-muted flex items-center justify-center text-lg flex-shrink-0">
                          {agent.avatar_url || "✨"}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 py-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-medium text-sm truncate">
                              {agent.name}
                            </h3>
                            <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                          </div>

                          {/* Status */}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              {getStatusIcon(status, stats.hasActiveAutopilot)}
                              {label}
                            </span>

                            {stats.autonomousActions > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {stats.autonomousActions} action{stats.autonomousActions !== 1 ? "s" : ""}
                              </span>
                            )}

                            {stats.totalRuns > 0 && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="size-3" />
                                {stats.totalRuns}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}

            {/* Add more agents card */}
            <Link href="/agents/discover" className="group">
              <Card className="h-full rounded-2xl border border-dashed bg-transparent hover:bg-muted/30 transition-colors group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2">
                <CardContent className="p-4 h-full flex items-center justify-center min-h-[76px]">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Plus className="size-4" />
                    <span>Add more agents</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Tip */}
          <p className="text-xs text-muted-foreground text-center">
            Set up autonomous actions to let your agents work on autopilot
          </p>
        </div>
      )}
    </div>
  )
}
