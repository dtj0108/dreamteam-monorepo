"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from "react"
import { useUser } from "@/hooks/use-user"
import type {
  AIAgent,
  AgentWithHireStatus,
  AgentDepartment,
  LocalAgent,
  AgentSchedule,
  AgentScheduleExecution,
  AgentConversation,
  AgentFilters,
  ActivityFilters,
  ScheduleFilters,
} from "@/lib/types/agents"

interface AgentOrganization {
  department_assignments: Record<string, string | null>
  position_order: string[]
}

interface AgentsContextType {
  // Agent Directory (from deployed teams or ai_agents table)
  agents: AgentWithHireStatus[]
  myAgents: AgentWithHireStatus[] // Agents that are enabled (hired)
  enabledAgents: AgentWithHireStatus[] // Alias for myAgents
  planAgents: AgentWithHireStatus[] // All agents in the plan (enabled or not)
  currentAgent: AIAgent | null
  isLoading: boolean
  isLoadingAgent: boolean

  // Departments & Organization
  departments: AgentDepartment[]
  agentOrganization: AgentOrganization
  getAgentsByDepartment: () => Map<string | null, AgentWithHireStatus[]>

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
  toggleAgent: (agentId: string, enabled: boolean) => Promise<void>
  refreshAgents: () => Promise<void>

  // Organization actions (drag & drop)
  reorderAgents: (agentIds: string[]) => Promise<void>
  moveAgentToDepartment: (agentId: string, departmentId: string | null) => Promise<void>

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
  createSchedule: (data: {
    agent_id: string
    name: string
    description?: string
    cron_expression: string
    timezone?: string
    task_prompt: string
    requires_approval?: boolean
  }) => Promise<AgentSchedule | null>
  updateSchedule: (id: string, data: {
    name?: string
    description?: string
    cron_expression?: string
    timezone?: string
    task_prompt?: string
    requires_approval?: boolean
  }) => Promise<AgentSchedule | null>
  deleteSchedule: (id: string) => Promise<void>

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

  // Departments & Organization
  const [departments, setDepartments] = useState<AgentDepartment[]>([])
  const [agentOrganization, setAgentOrganization] = useState<AgentOrganization>({
    department_assignments: {},
    position_order: [],
  })

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
  const myAgents = agents.filter(a => a.isHired) // Hired = enabled in deployed team or has local agent record
  const enabledAgents = myAgents // Alias
  const planAgents = agents.filter(a => (a as AgentWithHireStatus & { isInPlan?: boolean }).isInPlan) // Agents from plan (may include disabled)
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
        // Also set departments and organization if returned
        if (data.departments) {
          setDepartments(data.departments)
        }
        if (data.organization) {
          setAgentOrganization(data.organization)
        }
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

  // Unhire an agent (soft delete local record or disable in deployed team)
  const unhireAgent = async (localAgentId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/agents/${localAgentId}/unhire?workspaceId=${workspaceId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to unhire agent")
      }

      // Update local state to mark agent as not hired/disabled
      setAgents(prev => prev.map(a =>
        a.localAgentId === localAgentId || a.id === localAgentId
          ? { ...a, isHired: false, isEnabled: false, hiredAt: null }
          : a
      ))
    } catch (error) {
      console.error("Failed to unhire agent:", error)
      throw error
    }
  }

  // Toggle agent enabled/disabled state (for deployed team agents)
  const toggleAgent = async (agentId: string, enabled: boolean): Promise<void> => {
    if (!workspaceId) {
      throw new Error("No workspace selected")
    }

    try {
      const response = await fetch(`/api/agents/${agentId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, enabled }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to toggle agent")
      }

      // Update local state
      setAgents(prev => prev.map(a =>
        a.id === agentId
          ? {
              ...a,
              isHired: enabled,
              isEnabled: enabled,
              hiredAt: enabled ? new Date().toISOString() : null
            }
          : a
      ))
    } catch (error) {
      console.error("Failed to toggle agent:", error)
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

  // Create a new schedule
  const createSchedule = async (data: {
    agent_id: string
    name: string
    description?: string
    cron_expression: string
    timezone?: string
    task_prompt: string
    requires_approval?: boolean
  }): Promise<AgentSchedule | null> => {
    if (!workspaceId) return null

    try {
      const response = await fetch("/api/agents/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, workspaceId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create schedule")
      }

      // Add to local state
      setSchedules(prev => [result.schedule, ...prev])
      return result.schedule
    } catch (error) {
      console.error("Failed to create schedule:", error)
      throw error
    }
  }

  // Update an existing schedule
  const updateSchedule = async (id: string, data: {
    name?: string
    description?: string
    cron_expression?: string
    timezone?: string
    task_prompt?: string
    requires_approval?: boolean
  }): Promise<AgentSchedule | null> => {
    try {
      const response = await fetch(`/api/agents/schedules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update schedule")
      }

      // Update local state
      setSchedules(prev => prev.map(s =>
        s.id === id ? result.schedule : s
      ))
      return result.schedule
    } catch (error) {
      console.error("Failed to update schedule:", error)
      throw error
    }
  }

  // Delete a schedule
  const deleteSchedule = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/agents/schedules/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete schedule")
      }

      // Remove from local state
      setSchedules(prev => prev.filter(s => s.id !== id))
    } catch (error) {
      console.error("Failed to delete schedule:", error)
      throw error
    }
  }

  // Get agents grouped by department
  const getAgentsByDepartment = useCallback((): Map<string | null, AgentWithHireStatus[]> => {
    const grouped = new Map<string | null, AgentWithHireStatus[]>()

    // Initialize with empty arrays for all known departments
    departments.forEach(dept => {
      grouped.set(dept.id, [])
    })
    grouped.set(null, []) // General/Uncategorized

    // Group agents
    agents.forEach(agent => {
      // Check organization for department assignment override
      const deptId = agentOrganization.department_assignments[agent.id] ?? agent.department_id ?? null
      const existing = grouped.get(deptId) || []
      grouped.set(deptId, [...existing, agent])
    })

    // Sort agents within each group by position order
    if (agentOrganization.position_order.length > 0) {
      const positionMap = new Map(
        agentOrganization.position_order.map((id, index) => [id, index])
      )
      grouped.forEach((groupAgents, deptId) => {
        const sorted = [...groupAgents].sort((a, b) => {
          const posA = positionMap.get(a.id) ?? Number.MAX_SAFE_INTEGER
          const posB = positionMap.get(b.id) ?? Number.MAX_SAFE_INTEGER
          return posA - posB
        })
        grouped.set(deptId, sorted)
      })
    }

    return grouped
  }, [agents, departments, agentOrganization])

  // Reorder agents (update position order)
  const reorderAgents = async (agentIds: string[]): Promise<void> => {
    if (!workspaceId) {
      throw new Error("No workspace selected")
    }

    // Optimistic update
    const previousOrganization = { ...agentOrganization }
    const newOrganization = {
      ...agentOrganization,
      position_order: agentIds,
    }
    setAgentOrganization(newOrganization)

    try {
      const response = await fetch("/api/agents/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization: newOrganization }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to reorder agents")
      }
    } catch (error) {
      // Rollback on failure
      setAgentOrganization(previousOrganization)
      console.error("Failed to reorder agents:", error)
      throw error
    }
  }

  // Move agent to a different department
  const moveAgentToDepartment = async (agentId: string, departmentId: string | null): Promise<void> => {
    if (!workspaceId) {
      throw new Error("No workspace selected")
    }

    // Optimistic update
    const previousOrganization = { ...agentOrganization }
    const newDepartmentAssignments = {
      ...agentOrganization.department_assignments,
      [agentId]: departmentId,
    }
    const newOrganization = {
      ...agentOrganization,
      department_assignments: newDepartmentAssignments,
    }
    setAgentOrganization(newOrganization)

    // Also update the agent in state
    setAgents(prev => prev.map(a =>
      a.id === agentId ? { ...a, department_id: departmentId } : a
    ))

    try {
      const response = await fetch("/api/agents/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization: newOrganization }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to move agent")
      }
    } catch (error) {
      // Rollback on failure
      setAgentOrganization(previousOrganization)
      setAgents(prev => prev.map(a =>
        a.id === agentId ? { ...a, department_id: previousOrganization.department_assignments[agentId] ?? a.department_id } : a
      ))
      console.error("Failed to move agent:", error)
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
    enabledAgents,
    planAgents,
    currentAgent,
    isLoading,
    isLoadingAgent,
    departments,
    agentOrganization,
    getAgentsByDepartment,
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
    toggleAgent,
    refreshAgents: fetchAgents,
    reorderAgents,
    moveAgentToDepartment,
    fetchConversations,
    createConversation,
    setCurrentConversation,
    fetchActivity,
    fetchPendingApprovals,
    approveExecution,
    rejectExecution,
    fetchSchedules,
    toggleSchedule,
    createSchedule,
    updateSchedule,
    deleteSchedule,
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
