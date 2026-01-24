/**
 * WebSocket/SSE Message Types for Claude Agent SDK
 *
 * Defines the message protocol between client and server
 * for real-time agent communication.
 */

// ============================================================================
// SERVER → CLIENT MESSAGES
// ============================================================================

/**
 * Session established or resumed
 */
export interface SessionMessage {
  type: "session"
  sessionId: string
  conversationId: string
  isResumed: boolean
}

/**
 * Streaming text content
 */
export interface TextMessage {
  type: "text"
  content: string
  isComplete: boolean
}

/**
 * Extended thinking / reasoning (if enabled)
 */
export interface ReasoningMessage {
  type: "reasoning"
  content: string
  isComplete: boolean
}

/**
 * Tool execution started
 */
export interface ToolStartMessage {
  type: "tool_start"
  toolName: string
  toolCallId: string
  args: unknown
  displayName: string
}

/**
 * Tool execution completed
 */
export interface ToolResultMessage {
  type: "tool_result"
  toolCallId: string
  toolName: string
  result: unknown
  success: boolean
  durationMs: number
}

/**
 * Delegation to another agent started (team mode)
 */
export interface DelegationStartMessage {
  type: "delegation_start"
  targetAgent: string
  task: string
}

/**
 * Delegation to another agent completed (team mode)
 */
export interface DelegationCompleteMessage {
  type: "delegation_complete"
  agentName: string
  agentSlug: string
  success: boolean
  error?: string
}

/**
 * Error occurred
 */
export interface ErrorMessage {
  type: "error"
  message: string
  code?: string
  recoverable: boolean
}

/**
 * Generation complete
 */
export interface DoneMessage {
  type: "done"
  usage: {
    inputTokens: number
    outputTokens: number
    costUsd: number
  }
  turnCount: number
}

export type ServerMessage =
  | SessionMessage
  | TextMessage
  | ReasoningMessage
  | ToolStartMessage
  | ToolResultMessage
  | DelegationStartMessage
  | DelegationCompleteMessage
  | ErrorMessage
  | DoneMessage
