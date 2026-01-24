// Agent Types - matching backend API spec

// Core enums
export type AgentModel = "sonnet" | "opus" | "haiku";

export type PermissionMode = "default" | "acceptEdits" | "bypassPermissions";

export type ScheduleExecutionStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type ToolCategory =
  | "finance"
  | "crm"
  | "team"
  | "projects"
  | "knowledge"
  | "communications"
  | "goals"
  | "agents";

// Agent Department
export interface AgentDepartment {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

// Agent Tool
export interface AgentTool {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: ToolCategory;
  schema: Record<string, unknown>;
}

// Agent Skill
export interface AgentSkill {
  id: string;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  content: string;
  is_active: boolean;
  is_system: boolean;
}

// Agent Rule
export interface AgentRule {
  id: string;
  content: string;
  priority: number;
}

// Core AI Agent from admin schema
export interface AIAgent {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  user_description: string | null;
  department_id: string | null;
  avatar_url: string | null;
  model: AgentModel;
  system_prompt: string;
  permission_mode: PermissionMode;
  max_turns: number;
  is_enabled: boolean;
  is_head: boolean;
  config: Record<string, unknown>;
  current_version: number;
  published_version: number | null;
  created_at: string;
  updated_at: string;
  department?: AgentDepartment | null;
  tools?: AgentTool[];
  skills?: AgentSkill[];
  rules?: AgentRule[];
}

// Agent with hire status for listing
export interface AgentWithHireStatus extends AIAgent {
  isHired: boolean;
  localAgentId: string | null;
  hiredAt: string | null;
}

// Local agent record (workspace-specific)
export interface LocalAgent {
  id: string;
  workspace_id: string;
  ai_agent_id: string | null;
  name: string;
  description: string | null;
  avatar_url: string | null;
  system_prompt: string;
  tools: string[];
  model: string;
  is_active: boolean;
  created_by: string | null;
  hired_at: string | null;
  created_at: string;
  updated_at: string;
}

// Message part types for AI SDK compatibility
export interface MessagePart {
  type: "text" | "reasoning" | "tool-invocation" | "tool-result";
  text?: string;
  reasoning?: string;
  toolInvocation?: {
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    state: "call" | "result";
    result?: unknown;
  };
}

// Agent message
export interface AgentMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  parts: MessagePart[] | null;
  created_at: string;
}

// Agent conversation
export interface AgentConversation {
  id: string;
  agent_id: string;
  workspace_id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  messages?: AgentMessage[];
}

// Agent schedule
export interface AgentSchedule {
  id: string;
  agent_id: string;
  name: string;
  description: string | null;
  cron_expression: string;
  timezone: string;
  task_prompt: string;
  requires_approval: boolean;
  output_config: Record<string, unknown>;
  is_enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  agent?: AIAgent;
}

// Agent schedule execution
export interface AgentScheduleExecution {
  id: string;
  schedule_id: string;
  agent_id: string;
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  status: ScheduleExecutionStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  result: Record<string, unknown> | null;
  tool_calls: Record<string, unknown>[] | null;
  error_message: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  cost_usd: number | null;
  duration_ms: number | null;
  created_at: string;
  schedule?: AgentSchedule;
  agent?: AIAgent;
}

// API response types
export interface AgentsListResponse {
  agents: AgentWithHireStatus[];
  total: number;
}

export interface AgentDetailResponse {
  agent: AIAgent;
  localAgent: LocalAgent | null;
  isHired: boolean;
}

export interface ActivityResponse {
  executions: AgentScheduleExecution[];
  total: number;
}

export interface SchedulesResponse {
  schedules: AgentSchedule[];
  total: number;
}

export interface ConversationListItem {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

// Query params
export interface AgentsQueryParams {
  workspaceId: string;
  search?: string;
  category?: string;
  department_id?: string;
  hired_only?: boolean;
  limit?: number;
  offset?: number;
}

export interface ActivityQueryParams {
  workspaceId: string;
  agent_id?: string;
  status?: ScheduleExecutionStatus;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Chat Types (Part 4 of spec)
// ============================================================================

export type ChatStatus = "idle" | "connecting" | "streaming" | "error";

export type ToolCallState = "pending" | "running" | "completed" | "error";

// Message part types matching spec
export interface TextPart {
  type: "text";
  text: string;
}

export interface ReasoningPart {
  type: "reasoning";
  reasoning: string;
}

export interface ToolCallPart {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: unknown;
  result?: unknown;
  state: ToolCallState;
  displayName?: string;
  durationMs?: number;
}

export type ChatMessagePart = TextPart | ReasoningPart | ToolCallPart;

// Chat message for use in useAgentChat hook
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  parts: ChatMessagePart[];
  createdAt: Date;
}

// Token usage tracking
export interface ChatUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

// SSE Event types from backend
export interface SessionEvent {
  type: "session";
  sessionId: string;
  conversationId: string;
  isResumed: boolean;
}

export interface TextEvent {
  type: "text";
  content: string;
  isComplete: boolean;
}

export interface ReasoningEvent {
  type: "reasoning";
  content: string;
  isComplete: boolean;
}

export interface ToolStartEvent {
  type: "tool_start";
  toolName: string;
  toolCallId: string;
  args: unknown;
  displayName: string;
}

export interface ToolResultEvent {
  type: "tool_result";
  toolCallId: string;
  toolName: string;
  result: unknown;
  success: boolean;
  durationMs: number;
}

export interface ErrorEvent {
  type: "error";
  message: string;
  code?: string;
  recoverable: boolean;
}

export interface DoneEvent {
  type: "done";
  usage: ChatUsage;
  turnCount: number;
}

export type SSEEvent =
  | SessionEvent
  | TextEvent
  | ReasoningEvent
  | ToolStartEvent
  | ToolResultEvent
  | ErrorEvent
  | DoneEvent;

// Filter types for AgentsProvider
export interface AgentFilters {
  search?: string;
  category?: string;
  department_id?: string;
  hired_only?: boolean;
  limit?: number;
  offset?: number;
}

export interface ActivityFilters {
  agent_id?: string;
  status?: ScheduleExecutionStatus;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}
