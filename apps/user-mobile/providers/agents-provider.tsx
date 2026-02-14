import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "./auth-provider";
import { useWorkspace } from "./workspace-provider";
import * as agentsApi from "@/lib/api/agents";
import type {
  AIAgent,
  AgentWithHireStatus,
  LocalAgent,
  AgentConversation,
  AgentScheduleExecution,
  AgentSchedule,
  AgentFilters,
  ActivityFilters,
} from "@/lib/types/agents";

// ============================================================================
// Context Types
// ============================================================================

interface AgentsContextType {
  // State
  agents: AgentWithHireStatus[];
  myAgents: AgentWithHireStatus[];
  currentAgent: AIAgent | null;
  conversations: AgentConversation[];
  currentConversation: AgentConversation | null;
  executions: AgentScheduleExecution[];
  pendingApprovals: AgentScheduleExecution[];
  schedules: AgentSchedule[];
  pendingCount: number;
  workspaceId: string | undefined;

  // Loading states
  isLoading: boolean;
  isLoadingAgent: boolean;
  isLoadingActivity: boolean;
  isLoadingSchedules: boolean;

  // Lookup helpers
  getAgentById: (id: string) => AgentWithHireStatus | undefined;
  getLocalAgentById: (id: string) => AgentWithHireStatus | undefined;
  getConversationById: (id: string) => AgentConversation | undefined;

  // Agent actions
  fetchAgents: (filters?: AgentFilters) => Promise<void>;
  fetchAgent: (id: string) => Promise<AIAgent | null>;
  hireAgent: (agentId: string) => Promise<LocalAgent | null>;
  unhireAgent: (localAgentId: string) => Promise<void>;
  refreshAgents: () => Promise<void>;

  // Conversation actions
  fetchConversations: (agentId: string) => Promise<void>;
  createConversation: (
    agentId: string,
    title?: string
  ) => Promise<AgentConversation | null>;
  setCurrentConversation: (conversation: AgentConversation | null) => void;

  // Activity actions
  fetchActivity: (filters?: ActivityFilters) => Promise<void>;
  fetchPendingApprovals: () => Promise<void>;
  approveExecution: (executionId: string) => Promise<void>;
  rejectExecution: (executionId: string, reason?: string) => Promise<void>;

  // Schedule actions
  fetchSchedules: () => Promise<void>;
  toggleSchedule: (scheduleId: string, enabled: boolean) => Promise<void>;

  // Dialog state
  showHireAgent: boolean;
  setShowHireAgent: (show: boolean) => void;
  selectedAgentForHire: AIAgent | null;
  setSelectedAgentForHire: (agent: AIAgent | null) => void;
}

const AgentsContext = createContext<AgentsContextType | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

export function AgentsProvider({ children }: { children: React.ReactNode }) {
  const { currentWorkspace } = useWorkspace();
  const { session, isLoading: isAuthLoading } = useAuth();
  const workspaceId = currentWorkspace?.id;

  // State
  const [agents, setAgents] = useState<AgentWithHireStatus[]>([]);
  const [currentAgent, setCurrentAgent] = useState<AIAgent | null>(null);
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [currentConversation, setCurrentConversation] =
    useState<AgentConversation | null>(null);
  const [executions, setExecutions] = useState<AgentScheduleExecution[]>([]);
  const [schedules, setSchedules] = useState<AgentSchedule[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);

  // Dialog state
  const [showHireAgent, setShowHireAgent] = useState(false);
  const [selectedAgentForHire, setSelectedAgentForHire] =
    useState<AIAgent | null>(null);

  // Computed values
  const myAgents = useMemo(
    () => agents.filter((agent) => agent.isHired),
    [agents]
  );

  const pendingApprovals = useMemo(
    () => executions.filter((exec) => exec.status === "pending_approval"),
    [executions]
  );

  const pendingCount = pendingApprovals.length;

  // ============================================================================
  // Lookup Helpers
  // ============================================================================

  const getAgentById = useCallback(
    (id: string) => agents.find((agent) => agent.id === id),
    [agents]
  );

  const getLocalAgentById = useCallback(
    (id: string) => agents.find((agent) => agent.localAgentId === id),
    [agents]
  );

  const getConversationById = useCallback(
    (id: string) => conversations.find((conv) => conv.id === id),
    [conversations]
  );

  // ============================================================================
  // Agent Actions
  // ============================================================================

  const fetchAgents = useCallback(
    async (filters?: AgentFilters) => {
      if (!workspaceId || !session?.access_token || isAuthLoading) return;

      setIsLoading(true);
      try {
        const response = await agentsApi.getAgents(filters);
        setAgents(response.agents);
      } catch (error) {
        console.error("Failed to fetch agents:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, session?.access_token, isAuthLoading]
  );

  const fetchAgent = useCallback(
    async (id: string): Promise<AIAgent | null> => {
      if (!workspaceId) return null;

      setIsLoadingAgent(true);
      try {
        const response = await agentsApi.getAgent(id);
        setCurrentAgent(response.agent);
        return response.agent;
      } catch (error) {
        console.error("Failed to fetch agent:", error);
        return null;
      } finally {
        setIsLoadingAgent(false);
      }
    },
    [workspaceId]
  );

  const hireAgent = useCallback(
    async (agentId: string): Promise<LocalAgent | null> => {
      if (!workspaceId) return null;

      try {
        const localAgent = await agentsApi.hireAgent(agentId);
        // Refresh agents list to update hire status
        await fetchAgents();
        return localAgent;
      } catch (error) {
        console.error("Failed to hire agent:", error);
        return null;
      }
    },
    [workspaceId, fetchAgents]
  );

  const unhireAgent = useCallback(
    async (localAgentId: string) => {
      if (!workspaceId) return;

      try {
        await agentsApi.unhireAgent(localAgentId);
        // Refresh agents list to update hire status
        await fetchAgents();
      } catch (error) {
        console.error("Failed to unhire agent:", error);
      }
    },
    [workspaceId, fetchAgents]
  );

  const refreshAgents = useCallback(async () => {
    await fetchAgents();
  }, [fetchAgents]);

  // ============================================================================
  // Conversation Actions
  // ============================================================================

  const fetchConversations = useCallback(
    async (agentId: string) => {
      if (!workspaceId) return;

      try {
        const convList = await agentsApi.getAgentConversations(agentId);
        // Convert to full AgentConversation objects
        setConversations(
          convList.map((conv) => ({
            ...conv,
            agent_id: agentId,
            workspace_id: workspaceId,
            user_id: "", // Will be filled by backend
          }))
        );
      } catch (error) {
        console.error("Failed to fetch conversations:", error);
      }
    },
    [workspaceId]
  );

  const createConversation = useCallback(
    async (
      agentId: string,
      title?: string
    ): Promise<AgentConversation | null> => {
      if (!workspaceId) return null;

      try {
        const convItem = await agentsApi.createConversation(agentId, title);
        const conversation: AgentConversation = {
          ...convItem,
          agent_id: agentId,
          workspace_id: workspaceId,
          user_id: "",
        };
        setConversations((prev) => [conversation, ...prev]);
        return conversation;
      } catch (error) {
        console.error("Failed to create conversation:", error);
        return null;
      }
    },
    [workspaceId]
  );

  // ============================================================================
  // Activity Actions
  // ============================================================================

  const fetchActivity = useCallback(
    async (filters?: ActivityFilters) => {
      if (!workspaceId) return;

      setIsLoadingActivity(true);
      try {
        const response = await agentsApi.getAgentActivity(filters);
        setExecutions(response.executions);
      } catch (error) {
        console.error("Failed to fetch activity:", error);
      } finally {
        setIsLoadingActivity(false);
      }
    },
    [workspaceId]
  );

  const fetchPendingApprovals = useCallback(async () => {
    if (!workspaceId) return;

    setIsLoadingActivity(true);
    try {
      const response = await agentsApi.getPendingApprovals();
      // Merge pending into executions, replacing any with same ID
      setExecutions((prev) => {
        const pendingIds = new Set(response.executions.map((e) => e.id));
        const filtered = prev.filter((e) => !pendingIds.has(e.id));
        return [...response.executions, ...filtered];
      });
    } catch (error) {
      console.error("Failed to fetch pending approvals:", error);
    } finally {
      setIsLoadingActivity(false);
    }
  }, [workspaceId]);

  const approveExecution = useCallback(
    async (executionId: string) => {
      if (!workspaceId) return;

      try {
        const response = await agentsApi.approveExecution(executionId);
        // Update execution in state
        setExecutions((prev) =>
          prev.map((exec) =>
            exec.id === executionId ? response.execution : exec
          )
        );
      } catch (error) {
        console.error("Failed to approve execution:", error);
      }
    },
    [workspaceId]
  );

  const rejectExecution = useCallback(
    async (executionId: string, reason?: string) => {
      if (!workspaceId) return;

      try {
        const response = await agentsApi.rejectExecution(executionId, reason);
        // Update execution in state
        setExecutions((prev) =>
          prev.map((exec) =>
            exec.id === executionId ? response.execution : exec
          )
        );
      } catch (error) {
        console.error("Failed to reject execution:", error);
      }
    },
    [workspaceId]
  );

  // ============================================================================
  // Schedule Actions
  // ============================================================================

  const fetchSchedules = useCallback(async () => {
    if (!workspaceId) return;

    setIsLoadingSchedules(true);
    try {
      const response = await agentsApi.getAgentSchedules();
      setSchedules(response.schedules);
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
    } finally {
      setIsLoadingSchedules(false);
    }
  }, [workspaceId]);

  const toggleSchedule = useCallback(
    async (scheduleId: string, enabled: boolean) => {
      if (!workspaceId) return;

      try {
        const response = await agentsApi.toggleSchedule(scheduleId, enabled);
        // Update schedule in state
        setSchedules((prev) =>
          prev.map((sched) =>
            sched.id === scheduleId ? response.schedule : sched
          )
        );
      } catch (error) {
        console.error("Failed to toggle schedule:", error);
      }
    },
    [workspaceId]
  );

  // ============================================================================
  // Initial Load
  // ============================================================================

  // Track fetched workspace to avoid re-fetching
  const fetchedWorkspaceRef = useRef<string | null>(null);

  useEffect(() => {
    if (workspaceId && session?.access_token && !isAuthLoading && fetchedWorkspaceRef.current !== workspaceId) {
      fetchedWorkspaceRef.current = workspaceId;
      setIsLoading(true);
      fetchAgents();
      fetchPendingApprovals();
      fetchSchedules();
    } else if (!workspaceId || !session?.access_token) {
      fetchedWorkspaceRef.current = null;
      // Clear state when workspace changes
      setAgents([]);
      setCurrentAgent(null);
      setConversations([]);
      setCurrentConversation(null);
      setExecutions([]);
      setSchedules([]);
    }
  }, [workspaceId, session?.access_token, isAuthLoading, fetchAgents, fetchPendingApprovals, fetchSchedules]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: AgentsContextType = {
    // State
    agents,
    myAgents,
    currentAgent,
    conversations,
    currentConversation,
    executions,
    pendingApprovals,
    schedules,
    pendingCount,
    workspaceId,

    // Loading states
    isLoading,
    isLoadingAgent,
    isLoadingActivity,
    isLoadingSchedules,

    // Lookup helpers
    getAgentById,
    getLocalAgentById,
    getConversationById,

    // Agent actions
    fetchAgents,
    fetchAgent,
    hireAgent,
    unhireAgent,
    refreshAgents,

    // Conversation actions
    fetchConversations,
    createConversation,
    setCurrentConversation,

    // Activity actions
    fetchActivity,
    fetchPendingApprovals,
    approveExecution,
    rejectExecution,

    // Schedule actions
    fetchSchedules,
    toggleSchedule,

    // Dialog state
    showHireAgent,
    setShowHireAgent,
    selectedAgentForHire,
    setSelectedAgentForHire,
  };

  return (
    <AgentsContext.Provider value={value}>{children}</AgentsContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useAgents() {
  const context = useContext(AgentsContext);
  if (context === undefined) {
    throw new Error("useAgents must be used within an AgentsProvider");
  }
  return context;
}
