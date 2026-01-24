"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useAgents } from "@/providers/agents-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  MessageSquare,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Plus,
  Bot,
} from "lucide-react"

export default function HiredAgentsPage() {
  const {
    myAgents,
    executions,
    schedules,
    isLoading,
    isLoadingActivity,
    isLoadingSchedules,
    fetchActivity,
    fetchSchedules,
  } = useAgents()

  // Fetch activity and schedules on mount
  useEffect(() => {
    fetchActivity({ limit: 50 })
    fetchSchedules()
  }, [fetchActivity, fetchSchedules])

  // Get stats for an agent
  const getAgentStats = (agent: typeof myAgents[0]) => {
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
            Agents you&apos;ve hired to help with your work
          </p>
        </div>
        <Button asChild>
          <Link href="/agents/discover">
            <Plus className="size-4 mr-2" />
            Discover More
          </Link>
        </Button>
      </div>

      {myAgents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="size-14 rounded-xl bg-muted flex items-center justify-center text-2xl mb-4">
              ✨
            </div>
            <h3 className="font-semibold mb-1">No agents hired yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Discover and hire AI agents to help automate your work
            </p>
            <Button asChild>
              <Link href="/agents/discover">Browse Agents</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {myAgents.map((agent) => {
            const stats = getAgentStats(agent)
            return (
              <div
                key={agent.id}
                className="rounded-lg border bg-card hover:shadow-md transition-shadow flex flex-col"
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
        </div>
      )}
    </div>
  )
}
