/**
 * WebSocket Message Types for Claude Agent SDK
 *
 * Defines the bidirectional message protocol between client and server
 * for real-time agent communication.
 */

// ============================================================================
// CLIENT → SERVER MESSAGES
// ============================================================================

/**
 * Initialize a new or existing conversation
 */
export interface InitMessage {
  type: "init"
  agentId: string
  workspaceId: string
  conversationId?: string // If provided, attempts to resume existing conversation
}

/**
 * Send a user message to the agent
 */
export interface UserMessage {
  type: "message"
  content: string
  attachments?: MessageAttachment[]
}

/**
 * Cancel the current generation
 */
export interface CancelMessage {
  type: "cancel"
}

/**
 * Ping to keep connection alive
 */
export interface PingMessage {
  type: "ping"
}

export type ClientMessage = InitMessage | UserMessage | CancelMessage | PingMessage

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

/**
 * Pong response to ping
 */
export interface PongMessage {
  type: "pong"
}

/**
 * Connection status update
 */
export interface StatusMessage {
  type: "status"
  status: "connecting" | "ready" | "streaming" | "error"
}

export type ServerMessage =
  | SessionMessage
  | TextMessage
  | ReasoningMessage
  | ToolStartMessage
  | ToolResultMessage
  | ErrorMessage
  | DoneMessage
  | PongMessage
  | StatusMessage

// ============================================================================
// ATTACHMENT TYPES
// ============================================================================

export interface MessageAttachment {
  type: "image" | "file"
  name: string
  url?: string
  base64?: string
  mimeType: string
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

/**
 * Connection state for tracking WebSocket lifecycle
 */
export interface ConnectionState {
  isConnected: boolean
  sessionId: string | null
  conversationId: string | null
  status: "connecting" | "ready" | "streaming" | "error" | "closed"
  reconnectAttempts: number
  lastPingAt: number | null
  lastPongAt: number | null
}

/**
 * Accumulated message during streaming
 */
export interface StreamingMessage {
  id: string
  role: "assistant"
  textParts: string[]
  reasoningParts: string[]
  toolCalls: ToolCallState[]
  isComplete: boolean
  startedAt: number
}

/**
 * Tool call state during execution
 */
export interface ToolCallState {
  id: string
  toolName: string
  displayName: string
  args: unknown
  result?: unknown
  success?: boolean
  durationMs?: number
  status: "pending" | "running" | "completed" | "error"
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Type guard for client messages
 */
export function isClientMessage(msg: unknown): msg is ClientMessage {
  if (!msg || typeof msg !== "object") return false
  const m = msg as Record<string, unknown>
  return (
    m.type === "init" ||
    m.type === "message" ||
    m.type === "cancel" ||
    m.type === "ping"
  )
}

/**
 * Parse client message from JSON string
 */
export function parseClientMessage(data: string): ClientMessage | null {
  try {
    const parsed = JSON.parse(data)
    if (isClientMessage(parsed)) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

/**
 * Serialize server message to JSON string
 */
export function serializeServerMessage(msg: ServerMessage): string {
  return JSON.stringify(msg)
}

/**
 * Create error message
 */
export function createErrorMessage(
  message: string,
  code?: string,
  recoverable = true
): ErrorMessage {
  return {
    type: "error",
    message,
    code,
    recoverable,
  }
}

/**
 * Create done message with usage
 */
export function createDoneMessage(
  inputTokens: number,
  outputTokens: number,
  costUsd: number,
  turnCount: number
): DoneMessage {
  return {
    type: "done",
    usage: {
      inputTokens,
      outputTokens,
      costUsd,
    },
    turnCount,
  }
}
