/**
 * Type guard functions for MessagePart types
 * 
 * These functions provide runtime type checking with TypeScript type predicates,
 * enabling safe narrowing of the MessagePart union type.
 */

import type {
  MessagePart,
  TextPart,
  ReasoningPart,
  ToolCallPart,
  AcknowledgmentPart,
} from "@/hooks/use-agent-chat"

/**
 * Check if a MessagePart is a TextPart
 */
export function isTextPart(part: MessagePart): part is TextPart {
  return part.type === "text"
}

/**
 * Check if a MessagePart is a ReasoningPart
 */
export function isReasoningPart(part: MessagePart): part is ReasoningPart {
  return part.type === "reasoning"
}

/**
 * Check if a MessagePart is a ToolCallPart
 */
export function isToolCallPart(part: MessagePart): part is ToolCallPart {
  return part.type === "tool-call"
}

/**
 * Check if a MessagePart is an AcknowledgmentPart
 */
export function isAcknowledgmentPart(part: MessagePart): part is AcknowledgmentPart {
  return part.type === "acknowledgment"
}
