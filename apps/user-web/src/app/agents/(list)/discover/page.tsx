"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAgents } from "@/providers/agents-provider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, Bot, MessageSquare, CheckCircle2, Calendar, ArrowRight } from "lucide-react"
import type { AgentWithHireStatus } from "@/lib/types/agents"

function AgentCard({
  agent,
  onHire,
  onChat,
  stats,
}: {
  agent: AgentWithHireStatus
  onHire: () => void
  onChat: () => void
  stats?: { conversations: number; completed: number; scheduled: number }
}) {
  return (
    <div className="rounded-lg border bg-card hover:shadow-md transition-shadow flex flex-col">
      {/* Header with avatar */}
      <div className="p-4 pb-3">
        <div className="size-14 rounded-xl bg-muted flex items-center justify-center text-2xl mb-3">
          {agent.avatar_url || "✨"}
        </div>
        <h3 className="font-semibold truncate">{agent.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          {agent.description || "No description"}
        </p>
      </div>

      {/* Stats or description */}
      <div className="px-4 pb-3 space-y-1.5 text-sm text-muted-foreground flex-1">
        {agent.isHired && stats ? (
          <>
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
          </>
        ) : (
          <p className="text-xs italic">Hire to get started</p>
        )}
      </div>

      {/* Action button */}
      <div className="p-4 pt-0">
        {agent.isHired ? (
          <Button
            variant="secondary"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation()
              onChat()
            }}
          >
            Meet Agent
            <ArrowRight className="size-4 ml-2" />
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={(e) => {
              e.stopPropagation()
              onHire()
            }}
          >
            Hire Agent
          </Button>
        )}
      </div>
    </div>
  )
}

function AgentCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card flex flex-col">
      <div className="p-4 pb-3">
        <Skeleton className="size-14 rounded-xl mb-3" />
        <Skeleton className="h-5 w-32 mb-2" />
        <Skeleton className="h-4 w-full" />
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
  )
}

export default function AgentsDiscoverPage() {
  const router = useRouter()
  const {
    agents,
    executions,
    schedules,
    isLoading,
    hireAgent,
    showHireAgent,
    setShowHireAgent,
    selectedAgentForHire,
    setSelectedAgentForHire,
  } = useAgents()

  const [searchQuery, setSearchQuery] = useState("")
  const [isHiring, setIsHiring] = useState(false)

  // Filter agents based on search
  const filteredAgents = useMemo(() => {
    if (!searchQuery) return agents
    const query = searchQuery.toLowerCase()
    return agents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(query) ||
        agent.description?.toLowerCase().includes(query)
    )
  }, [agents, searchQuery])

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

  // Handle hiring an agent
  const handleHire = async () => {
    if (!selectedAgentForHire) return
    setIsHiring(true)
    try {
      const localAgent = await hireAgent(selectedAgentForHire.id)
      if (localAgent) {
        router.push(`/agents/${localAgent.id}`)
      }
    } finally {
      setIsHiring(false)
    }
  }

  // Open hire dialog
  const openHireDialog = (agent: AgentWithHireStatus) => {
    setSelectedAgentForHire(agent)
    setShowHireAgent(true)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="size-6" />
            Discover Agents
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse and hire AI agents to help with your work
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Agent Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <AgentCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredAgents.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onHire={() => openHireDialog(agent)}
                onChat={() => router.push(`/agents/${agent.localAgentId || agent.id}`)}
                stats={agent.isHired ? getAgentStats(agent) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Bot className="size-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No agents found</h3>
            <p className="text-muted-foreground mt-1">
              {searchQuery
                ? "Try adjusting your search"
                : "No agents available yet"}
            </p>
          </div>
        )}
      </div>

      {/* Hire Agent Dialog */}
      <Dialog open={showHireAgent} onOpenChange={setShowHireAgent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="size-8 rounded-md bg-muted flex items-center justify-center text-lg">
                {selectedAgentForHire?.avatar_url || "✨"}
              </div>
              Hire {selectedAgentForHire?.name}?
            </DialogTitle>
            <DialogDescription>
              {selectedAgentForHire?.description || "This agent will be added to your workspace."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium mb-2">This agent can help with:</p>
              <p className="text-muted-foreground">
                {selectedAgentForHire?.system_prompt?.slice(0, 200)}...
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHireAgent(false)}>
              Cancel
            </Button>
            <Button onClick={handleHire} disabled={isHiring}>
              {isHiring ? "Hiring..." : "Hire Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
