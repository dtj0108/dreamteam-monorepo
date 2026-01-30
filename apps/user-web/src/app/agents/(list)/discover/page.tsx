"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAgents } from "@/providers/agents-provider"
import { useBillingContextOptional } from "@/providers/billing-provider"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Bot, MessageSquare, CheckCircle2, Calendar, ArrowRight, Check } from "lucide-react"
import type { AgentWithHireStatus } from "@/lib/types/agents"
import type { AgentTier } from "@/types/billing"
import { cn } from "@/lib/utils"

// Agent tier data for tier cards
const agentTiers = [
  {
    id: "startup" as const,
    name: "Lean Startup",
    price: 3000,
    priceDisplay: "$3K",
    agentCount: 7,
    tagline: "You + a few killers in one room",
  },
  {
    id: "teams" as const,
    name: "Department Teams",
    price: 5000,
    priceDisplay: "$5K",
    agentCount: 18,
    tagline: "Now you've got specialists",
  },
  {
    id: "enterprise" as const,
    name: "Enterprise Dream Team",
    price: 10000,
    priceDisplay: "$10K",
    agentCount: 38,
    tagline: "This is unfair",
  },
]

const tierOrder: Record<AgentTier, number> = {
  none: 0,
  startup: 1,
  teams: 2,
  enterprise: 3,
}

function TierCard({
  tier,
  currentTier,
  onUpgrade,
  isLoading,
}: {
  tier: typeof agentTiers[number]
  currentTier: AgentTier
  onUpgrade: (tierId: "startup" | "teams" | "enterprise") => void
  isLoading: boolean
}) {
  const isCurrentPlan = tier.id === currentTier
  const canUpgrade = tierOrder[tier.id] > tierOrder[currentTier]
  const isLowerTier = tierOrder[tier.id] < tierOrder[currentTier]

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-6 transition-all",
        isCurrentPlan && "ring-2 ring-foreground/20 border-foreground/20"
      )}
    >
      <div className="text-center">
        <h3 className="font-semibold text-lg">{tier.name}</h3>
        <div className="mt-2">
          <span className="text-3xl font-bold">{tier.priceDisplay}</span>
          <span className="text-muted-foreground">/mo</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {tier.agentCount} agents
        </p>
        <p className="text-xs italic text-muted-foreground mt-2">
          {tier.tagline}
        </p>
      </div>

      <div className="mt-6">
        {isCurrentPlan ? (
          <Button variant="outline" className="w-full" disabled>
            <Check className="size-4 mr-2" />
            Your Plan
          </Button>
        ) : canUpgrade ? (
          <Button
            className="w-full"
            onClick={() => onUpgrade(tier.id)}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Upgrade"}
          </Button>
        ) : isLowerTier ? (
          <Button variant="ghost" className="w-full" disabled>
            Current plan is higher
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={() => onUpgrade(tier.id)}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Get Started"}
          </Button>
        )}
      </div>
    </div>
  )
}

function TierCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="text-center space-y-2">
        <Skeleton className="h-5 w-32 mx-auto" />
        <Skeleton className="h-8 w-20 mx-auto" />
        <Skeleton className="h-4 w-24 mx-auto" />
        <Skeleton className="h-3 w-40 mx-auto" />
      </div>
      <div className="mt-6">
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  )
}

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
    myAgents,
    executions,
    schedules,
    isLoading,
    hireAgent,
    showHireAgent,
    setShowHireAgent,
    selectedAgentForHire,
    setSelectedAgentForHire,
  } = useAgents()

  const billingContext = useBillingContextOptional()
  const billing = billingContext?.billing ?? null
  const billingLoading = billingContext?.loading ?? false
  const createCheckoutSession = billingContext?.createCheckoutSession
  const agentCount = billingContext?.agentCount ?? 0

  const [searchQuery, setSearchQuery] = useState("")
  const [isHiring, setIsHiring] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [selectedTier, setSelectedTier] = useState<typeof agentTiers[number] | null>(null)
  const [confirmChecked, setConfirmChecked] = useState(false)

  const currentTier: AgentTier = billing?.agent_tier || "none"
  const hiredCount = myAgents.length

  // Open upgrade confirmation modal
  const openUpgradeModal = (tierId: "startup" | "teams" | "enterprise") => {
    const tier = agentTiers.find(t => t.id === tierId)
    setSelectedTier(tier || null)
    setConfirmChecked(false)
    setUpgradeModalOpen(true)
  }

  // Confirm and process upgrade
  const confirmUpgrade = async () => {
    if (!selectedTier || !createCheckoutSession) return
    setIsUpgrading(true)
    try {
      const result = await createCheckoutSession({
        type: "agent_tier",
        tier: selectedTier.id,
      })

      // Handle immediate upgrade (user already had a subscription)
      if (result?.upgraded) {
        setUpgradeModalOpen(false)
        // Page will re-render with updated billing from refresh() in hook
      }
      // Checkout redirect happens automatically via window.location.href
    } catch (error) {
      console.error("Failed to upgrade:", error)
    } finally {
      setIsUpgrading(false)
    }
  }

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

  // Get tier name for display
  const getTierName = (tier: AgentTier) => {
    const tierInfo = agentTiers.find((t) => t.id === tier)
    return tierInfo?.name || "No plan"
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
          <div className="text-muted-foreground mt-1">
            {billingLoading ? (
              <Skeleton className="h-4 w-48 inline-block" />
            ) : currentTier === "none" ? (
              "No agent plan yet"
            ) : (
              <>
                Your plan: <span className="font-medium">{getTierName(currentTier)}</span>{" "}
                ({hiredCount} of {agentCount} agents)
              </>
            )}
          </div>
        </div>

        {/* Tier Cards */}
        <div className="mb-8">
          {billingLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              <TierCardSkeleton />
              <TierCardSkeleton />
              <TierCardSkeleton />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {agentTiers.map((tier) => (
                <TierCard
                  key={tier.id}
                  tier={tier}
                  currentTier={currentTier}
                  onUpgrade={openUpgradeModal}
                  isLoading={isUpgrading}
                />
              ))}
            </div>
          )}
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

      {/* Upgrade Confirmation Dialog */}
      <Dialog open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to {selectedTier?.name}</DialogTitle>
            <DialogDescription>
              Would you like to upgrade your package?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-lg font-semibold mb-4">
              You will be charged {selectedTier?.priceDisplay}/month
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={confirmChecked}
                onCheckedChange={(checked) => setConfirmChecked(!!checked)}
              />
              <span className="text-sm">I confirm this purchase</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmUpgrade} disabled={!confirmChecked || isUpgrading}>
              {isUpgrading ? "Processing..." : "Yes, Upgrade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
