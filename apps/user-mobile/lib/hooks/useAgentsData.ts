import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import type {
  AgentsListResponse,
  AgentDetailResponse,
  ActivityResponse,
  SchedulesResponse,
  ConversationListItem,
  AgentConversation,
  ScheduleExecutionStatus,
  AgentTool,
} from "../types/agents";
import * as agentsApi from "../api/agents";
import type { DashboardStats } from "../api/agents";

// Query keys
export const agentsKeys = {
  all: ["agents"] as const,
  lists: () => [...agentsKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...agentsKeys.lists(), filters] as const,
  hired: () => [...agentsKeys.all, "hired"] as const,
  details: () => [...agentsKeys.all, "detail"] as const,
  detail: (id: string) => [...agentsKeys.details(), id] as const,
  tools: (agentId: string) => [...agentsKeys.all, "tools", agentId] as const,
  activity: () => [...agentsKeys.all, "activity"] as const,
  activityList: (filters?: Record<string, unknown>) =>
    [...agentsKeys.activity(), filters] as const,
  pending: () => [...agentsKeys.all, "pending"] as const,
  schedules: () => [...agentsKeys.all, "schedules"] as const,
  conversations: (agentId: string) =>
    [...agentsKeys.all, "conversations", agentId] as const,
  conversation: (id: string) =>
    [...agentsKeys.all, "conversation", id] as const,
  dashboardStats: () => [...agentsKeys.all, "dashboardStats"] as const,
};

// ============================================================================
// Agents List & Detail
// ============================================================================

export function useAgentsList(params?: {
  search?: string;
  category?: string;
  department_id?: string;
  hired_only?: boolean;
}) {
  const { session, isLoading: isAuthLoading } = useAuth();
  const { currentWorkspace, isLoading: isWorkspaceLoading } = useWorkspace();

  return useQuery<AgentsListResponse>({
    queryKey: agentsKeys.list(params),
    queryFn: () => agentsApi.getAgents(params),
    enabled:
      !!session?.access_token &&
      !!currentWorkspace?.id &&
      !isAuthLoading &&
      !isWorkspaceLoading,
  });
}

export function useHiredAgents() {
  const { session, isLoading: isAuthLoading } = useAuth();
  const { currentWorkspace, isLoading: isWorkspaceLoading } = useWorkspace();

  return useQuery<AgentsListResponse>({
    queryKey: agentsKeys.hired(),
    queryFn: () => agentsApi.getAgents({ hired_only: true }),
    enabled:
      !!session?.access_token &&
      !!currentWorkspace?.id &&
      !isAuthLoading &&
      !isWorkspaceLoading,
  });
}

export function useAgentDetail(id: string | undefined) {
  return useQuery<AgentDetailResponse>({
    queryKey: agentsKeys.detail(id!),
    queryFn: () => agentsApi.getAgent(id!),
    enabled: !!id,
  });
}

export function useAgentTools(agentId: string | null) {
  return useQuery<AgentTool[]>({
    queryKey: agentsKeys.tools(agentId!),
    queryFn: () => agentsApi.getAgentTools(agentId!),
    enabled: !!agentId,
  });
}

// ============================================================================
// Hire / Unhire
// ============================================================================

export function useHireAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agentId: string) => agentsApi.hireAgent(agentId),
    onSuccess: () => {
      // Invalidate all agent lists to refresh hire status
      queryClient.invalidateQueries({ queryKey: agentsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: agentsKeys.hired() });
      queryClient.invalidateQueries({ queryKey: agentsKeys.dashboardStats() });
    },
  });
}

export function useUnhireAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agentId: string) => agentsApi.unhireAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: agentsKeys.hired() });
      queryClient.invalidateQueries({ queryKey: agentsKeys.dashboardStats() });
    },
  });
}

// ============================================================================
// Activity & Executions
// ============================================================================

export function useAgentActivity(params?: {
  agent_id?: string;
  status?: ScheduleExecutionStatus;
  from_date?: string;
  to_date?: string;
  limit?: number;
}) {
  const { session, isLoading: isAuthLoading } = useAuth();
  const { currentWorkspace, isLoading: isWorkspaceLoading } = useWorkspace();

  return useQuery<ActivityResponse>({
    queryKey: agentsKeys.activityList(params),
    queryFn: () => agentsApi.getAgentActivity(params),
    enabled:
      !!session?.access_token &&
      !!currentWorkspace?.id &&
      !isAuthLoading &&
      !isWorkspaceLoading,
    staleTime: 0,
    refetchOnMount: "always",
    retry: 1,
  });
}

export function usePendingApprovals() {
  const { session, isLoading: isAuthLoading } = useAuth();
  const { currentWorkspace, isLoading: isWorkspaceLoading } = useWorkspace();

  return useQuery<ActivityResponse>({
    queryKey: agentsKeys.pending(),
    queryFn: () => agentsApi.getPendingApprovals(),
    enabled:
      !!session?.access_token &&
      !!currentWorkspace?.id &&
      !isAuthLoading &&
      !isWorkspaceLoading,
    staleTime: 0,
    refetchOnMount: "always",
    retry: 1,
  });
}

export function useApproveExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (executionId: string) =>
      agentsApi.approveExecution(executionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentsKeys.pending() });
      queryClient.invalidateQueries({ queryKey: agentsKeys.activity() });
      queryClient.invalidateQueries({ queryKey: agentsKeys.dashboardStats() });
    },
  });
}

export function useRejectExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      agentsApi.rejectExecution(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentsKeys.pending() });
      queryClient.invalidateQueries({ queryKey: agentsKeys.activity() });
      queryClient.invalidateQueries({ queryKey: agentsKeys.dashboardStats() });
    },
  });
}

// ============================================================================
// Schedules
// ============================================================================

export function useAgentSchedules() {
  const { session, isLoading: isAuthLoading } = useAuth();
  const { currentWorkspace, isLoading: isWorkspaceLoading } = useWorkspace();

  return useQuery<SchedulesResponse>({
    queryKey: agentsKeys.schedules(),
    queryFn: () => agentsApi.getAgentSchedules(),
    enabled:
      !!session?.access_token &&
      !!currentWorkspace?.id &&
      !isAuthLoading &&
      !isWorkspaceLoading,
  });
}

export function useToggleSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      agentsApi.toggleSchedule(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentsKeys.schedules() });
      queryClient.invalidateQueries({ queryKey: agentsKeys.dashboardStats() });
    },
  });
}

// ============================================================================
// Conversations
// ============================================================================

export function useAgentConversations(agentId: string | undefined) {
  const { session, isLoading: isAuthLoading } = useAuth();
  const { currentWorkspace, isLoading: isWorkspaceLoading } = useWorkspace();

  return useQuery<ConversationListItem[]>({
    queryKey: agentsKeys.conversations(agentId!),
    queryFn: () => agentsApi.getAgentConversations(agentId!),
    enabled:
      !!agentId &&
      !!session?.access_token &&
      !!currentWorkspace?.id &&
      !isAuthLoading &&
      !isWorkspaceLoading,
  });
}

export function useConversation(id: string | undefined) {
  const { session, isLoading: isAuthLoading } = useAuth();
  const { currentWorkspace, isLoading: isWorkspaceLoading } = useWorkspace();

  return useQuery<AgentConversation>({
    queryKey: agentsKeys.conversation(id!),
    queryFn: () => agentsApi.getConversation(id!),
    enabled:
      !!id &&
      !!session?.access_token &&
      !!currentWorkspace?.id &&
      !isAuthLoading &&
      !isWorkspaceLoading,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agentId, title }: { agentId: string; title?: string }) =>
      agentsApi.createConversation(agentId, title),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: agentsKeys.conversations(variables.agentId),
      });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => agentsApi.deleteConversation(id),
    onSuccess: () => {
      // Invalidate all conversation lists
      queryClient.invalidateQueries({ queryKey: agentsKeys.all });
    },
  });
}

// ============================================================================
// Dashboard Stats
// ============================================================================

export function useDashboardStats() {
  const { session, isLoading: isAuthLoading } = useAuth();
  const { currentWorkspace, isLoading: isWorkspaceLoading } = useWorkspace();

  return useQuery<DashboardStats>({
    queryKey: agentsKeys.dashboardStats(),
    queryFn: () => agentsApi.getDashboardStats(),
    enabled:
      !!session?.access_token &&
      !!currentWorkspace?.id &&
      !isAuthLoading &&
      !isWorkspaceLoading,
  });
}
