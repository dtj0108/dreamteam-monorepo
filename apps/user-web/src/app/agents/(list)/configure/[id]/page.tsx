"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useWorkspace } from "@/providers/workspace-provider"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfigSidebar, type ConfigSection } from "@/components/agents/config-sidebar"
import { StyleSection } from "@/components/agents/style-section"
import { InstructionsSection } from "@/components/agents/instructions-section"
import { SchedulesSection } from "@/components/agents/schedules-section"
import { NotificationsSection } from "@/components/agents/notifications-section"
import { ActivitySection } from "@/components/agents/activity-section"
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react"

interface Agent {
  id: string
  ai_agent_id: string | null
  name: string
  description: string | null
  avatar_url: string | null
  reports_to: string[]
  reports_to_profiles: {
    id: string
    name: string
    avatar_url: string | null
  }[]
  style_presets?: {
    verbosity: "concise" | "balanced" | "detailed"
    tone: "casual" | "balanced" | "formal"
    examples: "few" | "moderate" | "many"
  }
  custom_instructions?: string | null
}

export default function AgentConfigurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: agentId } = use(params)
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<ConfigSection>("style")

  // Fetch agent details
  useEffect(() => {
    async function fetchAgent() {
      try {
        const response = await fetch(`/api/team/agents/${agentId}`)
        if (response.ok) {
          const data = await response.json()
          setAgent(data)
        }
      } catch (error) {
        console.error("Failed to fetch agent:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAgent()
  }, [agentId])

  // Update agent data after a successful save
  const handleAgentUpdate = (updatedAgent: unknown) => {
    setAgent(updatedAgent as Agent)
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="border-b px-6 py-4">
          <Skeleton className="h-4 w-32 mb-4" />
          <div className="flex items-center gap-4">
            <Skeleton className="size-14 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="flex flex-1 min-h-0">
          <div className="w-56 border-r p-4">
            <Skeleton className="h-4 w-20 mb-3" />
            <Skeleton className="h-8 w-full mb-2" />
            <Skeleton className="h-8 w-full mb-4" />
            <Skeleton className="h-4 w-20 mb-3" />
            <Skeleton className="h-8 w-full mb-2" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="flex-1 p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="size-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-2">Agent not found</h2>
          <p className="text-muted-foreground mb-4">
            This agent may have been removed or you don&apos;t have access.
          </p>
          <Button asChild variant="outline">
            <Link href="/agents/hired">Back to My Agents</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 -ml-4 -mr-4 -mb-4">
      {/* Header */}
      <div className="border-b px-6 py-4 flex-shrink-0">
        <Link
          href="/agents/hired"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="size-4" />
          Back to My Agents
        </Link>

        <div className="flex items-center gap-4">
          <div className="size-14 rounded-xl bg-muted flex items-center justify-center text-2xl">
            {agent.avatar_url || <Sparkles className="size-6 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold truncate">{agent.name}</h1>
            {agent.description && (
              <p className="text-sm text-muted-foreground truncate">{agent.description}</p>
            )}
          </div>
          <Button asChild>
            <Link href={`/agents/${agentId}`}>
              Meet Agent
              <ArrowRight className="size-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Main content with sidebar */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <ConfigSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">
            {activeSection === "style" && (
              <StyleSection
                agent={agent}
                onUpdate={handleAgentUpdate}
              />
            )}
            {activeSection === "instructions" && (
              <InstructionsSection
                agent={agent}
                onUpdate={handleAgentUpdate}
              />
            )}
            {activeSection === "schedules" && agent.ai_agent_id && (
              <SchedulesSection
                agentId={agent.ai_agent_id}
              />
            )}
            {activeSection === "schedules" && !agent.ai_agent_id && (
              <div className="text-center py-8 text-muted-foreground">
                <p>This agent is not linked to an AI agent yet.</p>
                <p className="text-sm mt-1">Schedules require an AI agent connection.</p>
              </div>
            )}
            {activeSection === "notifications" && (
              <NotificationsSection
                agent={agent}
                workspaceId={workspaceId ?? undefined}
                onUpdate={handleAgentUpdate}
              />
            )}
            {activeSection === "activity" && agent.ai_agent_id && (
              <ActivitySection
                agentId={agent.ai_agent_id}
              />
            )}
            {activeSection === "activity" && !agent.ai_agent_id && (
              <div className="text-center py-8 text-muted-foreground">
                <p>This agent is not linked to an AI agent yet.</p>
                <p className="text-sm mt-1">Activity requires an AI agent connection.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
