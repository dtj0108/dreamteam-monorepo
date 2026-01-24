/**
 * Agent WebSocket Module
 *
 * Provides WebSocket message types and utilities for
 * real-time Claude Agent SDK communication.
 */

export {
  // Client message types
  type InitMessage,
  type UserMessage,
  type CancelMessage,
  type PingMessage,
  type ClientMessage,

  // Server message types
  type SessionMessage,
  type TextMessage,
  type ReasoningMessage,
  type ToolStartMessage,
  type ToolResultMessage,
  type ErrorMessage,
  type DoneMessage,
  type PongMessage,
  type StatusMessage,
  type ServerMessage,

  // Attachment types
  type MessageAttachment,

  // Internal types
  type ConnectionState,
  type StreamingMessage,
  type ToolCallState,

  // Helper functions
  isClientMessage,
  parseClientMessage,
  serializeServerMessage,
  createErrorMessage,
  createDoneMessage,
} from "./types"
