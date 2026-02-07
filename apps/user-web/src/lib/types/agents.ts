/**
 * Agent Types for the Agents Product
 *
 * These types bridge the admin's ai_agents table (agent builder)
 * with the consumer-facing agent experience.
 */

// ─────────────────────────────────────────────────────────────
// Core Agent Types (from admin's ai_agents table)
// ─────────────────────────────────────────────────────────────

export type AgentModel = 'sonnet' | 'opus' | 'haiku'

export type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions'

export type RuleType = 'always' | 'never' | 'when' | 'respond_with'

export type ToolCategory =
  | 'finance'
  | 'crm'
  | 'team'
  | 'projects'
  | 'knowledge'
  | 'communications'
  | 'goals'
  | 'agents'

export interface AgentRule {
  id: string
  agent_id: string
  rule_type: RuleType
  rule_content: string
  condition: string | null
  priority: number
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface AgentSkill {
  id: string
  name: string
  description: string
  skill_content: string
  is_enabled: boolean
}

export interface AgentTool {
  id: string
  name: string
  description: string
  category: ToolCategory
  input_schema: Record<string, unknown>
  is_builtin: boolean
  is_enabled: boolean
}

export interface AgentDepartment {
  id: string
  name: string
  description: string | null
  icon: string
}

/**
 * Agent from admin's ai_agents table
 * This is the full agent definition created in the admin panel
 */
export interface StylePresets {
  verbosity: 'concise' | 'balanced' | 'detailed'
  tone: 'casual' | 'balanced' | 'formal'
  examples: 'few' | 'moderate' | 'many'
}

export interface AIAgent {
  id: string
  name: string
  slug: string | null
  description: string | null
  department_id: string | null
  avatar_url: string | null
  tier_required?: 'startup' | 'teams' | 'enterprise'
  model: AgentModel
  system_prompt: string
  permission_mode: PermissionMode
  max_turns: number
  is_enabled: boolean
  is_head: boolean
  config: Record<string, unknown>
  current_version: number
  published_version: number | null
  created_at: string
  updated_at: string
  // Relations (optional, loaded when needed)
  department?: AgentDepartment | null
  tools?: AgentTool[]
  skills?: AgentSkill[]
  rules?: AgentRule[]
  // UX configuration
  suggested_prompts?: string[]
  // Style presets for agent communication style
  style_presets?: StylePresets
}

/**
 * Agent with hire status - combines ai_agents with deployed team config
 * Used in the agent directory to show agent status
 *
 * In the auto-deploy model:
 * - isHired: true when agent is in deployed team AND enabled
 * - isInPlan: true when agent is part of workspace's plan (from deployed team)
 * - isEnabled: agent's enabled state in customizations
 */
export interface AgentWithHireStatus extends AIAgent {
  /** Agent is "hired" - exists in deployed team AND is enabled, OR has legacy local agent record */
  isHired: boolean
  /** Agent is part of the workspace's plan (from deployed team) */
  isInPlan?: boolean
  /** Agent's enabled state in workspace customizations (for deployed team agents) */
  isEnabled?: boolean
  /** Local agent ID (for legacy agents) or agent ID (for deployed team agents) */
  localAgentId: string | null
  /** When the agent was hired/enabled (deployed_at for deployed teams) */
  hiredAt: string | null
  /** Suggested prompts for the agent chat UX */
  suggested_prompts?: string[]
}

// ─────────────────────────────────────────────────────────────
// Local Agent Types (from local agents table)
// ─────────────────────────────────────────────────────────────

/**
 * Local agent record - represents a "hired" agent in a workspace
 */
export interface LocalAgent {
  id: string
  workspace_id: string
  ai_agent_id: string | null
  name: string
  description: string | null
  avatar_url: string | null
  system_prompt: string
  tools: string[]
  model: string
  is_active: boolean
  created_by: string | null
  hired_at: string | null
  created_at: string
  updated_at: string
  // UX configuration
  suggested_prompts?: string[]
}

// ─────────────────────────────────────────────────────────────
// Conversation Types
// ─────────────────────────────────────────────────────────────

export interface AgentConversation {
  id: string
  agent_id: string
  workspace_id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
}

export interface AgentMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  parts: MessagePart[] | null
  created_at: string
}

export interface MessagePart {
  type: 'text' | 'reasoning' | 'tool-invocation' | 'tool-result'
  text?: string
  reasoning?: string
  toolInvocation?: {
    toolCallId: string
    toolName: string
    args: Record<string, unknown>
    state: 'call' | 'result'
    result?: unknown
  }
}

// ─────────────────────────────────────────────────────────────
// Schedule Types (from admin's agent_schedules table)
// ─────────────────────────────────────────────────────────────

export interface AgentSchedule {
  id: string
  agent_id: string
  name: string
  description: string | null
  cron_expression: string
  timezone: string
  task_prompt: string
  requires_approval: boolean
  output_config: Record<string, unknown>
  is_enabled: boolean
  last_run_at: string | null
  next_run_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Relations
  agent?: AIAgent
  agent_in_plan?: boolean
}

export type ScheduleExecutionStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface AgentScheduleExecution {
  id: string
  schedule_id: string
  agent_id: string
  scheduled_for: string
  started_at: string | null
  completed_at: string | null
  status: ScheduleExecutionStatus
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  result: Record<string, unknown> | null
  tool_calls: Record<string, unknown>[] | null
  error_message: string | null
  tokens_input: number | null
  tokens_output: number | null
  cost_usd: number | null
  duration_ms: number | null
  created_at: string
  // Relations
  schedule?: AgentSchedule
  agent?: AIAgent
}

// ─────────────────────────────────────────────────────────────
// API Response Types
// ─────────────────────────────────────────────────────────────

export interface AgentsListResponse {
  agents: AgentWithHireStatus[]
  total: number
}

export interface AgentDetailResponse {
  agent: AIAgent
  localAgent: LocalAgent | null
  isHired: boolean
}

export interface ActivityListResponse {
  executions: AgentScheduleExecution[]
  total: number
}

export interface SchedulesListResponse {
  schedules: AgentSchedule[]
  total: number
}

// ─────────────────────────────────────────────────────────────
// Filter Types
// ─────────────────────────────────────────────────────────────

export interface AgentFilters {
  search?: string
  category?: string
  department_id?: string
  hired_only?: boolean
  limit?: number
  offset?: number
}

export interface ActivityFilters {
  agent_id?: string
  status?: ScheduleExecutionStatus
  from_date?: string
  to_date?: string
  limit?: number
  offset?: number
}

export interface ScheduleFilters {
  search?: string
  status?: "enabled" | "paused"
  agentId?: string
  approval?: "required" | "not_required"
  nextRunBefore?: string
}
