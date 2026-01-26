"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAgents } from "@/providers/agents-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  MessageSquare,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Plus,
  Settings,
  Users,
} from "lucide-react"
import type { AgentWithHireStatus } from "@/lib/types/agents"

export default function HiredAgentsPage() {
  const {
    agents,
    myAgents,
    planAgents,
    executions,
    schedules,
    isLoading,
    fetchActivity,
    fetchSchedules,
    toggleAgent,
  } = useAgents()

  const [togglingAgents, setTogglingAgents] = useState<Set<string>>(new Set())

  // Fetch activity and schedules on mount
  useEffect(() => {
    fetchActivity({ limit: 50 })
    fetchSchedules()
  }, [fetchActivity, fetchSchedules])

  // Get stats for an agent
  const getAgentStats = (agent: AgentWithHireStatus) => {
    const agentExecutions = executions.filter(
      e => e.agent_id === agent.localAgentId || e.agent_id === agent.id
    )
    const agentSchedules = schedules.filter(
      s => s.agent_id === agent.localAgentId || s.agent_id === agent.id
    )
    return {
      conversations: 0,
      completed: agentExecutions.filter(e => e.status === "completed").length,
      scheduled: agentSchedules.length,
    }
  }

  // Handle agent enable/disable toggle
  const handleToggle = async (agent: AgentWithHireStatus, enabled: boolean) => {
    setTogglingAgents(prev => new Set(prev).add(agent.id))
    try {
      await toggleAgent(agent.id, enabled)
    } catch (error) {
      console.error("Failed to toggle agent:", error)
    } finally {
      setTogglingAgents(prev => {
        const next = new Set(prev)
        next.delete(agent.id)
        return next
      })
    }
  }

  // Determine which agents to show - all plan agents if available, otherwise only hired
  const agentsToShow = planAgents.length > 0 ? planAgents : myAgents
  const hasDeployedTeam = planAgents.length > 0

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-lg border bg-card flex flex-col">
                <div className="p-4 pb-3">
                  <Skeleton className="size-14 rounded-xl mb-3" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="px-4 pb-3 space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="p-4 pt-0">
                  <Skeleton className="h-9 w-full" />
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Agents</h1>
          <p className="text-muted-foreground">
            {hasDeployedTeam
              ? "Agents included in your plan - toggle to enable or disable"
              : "Agents you've hired to help with your work"}
          </p>
        </div>
        {!hasDeployedTeam && (
          <Button asChild>
            <Link href="/agents/discover">
              <Plus className="size-4 mr-2" />
              Discover More
            </Link>
          </Button>
        )}
      </div>

      {agentsToShow.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="size-14 rounded-xl bg-muted flex items-center justify-center mb-4">
              <Users className="size-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No agents available</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
              {hasDeployedTeam
                ? "Your plan doesn't include any agents yet. Contact support or upgrade your plan."
                : "Subscribe to a plan to get access to AI agents that can help automate your work."}
            </p>
            <Button asChild>
              <Link href="/billing">View Plans</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {agentsToShow.map((agent) => {
            const stats = getAgentStats(agent)
            const isEnabled = agent.isHired
            const isToggling = togglingAgents.has(agent.id)

            return (
              <div
                key={agent.id}
                className={`rounded-lg border bg-card transition-all flex flex-col ${
                  isEnabled ? "hover:shadow-md" : "opacity-60"
                }`}
              >
                {/* Header with avatar and toggle */}
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between">
                    <div className="size-14 rounded-xl bg-muted flex items-center justify-center text-2xl mb-3">
                      {agent.avatar_url || "✨"}
                    </div>
                    {hasDeployedTeam && (
                      <Switch
                        checked={isEnabled}
                        disabled={isToggling}
                        onCheckedChange={(checked) => handleToggle(agent, checked)}
                        aria-label={`${isEnabled ? "Disable" : "Enable"} ${agent.name}`}
                      />
                    )}
                  </div>
                  <h3 className="font-semibold truncate">{agent.name}</h3>
                  {!isEnabled && (
                    <span className="text-xs text-muted-foreground">Disabled</span>
                  )}
                </div>

                {/* Stats */}
                <div className="px-4 pb-3 space-y-1.5 text-sm text-muted-foreground flex-1">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-4" />
                    <span>{stats.conversations} conversations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4" />
                    <span>{stats.completed} tasks completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4" />
                    <span>{stats.scheduled} scheduled</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="p-4 pt-0 flex gap-2">
                  <Button
                    asChild
                    variant="secondary"
                    className="flex-1"
                    disabled={!isEnabled}
                  >
                    <Link href={`/agents/${agent.localAgentId || agent.id}`}>
                      Meet Agent
                      <ArrowRight className="size-4 ml-2" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="icon">
                    <Link href={`/agents/configure/${agent.localAgentId || agent.id}`}>
                      <Settings className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
