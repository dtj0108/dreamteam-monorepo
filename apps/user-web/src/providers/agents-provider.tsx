"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react"
import { useUser } from "@/hooks/use-user"
import type {
  AIAgent,
  AgentWithHireStatus,
  LocalAgent,
  AgentSchedule,
  AgentScheduleExecution,
  AgentConversation,
  AgentFilters,
  ActivityFilters,
  ScheduleFilters,
} from "@/lib/types/agents"

interface AgentsContextType {
  // Agent Directory (from ai_agents table)
  agents: AgentWithHireStatus[]
  myAgents: AgentWithHireStatus[]
  currentAgent: AIAgent | null
  isLoading: boolean
  isLoadingAgent: boolean

  // Conversations
  conversations: AgentConversation[]
  currentConversation: AgentConversation | null

  // Activity & Schedules
  executions: AgentScheduleExecution[]
  pendingApprovals: AgentScheduleExecution[]
  schedules: AgentSchedule[]
  isLoadingActivity: boolean
  isLoadingSchedules: boolean
  pendingCount: number

  // Workspace
  workspaceId: string | undefined

  // Lookup helpers
  getAgentById: (id: string) => AgentWithHireStatus | undefined
  getLocalAgentById: (id: string) => AgentWithHireStatus | undefined
  getConversationById: (id: string) => AgentConversation | undefined

  // Agent actions
  fetchAgents: (filters?: AgentFilters) => Promise<void>
  fetchAgent: (id: string) => Promise<AIAgent | null>
  hireAgent: (agentId: string) => Promise<LocalAgent | null>
  unhireAgent: (localAgentId: string) => Promise<void>
  refreshAgents: () => Promise<void>

  // Conversation actions
  fetchConversations: (agentId: string) => Promise<void>
  createConversation: (agentId: string, title?: string) => Promise<AgentConversation | null>
  setCurrentConversation: (conversation: AgentConversation | null) => void

  // Activity actions
  fetchActivity: (filters?: ActivityFilters) => Promise<void>
  fetchPendingApprovals: () => Promise<void>
  approveExecution: (executionId: string) => Promise<void>
  rejectExecution: (executionId: string, reason?: string) => Promise<void>

  // Schedule actions
  fetchSchedules: (filters?: ScheduleFilters) => Promise<void>
  toggleSchedule: (scheduleId: string, enabled: boolean) => Promise<void>

  // Dialog state
  showHireAgent: boolean
  setShowHireAgent: (show: boolean) => void
  selectedAgentForHire: AIAgent | null
  setSelectedAgentForHire: (agent: AIAgent | null) => void
}

const AgentsContext = createContext<AgentsContextType | null>(null)

export function useAgents() {
  const context = useContext(AgentsContext)
  if (!context) {
    throw new Error("useAgents must be used within an AgentsProvider")
  }
  return context
}

export function AgentsProvider({ children }: { children: ReactNode }) {
  const { user } = useUser()
  const workspaceId = user?.workspaceId || undefined

  // State
  const [agents, setAgents] = useState<AgentWithHireStatus[]>([])
  const [currentAgent, setCurrentAgent] = useState<AIAgent | null>(null)
  const [conversations, setConversations] = useState<AgentConversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<AgentConversation | null>(null)
  const [executions, setExecutions] = useState<AgentScheduleExecution[]>([])
  const [schedules, setSchedules] = useState<AgentSchedule[]>([])

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingAgent, setIsLoadingAgent] = useState(false)
  const [isLoadingActivity, setIsLoadingActivity] = useState(false)
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false)

  // Dialog state
  const [showHireAgent, setShowHireAgent] = useState(false)
  const [selectedAgentForHire, setSelectedAgentForHire] = useState<AIAgent | null>(null)

  // Track fetched workspace
  const fetchedWorkspaceRef = useRef<string | null>(null)

  // Computed values
  const myAgents = agents.filter(a => a.isHired)
  const pendingApprovals = executions.filter(e => e.status === "pending_approval")
  const pendingCount = pendingApprovals.length

  // Lookup helpers
  const getAgentById = useCallback((id: string) => {
    return agents.find(a => a.id === id)
  }, [agents])

  const getLocalAgentById = useCallback((id: string) => {
    return agents.find(a => a.localAgentId === id)
  }, [agents])

  const getConversationById = useCallback((id: string) => {
    return conversations.find(c => c.id === id)
  }, [conversations])

  // Fetch all agents from ai_agents table
  const fetchAgents = useCallback(async (filters?: AgentFilters) => {
    if (!workspaceId) {
      setIsLoading(false)
      return
    }

    try {
      const params = new URLSearchParams({ workspaceId })
      if (filters?.search) params.append("search", filters.search)
      if (filters?.category) params.append("category", filters.category)
      if (filters?.department_id) params.append("department_id", filters.department_id)
      if (filters?.hired_only) params.append("hired_only", "true")
      if (filters?.limit) params.append("limit", String(filters.limit))
      if (filters?.offset) params.append("offset", String(filters.offset))

      const response = await fetch(`/api/agents?${params}`)
      const data = await response.json()

      if (response.ok && data.agents) {
        setAgents(data.agents)
      }
    } catch (error) {
      console.error("Failed to fetch agents:", error)
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  // Fetch single agent details
  const fetchAgent = useCallback(async (id: string): Promise<AIAgent | null> => {
    setIsLoadingAgent(true)
    try {
      const response = await fetch(`/api/agents/${id}`)
      const data = await response.json()

      if (response.ok && data.agent) {
        setCurrentAgent(data.agent)
        return data.agent
      }
      return null
    } catch (error) {
      console.error("Failed to fetch agent:", error)
      return null
    } finally {
      setIsLoadingAgent(false)
    }
  }, [])

  // Hire an agent (create local agent record)
  const hireAgent = async (agentId: string): Promise<LocalAgent | null> => {
    if (!workspaceId) return null

    try {
      const response = await fetch(`/api/agents/${agentId}/hire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to hire agent")
      }

      // Update local state to mark agent as hired
      setAgents(prev => prev.map(a =>
        a.id === agentId
          ? { ...a, isHired: true, localAgentId: data.id, hiredAt: data.hired_at }
          : a
      ))

      setShowHireAgent(false)
      setSelectedAgentForHire(null)

      return data
    } catch (error) {
      console.error("Failed to hire agent:", error)
      return null
    }
  }

  // Unhire an agent (soft delete local record)
  const unhireAgent = async (localAgentId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/agents/${localAgentId}/unhire`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to unhire agent")
      }

      // Update local state to mark agent as not hired
      setAgents(prev => prev.map(a =>
        a.localAgentId === localAgentId
          ? { ...a, isHired: false, localAgentId: null, hiredAt: null }
          : a
      ))
    } catch (error) {
      console.error("Failed to unhire agent:", error)
      throw error
    }
  }

  // Fetch conversations for an agent
  const fetchConversations = useCallback(async (agentId: string) => {
    if (!workspaceId) return

    try {
      const response = await fetch(`/api/agent-conversations?agentId=${agentId}&workspaceId=${workspaceId}`)
      const data = await response.json()

      if (response.ok && Array.isArray(data)) {
        setConversations(data)
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error)
    }
  }, [workspaceId])

  // Create a new conversation
  const createConversation = async (agentId: string, title?: string): Promise<AgentConversation | null> => {
    if (!workspaceId) return null

    try {
      const response = await fetch("/api/agent-conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          workspaceId,
          title: title || "New conversation",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create conversation")
      }

      // Add to local state
      setConversations(prev => [data, ...prev])
      setCurrentConversation(data)

      return data
    } catch (error) {
      console.error("Failed to create conversation:", error)
      return null
    }
  }

  // Fetch activity/executions
  const fetchActivity = useCallback(async (filters?: ActivityFilters) => {
    if (!workspaceId) return

    setIsLoadingActivity(true)
    try {
      const params = new URLSearchParams({ workspaceId })
      if (filters?.agent_id) params.append("agent_id", filters.agent_id)
      if (filters?.status) params.append("status", filters.status)
      if (filters?.from_date) params.append("from_date", filters.from_date)
      if (filters?.to_date) params.append("to_date", filters.to_date)
      if (filters?.limit) params.append("limit", String(filters.limit))
      if (filters?.offset) params.append("offset", String(filters.offset))

      const response = await fetch(`/api/agents/activity?${params}`)
      const data = await response.json()

      if (response.ok && data.executions) {
        setExecutions(data.executions)
      }
    } catch (error) {
      console.error("Failed to fetch activity:", error)
    } finally {
      setIsLoadingActivity(false)
    }
  }, [workspaceId])

  // Fetch pending approvals
  const fetchPendingApprovals = useCallback(async () => {
    if (!workspaceId) return

    try {
      const response = await fetch(`/api/agents/activity/pending?workspaceId=${workspaceId}`)
      const data = await response.json()

      if (response.ok && data.executions) {
        // Merge with existing executions, updating status
        setExecutions(prev => {
          const pending = data.executions as AgentScheduleExecution[]
          const pendingIds = new Set(pending.map((e: AgentScheduleExecution) => e.id))
          const otherExecutions = prev.filter(e => !pendingIds.has(e.id))
          return [...pending, ...otherExecutions]
        })
      }
    } catch (error) {
      console.error("Failed to fetch pending approvals:", error)
    }
  }, [workspaceId])

  // Approve an execution
  const approveExecution = async (executionId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/agents/activity/${executionId}/approve`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()

        // If status conflict (already processed), refresh the list silently
        if (data.error === "Execution is not pending approval") {
          await fetchPendingApprovals()
          throw new Error("This task was already processed. The list has been refreshed.")
        }

        throw new Error(data.error || "Failed to approve execution")
      }

      // Update local state
      setExecutions(prev => prev.map(e =>
        e.id === executionId
          ? { ...e, status: "approved" as const, approved_at: new Date().toISOString() }
          : e
      ))
    } catch (error) {
      console.error("Failed to approve execution:", error)
      throw error
    }
  }

  // Reject an execution
  const rejectExecution = async (executionId: string, reason?: string): Promise<void> => {
    try {
      const response = await fetch(`/api/agents/activity/${executionId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) {
        const data = await response.json()

        // If status conflict (already processed), refresh the list silently
        if (data.error === "Execution is not pending approval") {
          await fetchPendingApprovals()
          throw new Error("This task was already processed. The list has been refreshed.")
        }

        throw new Error(data.error || "Failed to reject execution")
      }

      // Update local state
      setExecutions(prev => prev.map(e =>
        e.id === executionId
          ? { ...e, status: "rejected" as const, rejection_reason: reason || null }
          : e
      ))
    } catch (error) {
      console.error("Failed to reject execution:", error)
      throw error
    }
  }

  // Fetch schedules
  const fetchSchedules = useCallback(async (filters?: ScheduleFilters) => {
    if (!workspaceId) return

    setIsLoadingSchedules(true)
    try {
      const params = new URLSearchParams({ workspaceId })
      if (filters?.search) params.set("search", filters.search)
      if (filters?.status) params.set("status", filters.status)
      if (filters?.agentId) params.set("agent_id", filters.agentId)
      if (filters?.approval) params.set("approval", filters.approval)
      if (filters?.nextRunBefore) params.set("next_run_before", filters.nextRunBefore)

      const response = await fetch(`/api/agents/schedules?${params}`)
      const data = await response.json()

      if (response.ok && data.schedules) {
        setSchedules(data.schedules)
      }
    } catch (error) {
      console.error("Failed to fetch schedules:", error)
    } finally {
      setIsLoadingSchedules(false)
    }
  }, [workspaceId])

  // Toggle schedule enabled/disabled
  const toggleSchedule = async (scheduleId: string, enabled: boolean): Promise<void> => {
    try {
      const response = await fetch(`/api/agents/schedules/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: enabled }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update schedule")
      }

      // Update local state
      setSchedules(prev => prev.map(s =>
        s.id === scheduleId ? { ...s, is_enabled: enabled } : s
      ))
    } catch (error) {
      console.error("Failed to toggle schedule:", error)
      throw error
    }
  }

  // Initial fetch
  useEffect(() => {
    if (workspaceId && fetchedWorkspaceRef.current !== workspaceId) {
      fetchedWorkspaceRef.current = workspaceId
      setIsLoading(true)
      fetchAgents()
      fetchPendingApprovals()
    }
  }, [workspaceId, fetchAgents, fetchPendingApprovals])

  const value: AgentsContextType = {
    agents,
    myAgents,
    currentAgent,
    isLoading,
    isLoadingAgent,
    conversations,
    currentConversation,
    executions,
    pendingApprovals,
    schedules,
    isLoadingActivity,
    isLoadingSchedules,
    pendingCount,
    workspaceId,
    getAgentById,
    getLocalAgentById,
    getConversationById,
    fetchAgents,
    fetchAgent,
    hireAgent,
    unhireAgent,
    refreshAgents: fetchAgents,
    fetchConversations,
    createConversation,
    setCurrentConversation,
    fetchActivity,
    fetchPendingApprovals,
    approveExecution,
    rejectExecution,
    fetchSchedules,
    toggleSchedule,
    showHireAgent,
    setShowHireAgent,
    selectedAgentForHire,
    setSelectedAgentForHire,
  }

  return (
    <AgentsContext.Provider value={value}>
      {children}
    </AgentsContext.Provider>
  )
}
