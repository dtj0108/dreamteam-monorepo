import { supabase } from "../supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

async function getWorkspaceId(): Promise<string | null> {
  return AsyncStorage.getItem(WORKSPACE_ID_KEY);
}

// ============================================================================
// Agent Discovery & Management
// ============================================================================

/**
 * List agents from `ai_agents` table (global catalog) with hire status.
 * Queries both ai_agents and agents tables, merges them.
 */
export async function getAgents(
  params?: Omit<AgentsQueryParams, "workspaceId">
): Promise<AgentsListResponse> {
  const workspaceId = await getWorkspaceId();

  // STEP 1: Query ai_agents (global catalog)
  let query = supabase
    .from("ai_agents")
    .select("*", { count: "exact" })
    .eq("is_enabled", true);

  if (params?.search) {
    query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }
  if (params?.department_id) {
    query = query.eq("department_id", params.department_id);
  }
  if (params?.limit) {
    query = query.limit(params.limit);
  }
  if (params?.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
  }

  const { data: aiAgents, error: aiError, count } = await query;

  if (aiError) {
    throw new Error(aiError.message);
  }

  // STEP 2: Query agents (workspace hired copies)
  let hiredAgents: LocalAgent[] = [];
  if (workspaceId) {
    const { data: hired, error: hiredError } = await supabase
      .from("agents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    if (!hiredError && hired) {
      hiredAgents = hired;
    }
  }

  // STEP 3: Merge - add hire status to each ai_agent
  const hiredMap = new Map(hiredAgents.map(a => [a.ai_agent_id, a]));

  let agents: AgentWithHireStatus[] = (aiAgents || []).map((agent: AIAgent) => {
    const localAgent = hiredMap.get(agent.id);
    return {
      ...agent,
      isHired: !!localAgent,
      localAgentId: localAgent?.id || null,
      hiredAt: localAgent?.hired_at || null,
    };
  });

  // Filter to hired only if requested
  if (params?.hired_only) {
    agents = agents.filter(a => a.isHired);
  }

  return {
    agents,
    total: params?.hired_only ? agents.length : (count || 0),
  };
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

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
  // Return empty for now - executions table may not exist yet
  return {
    executions: [],
    total: 0,
  };
}

/**
 * Get pending approvals
 */
export async function getPendingApprovals(): Promise<ActivityResponse> {
  // Return empty for now
  return {
    executions: [],
    total: 0,
  };
}

/**
 * Approve a pending execution
 */
export async function approveExecution(
  id: string
): Promise<{ execution: AgentScheduleExecution; message: string }> {
  throw new Error("Not implemented");
}

/**
 * Reject a pending execution
 */
export async function rejectExecution(
  id: string,
  reason?: string
): Promise<{ execution: AgentScheduleExecution; message: string }> {
  throw new Error("Not implemented");
}

// ============================================================================
// Agent Schedules
// ============================================================================

/**
 * List schedules for hired agents
 */
export async function getAgentSchedules(): Promise<SchedulesResponse> {
  // Return empty for now - schedules table may not exist yet
  return {
    schedules: [],
    total: 0,
  };
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

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
  const { data: { user } } = await supabase.auth.getUser();

  if (!workspaceId || !user) {
    throw new Error("Not authenticated or no workspace");
  }

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
    getAgents({ hired_only: true }),
    getPendingApprovals(),
    getAgentActivity({ status: "completed", limit: 1 }),
    getAgentSchedules(),
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
