"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useWorkspace } from "@/providers/workspace-provider"
import { useTeamChannels } from "@/hooks/use-team-channels"
import { getSupabaseClient } from "@/lib/supabase"
import type { Channel, DirectMessage } from "@/components/team"

interface Agent {
  id: string
  name: string
  description?: string | null
  avatar_url?: string | null
  unreadCount?: number
}

interface TeamContextType {
  // State
  channels: Channel[]
  directMessages: DirectMessage[]
  agents: Agent[]
  isLoading: boolean
  workspaceId: string | undefined
  userId: string | undefined

  // Lookup helpers for instant access
  getChannelById: (id: string) => Channel | undefined
  getDMById: (id: string) => DirectMessage | undefined
  getAgentById: (id: string) => Agent | undefined

  // Actions
  createChannel: (name: string, description: string, isPrivate: boolean) => Promise<void>
  startDM: (participantId: string) => Promise<void>
  refreshDMs: () => Promise<void>
  createAgent: (agent: { name: string; description: string; systemPrompt: string; tools: string[] }) => Promise<void>
  refreshAgents: () => Promise<void>

  // Dialog state
  showCreateChannel: boolean
  setShowCreateChannel: (show: boolean) => void
  showStartDM: boolean
  setShowStartDM: (show: boolean) => void
  showCreateAgent: boolean
  setShowCreateAgent: (show: boolean) => void
}

const TeamContext = createContext<TeamContextType | null>(null)

// Module-level caches for instant loads when returning to Team
const dmsCache = new Map<string, DirectMessage[]>()
const agentsCache = new Map<string, Agent[]>()

export function useTeam() {
  const context = useContext(TeamContext)
  if (!context) {
    throw new Error("useTeam must be used within a TeamProvider")
  }
  return context
}

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user } = useUser()
  const { currentWorkspace } = useWorkspace()
  const router = useRouter()
  const workspaceId = currentWorkspace?.id || undefined

  // Initialize with cached data if available
  const cachedDMs = workspaceId ? dmsCache.get(workspaceId) : undefined
  const cachedAgents = workspaceId ? agentsCache.get(workspaceId) : undefined

  const [directMessages, setDirectMessages] = useState<DirectMessage[]>(cachedDMs || [])
  const [agents, setAgents] = useState<Agent[]>(cachedAgents || [])
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showStartDM, setShowStartDM] = useState(false)
  const [showCreateAgent, setShowCreateAgent] = useState(false)

  // Track which workspace we've fetched for to prevent redundant fetches
  const fetchedWorkspaceRef = useRef<string | null>(null)

  // Use the channels hook
  const {
    channels: fetchedChannels,
    isLoading: channelsLoading,
    createChannel: createChannelApi,
  } = useTeamChannels({ workspaceId })

  // Use fetched channels directly (no defaults to avoid flash)
  const channels = fetchedChannels

  // Reset DMs and agents from cache when workspaceId changes
  useEffect(() => {
    const cachedDMs = workspaceId ? dmsCache.get(workspaceId) : undefined
    const cachedAgents = workspaceId ? agentsCache.get(workspaceId) : undefined
    setDirectMessages(cachedDMs || [])
    setAgents(cachedAgents || [])
  }, [workspaceId])

  // Lookup helpers for instant access (used by pages to avoid refetching)
  const getChannelById = useCallback((id: string) => {
    return channels.find(c => c.id === id)
  }, [channels])

  const getDMById = useCallback((id: string) => {
    return directMessages.find(dm => dm.id === id)
  }, [directMessages])

  const getAgentById = useCallback((id: string) => {
    return agents.find(a => a.id === id)
  }, [agents])

  // Fetch DM conversations
  const fetchDMs = useCallback(async () => {
    if (!workspaceId) return

    try {
      const response = await fetch(`/api/team/dm?workspaceId=${workspaceId}`)
      const data = await response.json()

      if (response.ok && Array.isArray(data)) {
        const transformed = data.map((dm: { id: string; unread_count?: number; otherParticipants?: { id: string; name: string; avatar_url?: string }[] }) => ({
          id: dm.id,
          participant: {
            id: dm.otherParticipants?.[0]?.id || "",
            name: dm.otherParticipants?.[0]?.name || "Unknown",
            avatar: dm.otherParticipants?.[0]?.avatar_url,
          },
          status: "offline" as const,
          unreadCount: dm.unread_count || 0,
        }))
        setDirectMessages(transformed)
        dmsCache.set(workspaceId, transformed) // Update cache
      }
    } catch (error) {
      console.error("Failed to fetch DMs:", error)
    }
  }, [workspaceId])

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    if (!workspaceId) return

    try {
      const response = await fetch(`/api/team/agents?workspaceId=${workspaceId}`)
      const data = await response.json()

      if (response.ok && Array.isArray(data)) {
        const transformed = data.map((a: { id: string; name: string; description?: string; avatar_url?: string; unread_count?: number }) => ({
          id: a.id,
          name: a.name,
          description: a.description || null,
          avatar_url: a.avatar_url || null,
          unreadCount: a.unread_count || 0,
        }))
        setAgents(transformed)
        agentsCache.set(workspaceId, transformed) // Update cache
      }
    } catch (error) {
      console.error("Failed to fetch agents:", error)
    }
  }, [workspaceId])

  // Only fetch if workspace changed or we haven't fetched yet
  useEffect(() => {
    if (workspaceId && fetchedWorkspaceRef.current !== workspaceId) {
      fetchedWorkspaceRef.current = workspaceId
      fetchDMs()
      fetchAgents()
    }
  }, [workspaceId, fetchDMs, fetchAgents])

  // Subscribe to real-time updates for DM list
  useEffect(() => {
    if (!workspaceId || !user?.id) return

    const supabase = getSupabaseClient()

    // Listen for new DM participants (current user added to new DM)
    // and new messages (to update "last message" preview in sidebar)
    const channel = supabase
      .channel('dm-list-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_participants',
          filter: `profile_id=eq.${user.id}`,
        },
        () => {
          // Refresh DM list when user is added to a new conversation
          fetchDMs()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload: { new: { dm_conversation_id?: string } }) => {
          // Refresh DM list when new message arrives (for "last message" preview)
          if (payload.new.dm_conversation_id) {
            fetchDMs()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workspaceId, user?.id, fetchDMs])

  // Subscribe to real-time updates for agent messages (unread badges)
  useEffect(() => {
    if (!workspaceId || !user?.id) return

    const supabase = getSupabaseClient()

    const channel = supabase
      .channel('agent-message-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_messages',
        },
        (payload: { new: { conversation_id: string; role: string } }) => {
          // Only refresh for assistant messages (not user messages)
          // This updates unread badges when an agent sends a new message
          if (payload.new.role === 'assistant') {
            fetchAgents()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workspaceId, user?.id, fetchAgents])

  const createChannel = async (name: string, description: string, isPrivate: boolean) => {
    const channel = await createChannelApi(name, description, isPrivate)
    setShowCreateChannel(false)
    // Navigate to the new channel
    if (channel?.id) {
      router.push(`/team/channels/${channel.id}`)
    }
  }

  const startDM = async (participantId: string) => {
    if (!workspaceId) return

    const response = await fetch("/api/team/dm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, participantId }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Failed to start conversation")
    }

    // Refresh DM list
    await fetchDMs()

    // Close dialog and navigate to the DM
    setShowStartDM(false)
    router.push(`/team/dm/${data.id}`)
  }

  const createAgent = async (agentData: { name: string; description: string; systemPrompt: string; tools: string[] }) => {
    if (!workspaceId) throw new Error("No workspace")

    const response = await fetch("/api/team/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        name: agentData.name,
        description: agentData.description,
        systemPrompt: agentData.systemPrompt,
        tools: agentData.tools,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Failed to create agent")
    }

    // Refresh agents list
    await fetchAgents()

    // Close dialog and navigate to the agent
    setShowCreateAgent(false)
    router.push(`/team/agents/${data.id}`)
  }

  const value: TeamContextType = {
    channels,
    directMessages,
    agents,
    isLoading: channelsLoading,
    workspaceId,
    userId: user?.id,
    getChannelById,
    getDMById,
    getAgentById,
    createChannel,
    startDM,
    refreshDMs: fetchDMs,
    createAgent,
    refreshAgents: fetchAgents,
    showCreateChannel,
    setShowCreateChannel,
    showStartDM,
    setShowStartDM,
    showCreateAgent,
    setShowCreateAgent,
  }

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  )
}
