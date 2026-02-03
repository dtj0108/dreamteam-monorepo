"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import type {
  AgentMessage,
  TextPart,
  AcknowledgmentPart,
  ReasoningPart,
  ToolCallPart,
  ChatStatus,
} from "@/hooks/use-agent-chat"
import { UserMessage } from "./user-message"
import { AssistantMessage } from "./assistant-message"
import { SyntheticThinking } from "./synthetic-thinking"
import { sanitizeMessageContent } from "@/lib/agent-chat/content-sanitizer"

interface MessageRendererProps {
  message: AgentMessage
  messageIndex: number
  messages: AgentMessage[]
  status: ChatStatus
  handleRetry: () => void
}

// Type guards for part extraction
function isTextPart(part: unknown): part is TextPart {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    (part as { type: string }).type === "text"
  )
}

function isAcknowledgmentPart(part: unknown): part is AcknowledgmentPart {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    (part as { type: string }).type === "acknowledgment"
  )
}

function isReasoningPart(part: unknown): part is ReasoningPart {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    (part as { type: string }).type === "reasoning"
  )
}

function isToolCallPart(part: unknown): part is ToolCallPart {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    (part as { type: string }).type === "tool-call"
  )
}

export function MessageRenderer({
  message,
  messageIndex,
  messages,
  status,
  handleRetry,
}: MessageRendererProps) {
  // Safety check for undefined message
  if (!message) {
    return null
  }
  
  const isLastMessage = messageIndex === messages.length - 1
  const isAssistant = message.role === "assistant"
  const mappedStatus =
    status === "idle" ? "ready" : status === "connecting" ? "submitted" : status

  // Debug: Log message details for troubleshooting
  if (process.env.NODE_ENV === "development" && isAssistant) {
    console.log("[MessageRenderer] Assistant message:", {
      id: message.id,
      hasParts: message.parts && message.parts.length > 0,
      partsCount: message.parts?.length,
      hasContent: !!message.content,
      contentLength: message.content?.length,
      contentPreview: message.content?.slice(0, 50),
    })
  }

  // Handle messages with parts
  if (message.parts && message.parts.length > 0) {
    // For user messages, render simply
    if (!isAssistant) {
      const textPart = message.parts.find(isTextPart)
      const rawContent = textPart?.text || message.content
      const sanitizedContent = sanitizeMessageContent(rawContent)
      
      // Debug logging in development
      if (process.env.NODE_ENV === "development" && rawContent !== sanitizedContent) {
        console.log("[MessageRenderer] Sanitized user content:", {
          original: rawContent.slice(0, 100),
          sanitized: sanitizedContent.slice(0, 100),
        })
      }
      
      return (
        <UserMessage
          content={sanitizedContent || rawContent || "(empty message)"}
          timestamp={message.createdAt}
        />
      )
    }

    // For assistant messages, extract all parts and use AssistantMessage component
    const ackPart = message.parts.find(isAcknowledgmentPart)
    const reasoningParts = message.parts.filter((p): p is ReasoningPart => {
      return isReasoningPart(p) && !!p.reasoning
    })
    const toolParts = message.parts.filter((p): p is ToolCallPart => isToolCallPart(p))
    const textParts = message.parts.filter((p): p is TextPart => isTextPart(p))

    const isStreaming =
      (status === "streaming" || status === "connecting") && isLastMessage

    // Sanitize text parts to remove function call artifacts
    const sanitizedTextParts = textParts.map(part => {
      const sanitized = sanitizeMessageContent(part.text)
      
      // Debug logging in development
      if (process.env.NODE_ENV === "development" && part.text !== sanitized) {
        console.log("[MessageRenderer] Sanitized assistant content:", {
          original: part.text.slice(0, 100),
          sanitized: sanitized.slice(0, 100),
        })
      }
      
      return {
        ...part,
        text: sanitized || part.text || "(empty message)"
      }
    })

    return (
      <AssistantMessage
        messageId={message.id}
        ackPart={ackPart}
        reasoningParts={reasoningParts}
        toolParts={toolParts}
        textParts={sanitizedTextParts}
        isStreaming={isStreaming}
        isLastMessage={isLastMessage}
        status={mappedStatus === "streaming" ? "streaming" : "idle"}
        handleRetry={handleRetry}
      />
    )
  }

  // Fallback for messages without parts - but HAS content
  const rawContent = message.content
  
  // Debug: Check what we're getting
  if (process.env.NODE_ENV === "development") {
    console.log("[MessageRenderer] Fallback message:", {
      role: message.role,
      hasContent: !!rawContent,
      contentLength: rawContent?.length,
    })
  }
  
  // If no content at all, don't render anything
  if (!rawContent || rawContent.trim().length === 0) {
    return null
  }
  
  const sanitizedContent = sanitizeMessageContent(rawContent)
  const displayContent = sanitizedContent || rawContent || "(empty message)"
  
  // Debug logging in development
  if (process.env.NODE_ENV === "development" && rawContent !== sanitizedContent) {
    console.log("[MessageRenderer] Sanitized fallback content:", {
      original: rawContent?.slice(0, 100),
      sanitized: sanitizedContent?.slice(0, 100),
    })
  }
  
  return (
    <Message key={message.id} from={message.role as "user" | "assistant"}>
      <MessageContent>
        {isAssistant ? (
          <MessageResponse
            mode={mappedStatus === "streaming" && isLastMessage ? "streaming" : "static"}
          >
            {displayContent}
          </MessageResponse>
        ) : (
          displayContent
        )}
      </MessageContent>
    </Message>
  )
}

interface SyntheticThinkingRendererProps {
  messages: AgentMessage[]
  status: ChatStatus
}

export function SyntheticThinkingRenderer({
  messages,
  status,
}: SyntheticThinkingRendererProps) {
  const [isVisible, setIsVisible] = useState(false)
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const shouldShowSynthetic = useMemo(() => {
    if (status !== "connecting" && status !== "streaming") return false
    if (messages.length === 0) return false

    const lastAssistantMessage = [...messages]
      .reverse()
      .find((m) => m.role === "assistant")
    if (!lastAssistantMessage) {
      return true
    }

    const hasParts =
      lastAssistantMessage.parts && lastAssistantMessage.parts.length > 0
    const hasContent =
      lastAssistantMessage.content && lastAssistantMessage.content.length > 0

    return !(hasParts || hasContent)
  }, [messages, status])

  useEffect(() => {
    if (!shouldShowSynthetic) {
      if (delayRef.current) {
        clearTimeout(delayRef.current)
        delayRef.current = null
      }
      setIsVisible(false)
      return
    }

    if (delayRef.current) return
    delayRef.current = setTimeout(() => {
      setIsVisible(true)
    }, 300)

    return () => {
      if (delayRef.current) {
        clearTimeout(delayRef.current)
        delayRef.current = null
      }
    }
  }, [shouldShowSynthetic])

  if (!shouldShowSynthetic || !isVisible) {
    return null
  }

  return <SyntheticThinking status={status as "streaming" | "connecting" | "idle"} />
}

export {
  isTextPart,
  isAcknowledgmentPart,
  isReasoningPart,
  isToolCallPart,
}
