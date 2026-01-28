/**
 * Message Mapper
 *
 * Converts between Claude Agent SDK messages, database messages,
 * and UI message formats.
 */

import type { AgentMessage, MessagePart, TextPart, ReasoningPart, ToolCallPart, AcknowledgmentPart } from "@/hooks/use-agent-chat"

// Database message type (from agent_messages table)
export interface DbMessage {
  id: string
  conversation_id?: string
  role: "user" | "assistant" | "system"
  content: string
  parts?: MessagePart[] | null
  sdk_message_id?: string | null
  message_type?: "text" | "reasoning" | "tool_call" | "tool_result" | "system"
  metadata?: Record<string, unknown> | null
  created_at: string
  created_by?: string | null
}

// Legacy UI message type (from @ai-sdk/react)
export interface LegacyUIMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  createdAt?: Date
  parts?: Array<{
    type: string
    text?: string
    reasoning?: string
    toolCallId?: string
    toolName?: string
    args?: unknown
    result?: unknown
  }>
}

/**
 * Convert database messages to UI format
 */
export function dbMessagesToAgentMessages(dbMessages: DbMessage[]): AgentMessage[] {
  const result: AgentMessage[] = []
  let currentAssistantMessage: AgentMessage | null = null

  for (const msg of dbMessages) {
    // If message has stored parts, use them directly
    if (msg.parts && Array.isArray(msg.parts) && msg.parts.length > 0) {
      // Finalize any pending assistant message first
      if (currentAssistantMessage) {
        result.push(currentAssistantMessage)
        currentAssistantMessage = null
      }

      result.push({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        parts: msg.parts,
        createdAt: new Date(msg.created_at),
      })
      continue
    }

    if (msg.role === "user") {
      // Finalize any pending assistant message
      if (currentAssistantMessage) {
        result.push(currentAssistantMessage)
        currentAssistantMessage = null
      }

      // Add user message
      result.push({
        id: msg.id,
        role: "user",
        content: msg.content,
        parts: [{ type: "text", text: msg.content }],
        createdAt: new Date(msg.created_at),
      })
    } else if (msg.role === "assistant") {
      const messageType = msg.message_type || "text"

      // Start new assistant message or continue existing
      if (!currentAssistantMessage) {
        currentAssistantMessage = {
          id: msg.id,
          role: "assistant",
          content: "",
          parts: [],
          createdAt: new Date(msg.created_at),
        }
      }

      switch (messageType) {
        case "text":
          currentAssistantMessage.content += msg.content
          currentAssistantMessage.parts.push({
            type: "text",
            text: msg.content,
          } as TextPart)
          break

        case "reasoning":
          currentAssistantMessage.parts.push({
            type: "reasoning",
            reasoning: msg.content,
          } as ReasoningPart)
          break

        case "tool_call":
          if (msg.metadata) {
            currentAssistantMessage.parts.push({
              type: "tool-call",
              toolCallId: msg.metadata.toolCallId as string,
              toolName: msg.metadata.toolName as string,
              args: msg.metadata.args,
              result: msg.metadata.result,
              state: (msg.metadata.state as "pending" | "running" | "completed" | "error") || "completed",
            } as ToolCallPart)
          }
          break

        case "tool_result":
          // Tool results are typically merged into tool_call parts
          // Find and update the corresponding tool call
          const toolCallId = msg.metadata?.toolCallId as string
          if (toolCallId) {
            const toolCallPart = currentAssistantMessage.parts.find(
              (p) => p.type === "tool-call" && (p as ToolCallPart).toolCallId === toolCallId
            ) as ToolCallPart | undefined
            if (toolCallPart) {
              toolCallPart.result = msg.metadata?.result
              toolCallPart.state = "completed"
            }
          }
          break
      }
    }
  }

  // Finalize any pending assistant message
  if (currentAssistantMessage) {
    result.push(currentAssistantMessage)
  }

  return result
}

/**
 * Convert legacy UI messages to new format
 */
export function legacyMessagesToAgentMessages(legacyMessages: LegacyUIMessage[]): AgentMessage[] {
  return legacyMessages
    .filter((msg) => msg.role !== "system")
    .map((msg) => {
      const parts: MessagePart[] = []

      if (msg.parts) {
        for (const part of msg.parts) {
          switch (part.type) {
            case "text":
              if (part.text) {
                parts.push({ type: "text", text: part.text })
              }
              break
            case "reasoning":
              if (part.reasoning) {
                parts.push({ type: "reasoning", reasoning: part.reasoning })
              }
              break
            case "tool-call":
            case "tool_call":
              parts.push({
                type: "tool-call",
                toolCallId: part.toolCallId || `tool-${Date.now()}`,
                toolName: part.toolName || "unknown",
                args: part.args,
                result: part.result,
                state: "completed",
              })
              break
          }
        }
      }

      // If no parts extracted, create text part from content
      if (parts.length === 0 && msg.content) {
        parts.push({ type: "text", text: msg.content })
      }

      return {
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        parts,
        createdAt: msg.createdAt || new Date(),
      }
    })
}

/**
 * Convert agent messages to database format for saving
 */
export function agentMessageToDbMessages(
  message: AgentMessage,
  conversationId: string,
  userId?: string
): DbMessage[] {
  const dbMessages: DbMessage[] = []
  const baseMessage = {
    conversation_id: conversationId,
    created_at: message.createdAt.toISOString(),
    created_by: userId || null,
  }

  if (message.role === "user") {
    // Simple user message
    dbMessages.push({
      ...baseMessage,
      id: message.id,
      role: "user",
      content: message.content,
      message_type: "text",
    })
  } else {
    // Assistant message - may have multiple parts
    let textContent = ""
    let partIndex = 0

    for (const part of message.parts) {
      switch (part.type) {
        case "text":
          textContent += part.text
          break

        case "reasoning":
          dbMessages.push({
            ...baseMessage,
            id: `${message.id}-reasoning-${partIndex++}`,
            role: "assistant",
            content: part.reasoning,
            message_type: "reasoning",
          })
          break

        case "tool-call":
          dbMessages.push({
            ...baseMessage,
            id: `${message.id}-tool-${partIndex++}`,
            role: "assistant",
            content: `Tool: ${part.toolName}`,
            message_type: "tool_call",
            metadata: {
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              args: part.args,
              result: part.result,
              state: part.state,
            },
          })
          break
      }
    }

    // Add main text content
    if (textContent) {
      dbMessages.push({
        ...baseMessage,
        id: message.id,
        role: "assistant",
        content: textContent,
        message_type: "text",
      })
    }
  }

  return dbMessages
}

/**
 * Extract plain text content from message parts
 */
export function getMessageText(parts: MessagePart[]): string {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => (p as TextPart).text)
    .join("")
}

/**
 * Check if message has tool calls
 */
export function hasToolCalls(parts: MessagePart[]): boolean {
  return parts.some((p) => p.type === "tool-call")
}

/**
 * Get tool calls from message
 */
export function getToolCalls(parts: MessagePart[]): ToolCallPart[] {
  return parts.filter((p) => p.type === "tool-call") as ToolCallPart[]
}

/**
 * Check if all tool calls are completed
 */
export function allToolCallsCompleted(parts: MessagePart[]): boolean {
  const toolCalls = getToolCalls(parts)
  return toolCalls.every((tc) => tc.state === "completed" || tc.state === "error")
}

export default {
  dbMessagesToAgentMessages,
  legacyMessagesToAgentMessages,
  agentMessageToDbMessages,
  getMessageText,
  hasToolCalls,
  getToolCalls,
  allToolCallsCompleted,
}
