import { supabase } from "../supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiError, get, post } from "../api";
import type {
  AgentsListResponse,
  AgentDetailResponse,
  ActivityResponse,
  SchedulesResponse,
  AgentConversation,
  ConversationListItem,
  AgentMessage,
  LocalAgent,
  AgentSchedule,
  AgentScheduleExecution,
  AgentsQueryParams,
  ActivityQueryParams,
  AgentWithHireStatus,
  AIAgent,
  AgentTool,
} from "../types/agents";

const WORKSPACE_ID_KEY = "currentWorkspaceId";

interface DeployedAgentFallback {
  id: string;
  slug?: string;
  name: string;
  description?: string | null;
  avatar_url?: string | null;
  system_prompt?: string;
  model?: string;
  provider?: string;
  is_enabled?: boolean;
  department_id?: string | null;
  tools?: Array<{
    id: string;
    name: string;
    description?: string;
    category?: string;
  }>;
  skills?: Array<{
    id: string;
    name: string;
    content?: string;
  }>;
}

interface DeployedTeamConfigFallback {
  team?: {
    head_agent_id?: string | null;
  };
  agents?: DeployedAgentFallback[];
}

async function getWorkspaceId(): Promise<string | null> {
  return AsyncStorage.getItem(WORKSPACE_ID_KEY);
}

function shouldUseApiAuthFallback(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 401 || error.status === 403)
  );
}

async function getActivityFallback(
  params?: Omit<ActivityQueryParams, "workspaceId">
): Promise<ActivityResponse> {
  const workspaceId = await getWorkspaceId();
  if (!workspaceId) {
    return { executions: [], total: 0 };
  }

  let query = supabase
    .from("agent_schedule_executions")
    .select(
      `
        *,
        schedule:agent_schedules(id, name, cron_expression, task_prompt, workspace_id),
        agent:ai_agents(id, name, avatar_url)
      `,
      { count: "exact" }
    )
    .eq("schedule.workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (params?.agent_id) {
    query = query.eq("agent_id", params.agent_id);
  }
  if (params?.status) {
    query = query.eq("status", params.status);
  }
  if (params?.from_date) {
    query = query.gte("created_at", params.from_date);
  }
  if (params?.to_date) {
    query = query.lte("created_at", params.to_date);
  }

  const limit = params?.limit;
  const offset = params?.offset || 0;
  if (typeof limit === "number") {
    query = query.range(offset, offset + Math.max(limit, 1) - 1);
  } else if (offset > 0) {
    query = query.range(offset, offset + 49);
  }

  const { data, error, count } = await query;
  if (error) {
    console.warn(
      "[Agents API] Activity fallback query failed:",
      error.message || error
    );
    return { executions: [], total: 0 };
  }

  return {
    executions: (data || []) as AgentScheduleExecution[],
    total: count || 0,
  };
}

// ============================================================================
// Agent Discovery & Management
// ============================================================================

/**
 * List agents from the web API's deployed team config.
 * Uses the same /api/agents endpoint as the web app so mobile sees
 * the same agents that are actually deployed for the workspace.
 */
export async function getAgents(
  params?: Omit<AgentsQueryParams, "workspaceId">
): Promise<AgentsListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.set("search", params.search);
  if (params?.department_id) queryParams.set("department_id", params.department_id);
  if (params?.hired_only) queryParams.set("hired_only", "true");
  if (params?.limit) queryParams.set("limit", String(params.limit));
  if (params?.offset) queryParams.set("offset", String(params.offset));

  const qs = queryParams.toString();
  const endpoint = qs ? `/api/agents?${qs}` : "/api/agents";

  try {
    const data = await get<{ agents: AgentWithHireStatus[]; total: number }>(endpoint);
    return {
      agents: data.agents,
      total: data.total,
    };
  } catch (error) {
    // Fallback for environments where web API bearer auth is not configured correctly.
    if (!shouldUseApiAuthFallback(error)) {
      throw error;
    }

    const workspaceId = await getWorkspaceId();
    if (!workspaceId) {
      return { agents: [], total: 0 };
    }

    // First fallback: read deployed team config directly (same source web /api/agents uses).
    const { data: deployment } = await supabase
      .from("workspace_deployed_teams")
      .select("active_config, deployed_at")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .maybeSingle();

    const activeConfig = deployment?.active_config as DeployedTeamConfigFallback | null | undefined;
    const deployedAt = deployment?.deployed_at || new Date().toISOString();
    if (activeConfig?.agents && activeConfig.agents.length > 0) {
      let deployedAgents: AgentWithHireStatus[] = activeConfig.agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        slug: agent.slug || null,
        description: agent.description || null,
        user_description: null,
        department_id: agent.department_id || null,
        avatar_url: agent.avatar_url || null,
        model: ((agent.model || "sonnet") as "sonnet" | "opus" | "haiku"),
        system_prompt: agent.system_prompt || "",
        permission_mode: "default",
        max_turns: 10,
        is_enabled: true,
        is_head: activeConfig.team?.head_agent_id === agent.id,
        config: {},
        current_version: 1,
        published_version: 1,
        created_at: deployedAt,
        updated_at: deployedAt,
        isHired: agent.is_enabled !== false,
        localAgentId: agent.id,
        hiredAt: agent.is_enabled !== false ? deployedAt : null,
      }));

      if (params?.search) {
        const searchLower = params.search.toLowerCase();
        deployedAgents = deployedAgents.filter(
          (a) =>
            a.name.toLowerCase().includes(searchLower) ||
            (a.description?.toLowerCase().includes(searchLower) ?? false)
        );
      }

      if (params?.hired_only) {
        deployedAgents = deployedAgents.filter((a) => a.isHired);
      }

      const offset = params?.offset || 0;
      const limit = params?.limit || deployedAgents.length;
      const total = deployedAgents.length;
      const paged = deployedAgents.slice(offset, offset + limit);

      return { agents: paged, total };
    }

    const { data: localAgents, error: localError } = await supabase
      .from("agents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (localError) {
      throw new Error(localError.message);
    }

    const localList = (localAgents || []) as LocalAgent[];
    const localByAiId = new Map<string, LocalAgent>();
    for (const localAgent of localList) {
      const key = localAgent.ai_agent_id || localAgent.id;
      localByAiId.set(key, localAgent);
    }

    let mergedAgents: AgentWithHireStatus[] = [];

    // Prefer full catalog from ai_agents when readable.
    const { data: aiAgents, error: aiError } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("is_enabled", true)
      .order("created_at", { ascending: false });

    if (!aiError && aiAgents && aiAgents.length > 0 && !params?.hired_only) {
      mergedAgents = (aiAgents as AIAgent[]).map((agent) => {
        const localAgent = localByAiId.get(agent.id) || null;
        return {
          ...agent,
          isHired: !!localAgent,
          localAgentId: localAgent?.id || null,
          hiredAt: localAgent?.hired_at || null,
        };
      });
    } else {
      // Local-only fallback (still shows hired agents).
      mergedAgents = localList.map((localAgent) => ({
        id: localAgent.ai_agent_id || localAgent.id,
        name: localAgent.name,
        slug: null,
        description: localAgent.description,
        user_description: null,
        department_id: null,
        avatar_url: localAgent.avatar_url,
        model: (localAgent.model as "sonnet" | "opus" | "haiku") || "sonnet",
        system_prompt: localAgent.system_prompt || "",
        permission_mode: "default",
        max_turns: 10,
        is_enabled: !!localAgent.is_active,
        is_head: false,
        config: {},
        current_version: 1,
        published_version: 1,
        created_at: localAgent.created_at,
        updated_at: localAgent.updated_at,
        isHired: true,
        localAgentId: localAgent.id,
        hiredAt: localAgent.hired_at || null,
      }));
    }

    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      mergedAgents = mergedAgents.filter(
        (a) =>
          a.name.toLowerCase().includes(searchLower) ||
          (a.description?.toLowerCase().includes(searchLower) ?? false)
      );
    }

    if (params?.hired_only) {
      mergedAgents = mergedAgents.filter((a) => a.isHired);
    }

    const offset = params?.offset || 0;
    const limit = params?.limit || mergedAgents.length;
    const total = mergedAgents.length;
    const paged = mergedAgents.slice(offset, offset + limit);

    return { agents: paged, total };
  }
}

/**
 * Get single agent details with hire status.
 * Queries ai_agents first, then checks agents for hire status.
 */
export async function getAgent(id: string): Promise<AgentDetailResponse> {
  const workspaceId = await getWorkspaceId();

  // First try to find in ai_agents (global catalog)
  // Use .limit(1) instead of .single() because .single() may return empty arrays in some Supabase versions
  const { data: aiAgentArray, error: aiError } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("id", id)
    .limit(1);

  // Extract first element if array, otherwise use as-is
  const aiAgent = Array.isArray(aiAgentArray) ? aiAgentArray[0] : aiAgentArray;

  // Check if we got a valid agent object
  const isValidAiAgent = aiAgent && aiAgent.id;

  if (aiError || !isValidAiAgent) {
    // If not found in ai_agents, try agents table directly (for local agent ID)
    const { data: localAgentArray, error: localError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", id)
      .limit(1);

    // Extract first element if array
    const localAgentData = Array.isArray(localAgentArray) ? localAgentArray[0] : localAgentArray;

    // Validate local agent data
    const isValidLocalAgent = localAgentData && localAgentData.id;

    if (localError || !isValidLocalAgent) {
      throw new Error("Agent not found");
    }

    // Convert local agent to AIAgent format
    const agent = {
      id: localAgentData.ai_agent_id || localAgentData.id,
      name: localAgentData.name,
      slug: null,
      description: localAgentData.description,
      user_description: null,
      department_id: null,
      avatar_url: localAgentData.avatar_url,
      model: localAgentData.model as "sonnet" | "opus" | "haiku",
      system_prompt: localAgentData.system_prompt,
      permission_mode: "default" as const,
      max_turns: 10,
      is_enabled: localAgentData.is_active,
      is_head: false,
      config: {},
      current_version: 1,
      published_version: 1,
      created_at: localAgentData.created_at,
      updated_at: localAgentData.updated_at,
    };

    return {
      agent,
      localAgent: localAgentData,
      isHired: true,
    };
  }

  // Check if hired in this workspace
  let localAgent: LocalAgent | null = null;
  if (workspaceId) {
    const { data: hiredArray } = await supabase
      .from("agents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("ai_agent_id", id)
      .eq("is_active", true)
      .limit(1);

    // Extract first element if array
    const hired = Array.isArray(hiredArray) ? hiredArray[0] : hiredArray;

    // Validate hired data
    if (hired && hired.id) {
      localAgent = hired;
    }
  }

  return {
    agent: aiAgent,
    localAgent,
    isHired: !!localAgent,
  };
}

/**
 * Hire an agent (create local workspace record from ai_agents catalog)
 */
export async function hireAgent(id: string): Promise<LocalAgent> {
  const workspaceId = await getWorkspaceId();
  if (!workspaceId) {
    throw new Error("No workspace selected");
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  const user = session.user;

  // Get the ai_agent details from global catalog
  const { data: aiAgent, error: aiError } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("id", id)
    .single();

  if (aiError || !aiAgent) {
    throw new Error("Agent not found");
  }

  // Check if already hired
  const { data: existing } = await supabase
    .from("agents")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("ai_agent_id", id)
    .eq("is_active", true)
    .single();

  if (existing) {
    throw new Error("Agent already hired");
  }

  // Create local agent record
  const { data: localAgent, error: insertError } = await supabase
    .from("agents")
    .insert({
      workspace_id: workspaceId,
      ai_agent_id: id,
      name: aiAgent.name,
      description: aiAgent.description,
      avatar_url: aiAgent.avatar_url,
      system_prompt: aiAgent.system_prompt,
      tools: aiAgent.config?.tools || [],
      model: aiAgent.model,
      is_active: true,
      created_by: user.id,
      hired_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return localAgent;
}

/**
 * Unhire an agent (soft delete)
 */
export async function unhireAgent(id: string): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from("agents")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
}

// ============================================================================
// Agent Activity & Executions
// ============================================================================

/**
 * List execution history for hired agents
 */
export async function getAgentActivity(
  params?: Omit<ActivityQueryParams, "workspaceId">
): Promise<ActivityResponse> {
  const queryParams = new URLSearchParams();
  if (params?.agent_id) queryParams.set("agent_id", params.agent_id);
  if (params?.status) queryParams.set("status", params.status);
  if (params?.from_date) queryParams.set("from_date", params.from_date);
  if (params?.to_date) queryParams.set("to_date", params.to_date);
  if (params?.limit) queryParams.set("limit", String(params.limit));
  if (params?.offset) queryParams.set("offset", String(params.offset));

  const qs = queryParams.toString();
  const endpoint = qs ? `/api/agents/activity?${qs}` : "/api/agents/activity";

  try {
    const data = await get<ActivityResponse>(endpoint);
    return {
      executions: data.executions || [],
      total: data.total || 0,
    };
  } catch (error) {
    if (shouldUseApiAuthFallback(error)) {
      console.warn(
        "[Agents API] Falling back to direct activity query due API auth error:",
        error
      );
      return getActivityFallback(params);
    }
    throw error;
  }
}

/**
 * Get pending approvals
 */
export async function getPendingApprovals(): Promise<ActivityResponse> {
  try {
    const data = await get<ActivityResponse>("/api/agents/activity/pending");
    return {
      executions: data.executions || [],
      total: data.total || 0,
    };
  } catch (error) {
    if (shouldUseApiAuthFallback(error)) {
      console.warn(
        "[Agents API] Falling back to direct pending query due API auth error:",
        error
      );
      return getActivityFallback({ status: "pending_approval" });
    }
    throw error;
  }
}

/**
 * Approve a pending execution
 */
export async function approveExecution(
  id: string
): Promise<{ execution: AgentScheduleExecution; message: string }> {
  return post<{ execution: AgentScheduleExecution; message: string }>(
    `/api/agents/activity/${id}/approve`
  );
}

/**
 * Reject a pending execution
 */
export async function rejectExecution(
  id: string,
  reason?: string
): Promise<{ execution: AgentScheduleExecution; message: string }> {
  return post<{ execution: AgentScheduleExecution; message: string }>(
    `/api/agents/activity/${id}/reject`,
    { reason }
  );
}

// ============================================================================
// Agent Schedules
// ============================================================================

/**
 * List schedules for hired agents
 */
export async function getAgentSchedules(): Promise<SchedulesResponse> {
  try {
    const data = await get<SchedulesResponse>("/api/agents/schedules");
    return {
      schedules: data.schedules || [],
      total: data.total || 0,
    };
  } catch {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) {
      return { schedules: [], total: 0 };
    }

    const { data, error: fallbackError, count } = await supabase
      .from("agent_schedules")
      .select(
        `
        *,
        agent:ai_agents(id, name, avatar_url, tier_required)
      `,
        { count: "exact" }
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (fallbackError) {
      throw new Error(fallbackError.message);
    }

    return {
      schedules: (data || []) as AgentSchedule[],
      total: count || 0,
    };
  }
}

/**
 * Toggle schedule enabled/disabled
 */
export async function toggleSchedule(
  id: string,
  is_enabled: boolean
): Promise<{ schedule: AgentSchedule }> {
  throw new Error("Not implemented");
}

// ============================================================================
// Agent Conversations
// ============================================================================

/**
 * List conversations for an agent
 */
export async function getAgentConversations(
  agentId: string
): Promise<ConversationListItem[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  const user = session.user;

  const { data, error } = await supabase
    .from("agent_conversations")
    .select("id, title, created_at, updated_at")
    .eq("agent_id", agentId)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Create a new conversation
 */
export async function createConversation(
  agentId: string,
  title?: string
): Promise<ConversationListItem> {
  const workspaceId = await getWorkspaceId();
  const { data: { session } } = await supabase.auth.getSession();

  if (!workspaceId || !session?.user) {
    throw new Error("Not authenticated or no workspace");
  }
  const user = session.user;

  const { data, error } = await supabase
    .from("agent_conversations")
    .insert({
      agent_id: agentId,
      workspace_id: workspaceId,
      user_id: user.id,
      title,
    })
    .select("id, title, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Get conversation with messages
 */
export async function getConversation(
  id: string
): Promise<AgentConversation> {
  const { data: conversation, error } = await supabase
    .from("agent_conversations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { data: messages } = await supabase
    .from("agent_messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  return {
    ...conversation,
    messages: messages || [],
  };
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  id: string,
  title: string
): Promise<AgentConversation> {
  const { data, error } = await supabase
    .from("agent_conversations")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Delete conversation
 */
export async function deleteConversation(
  id: string
): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from("agent_conversations")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
}

/**
 * Save messages to conversation
 */
export async function saveMessages(
  conversationId: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<{ messages: AgentMessage[] }> {
  const { data, error } = await supabase
    .from("agent_messages")
    .insert(
      messages.map(m => ({
        conversation_id: conversationId,
        role: m.role,
        content: m.content,
      }))
    )
    .select();

  if (error) {
    throw new Error(error.message);
  }

  // Update conversation timestamp
  await supabase
    .from("agent_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return { messages: data };
}

// ============================================================================
// Agent Tools
// ============================================================================

/**
 * Fetch tools for a specific agent
 */
export async function getAgentTools(agentId: string): Promise<AgentTool[]> {
  const { data, error } = await supabase
    .from("ai_agent_tools")
    .select("tool:agent_tools(*)")
    .eq("ai_agent_id", agentId);

  if (error) {
    throw new Error(error.message);
  }

  // Flatten the response - each item has a `tool` property with the AgentTool
  // Use explicit any type for Supabase's inferred response format
  return (data || [])
    .map((item: any) => item.tool as AgentTool | null)
    .filter((tool): tool is AgentTool => tool !== null);
}

// ============================================================================
// Dashboard Stats Helper
// ============================================================================

export interface DashboardStats {
  hiredAgents: number;
  pendingApprovals: number;
  completedTasks: number;
  activeSchedules: number;
}

/**
 * Fetch all dashboard stats in parallel
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [agents, pending, activity, schedules] = await Promise.all([
    getAgents({ hired_only: true }).catch((): AgentsListResponse => ({ agents: [], total: 0 })),
    getPendingApprovals().catch((): ActivityResponse => ({ executions: [], total: 0 })),
    getAgentActivity({ status: "completed", limit: 1 }).catch((): ActivityResponse => ({ executions: [], total: 0 })),
    getAgentSchedules().catch((): SchedulesResponse => ({ schedules: [], total: 0 })),
  ]);

  return {
    hiredAgents: agents.total,
    pendingApprovals: pending.total,
    completedTasks: activity.total,
    activeSchedules: schedules.schedules.filter((s) => s.is_enabled).length,
  };
}

// ============================================================================
// Agent Chat Streaming
// ============================================================================

/**
 * Chat with an agent via SSE streaming using XMLHttpRequest.
 * Uses XHR instead of fetch because React Native's fetch polyfill
 * buffers streaming responses instead of delivering them incrementally.
 * 
 * @param onChunk - Callback for each chunk of data received
 * @param onError - Callback for errors
 * @param onComplete - Callback when stream completes
 * @returns Abort function to cancel the request
 */
export async function chatWithAgentStreaming(
  agentId: string,
  message: string,
  workspaceId: string,
  conversationId: string | undefined,
  onChunk: (chunk: string) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): Promise<() => void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const AGENT_SERVER_URL = process.env.EXPO_PUBLIC_AGENT_SERVER_URL!;

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    let lastIndex = 0;

    xhr.open("POST", `${AGENT_SERVER_URL}/agent-chat`, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    if (session?.access_token) {
      xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    }

    xhr.onprogress = () => {
      // Get only the new data since last progress event
      const newData = xhr.responseText.substring(lastIndex);
      lastIndex = xhr.responseText.length;
      
      if (newData) {
        onChunk(newData);
      }
    };

    xhr.onload = () => {
      // Process any remaining data
      const remainingData = xhr.responseText.substring(lastIndex);
      if (remainingData) {
        onChunk(remainingData);
      }
      
      if (xhr.status >= 200 && xhr.status < 300) {
        onComplete();
      } else {
        onError(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      onError(new Error("Network error"));
    };

    xhr.ontimeout = () => {
      onError(new Error("Request timeout"));
    };

    xhr.send(JSON.stringify({
      message,
      agentId,
      workspaceId,
      conversationId,
    }));

    // Return abort function
    resolve(() => {
      xhr.abort();
    });
  });
}

/**
 * @deprecated Use chatWithAgentStreaming instead for proper real-time streaming.
 * This function uses fetch which buffers responses in React Native.
 */
export async function chatWithAgent(
  agentId: string,
  message: string,
  workspaceId: string,
  conversationId?: string
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const AGENT_SERVER_URL = process.env.EXPO_PUBLIC_AGENT_SERVER_URL!;

  const response = await fetch(`${AGENT_SERVER_URL}/agent-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: session ? `Bearer ${session.access_token}` : "",
    },
    body: JSON.stringify({
      message,
      agentId,
      workspaceId,
      conversationId,
    }),
  });

  return response;
}
