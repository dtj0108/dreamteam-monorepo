"use client"

/**
 * useAgentChat Hook
 *
 * Client-side hook for managing Claude Agent SDK chat sessions.
 * Handles SSE streaming, message accumulation, and reconnection.
 */

import { useState, useCallback, useRef, useEffect } from "react"
import type { ServerMessage, ToolCallState } from "@/lib/agent-ws"
import { getSupabaseClient } from "@/lib/supabase"

// Message part types matching existing UI
export interface TextPart {
  type: "text"
  text: string
}

export interface ReasoningPart {
  type: "reasoning"
  reasoning: string
}

export interface ToolCallPart {
  type: "tool-call"
  toolCallId: string
  toolName: string
  args: unknown
  result?: unknown
  state: "pending" | "running" | "completed" | "error"
}

export interface AcknowledgmentPart {
  type: "acknowledgment"
  content: string
}

export type MessagePart = TextPart | ReasoningPart | ToolCallPart | AcknowledgmentPart

export interface AgentMessage {
  id: string
  role: "user" | "assistant"
  content: string
  parts: MessagePart[]
  createdAt: Date
}

export type ChatStatus = "idle" | "connecting" | "streaming" | "error"

export interface UseAgentChatOptions {
  agentId: string
  workspaceId: string
  conversationId?: string | null
  initialMessages?: AgentMessage[]
  onConversationCreated?: (conversationId: string) => void
  onError?: (error: Error) => void
}

export interface UseAgentChatReturn {
  messages: AgentMessage[]
  status: ChatStatus
  error: Error | null
  conversationId: string | null
  sessionId: string | null
  isStreaming: boolean
  usage: {
    inputTokens: number
    outputTokens: number
    costUsd: number
  } | null
  sendMessage: (content: string) => Promise<void>
  stopGeneration: () => void
  clearMessages: () => void
  setMessages: (messages: AgentMessage[]) => void
}

export function useAgentChat(options: UseAgentChatOptions): UseAgentChatReturn {
  const {
    agentId,
    workspaceId,
    conversationId: initialConversationId,
    initialMessages = [],
    onConversationCreated,
    onError,
  } = options

  const [messages, setMessages] = useState<AgentMessage[]>(initialMessages)
  const [status, setStatus] = useState<ChatStatus>("idle")
  const [error, setError] = useState<Error | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId || null
  )
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [usage, setUsage] = useState<{
    inputTokens: number
    outputTokens: number
    costUsd: number
  } | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const currentAssistantMessageRef = useRef<{
    id: string
    text: string
    reasoning: string
    toolCalls: Map<string, ToolCallState>
  } | null>(null)
  const isConnectingRef = useRef<boolean>(false)
  // Ref to track in-flight request to prevent race conditions
  const isProcessingRef = useRef<boolean>(false)

  // Update conversationId when prop changes
  useEffect(() => {
    if (initialConversationId) {
      setConversationId(initialConversationId)
    }
  }, [initialConversationId])

  // Clear messages when conversation changes
  useEffect(() => {
    if (initialConversationId !== conversationId && initialConversationId) {
      setMessages(initialMessages)
    }
  }, [initialConversationId, initialMessages])

  const updateAssistantMessage = useCallback(() => {
    const current = currentAssistantMessageRef.current
    if (!current) return

    const parts: MessagePart[] = []

    // Add reasoning only if we have actual reasoning content
    if (current.reasoning) {
      parts.push({
        type: "reasoning",
        reasoning: current.reasoning,
      })
    }

    // Add text if present
    if (current.text) {
      parts.push({
        type: "text",
        text: current.text,
      })
    }

    // Add tool calls
    for (const toolCall of current.toolCalls.values()) {
      parts.push({
        type: "tool-call",
        toolCallId: toolCall.id,
        toolName: toolCall.toolName,
        args: toolCall.args,
        result: toolCall.result,
        state: toolCall.status === "completed" ? "completed" :
               toolCall.status === "error" ? "error" :
               toolCall.status === "running" ? "running" : "pending",
      })
    }

    setMessages((prev) => {
      const lastIndex = prev.findIndex((m) => m.id === current.id)
      if (lastIndex === -1) {
        // Add new message
        return [
          ...prev,
          {
            id: current.id,
            role: "assistant" as const,
            content: current.text,
            parts,
            createdAt: new Date(),
          },
        ]
      }
      // Update existing message
      const updated = [...prev]
      updated[lastIndex] = {
        ...updated[lastIndex],
        content: current.text,
        parts,
      }
      return updated
    })
  }, [])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return
      // Prevent duplicate sends if already processing (atomic check using ref)
      if (isProcessingRef.current) return
      isProcessingRef.current = true
      setStatus("connecting")

      // Add user message immediately
      const userMessage: AgentMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        parts: [{ type: "text", text: content }],
        createdAt: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])

      // Reset state
      setError(null)
      setUsage(null)

      // Create abort controller
      abortControllerRef.current = new AbortController()

      // Initialize assistant message tracking
      currentAssistantMessageRef.current = {
        id: `assistant-${Date.now()}`,
        text: "",
        reasoning: "",
        toolCalls: new Map(),
      }

      // Show "Thinking..." immediately by creating the assistant message with empty reasoning
      isConnectingRef.current = true
      updateAssistantMessage()

      // Get access token for Bearer auth (needed for Vercel→Railway rewrite)
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      try {
        const response = await fetch("/api/agent-chat", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          },
          body: JSON.stringify({
            message: content,
            agentId,
            workspaceId,
            ...(conversationId && { conversationId }),
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`)
        }

        if (!response.body) {
          throw new Error("No response body")
        }

        setStatus("streaming")
        isConnectingRef.current = false

        // Process SSE stream
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Process complete events
          const events = buffer.split("\n\n")
          buffer = events.pop() || "" // Keep incomplete event in buffer

          for (const eventStr of events) {
            if (!eventStr.trim()) continue

            // Parse SSE format
            const eventMatch = eventStr.match(/^event: (\w+)\ndata: ([\s\S]+)$/)
            if (!eventMatch) continue

            const [, eventType, dataStr] = eventMatch
            let data: ServerMessage

            try {
              data = JSON.parse(dataStr)
            } catch {
              continue
            }

            // Handle different event types
            switch (data.type) {
              case "session":
                setSessionId(data.sessionId)
                if (data.conversationId && !conversationId) {
                  setConversationId(data.conversationId)
                  onConversationCreated?.(data.conversationId)
                }
                break

              case "text":
                if (currentAssistantMessageRef.current) {
                  currentAssistantMessageRef.current.text += data.content
                  if (process.env.NODE_ENV === "development") {
                    console.log("[useAgentChat] Received text:", data.content.slice(0, 50))
                  }
                  updateAssistantMessage()
                }
                break

              case "reasoning":
                if (currentAssistantMessageRef.current) {
                  currentAssistantMessageRef.current.reasoning += data.content
                  updateAssistantMessage()
                }
                break

              case "tool_start":
                if (currentAssistantMessageRef.current) {
                  currentAssistantMessageRef.current.toolCalls.set(data.toolCallId, {
                    id: data.toolCallId,
                    toolName: data.toolName,
                    displayName: data.displayName,
                    args: data.args,
                    status: "running",
                  })
                  updateAssistantMessage()
                }
                break

              case "tool_result":
                if (currentAssistantMessageRef.current) {
                  const toolCall = currentAssistantMessageRef.current.toolCalls.get(
                    data.toolCallId
                  )
                  if (toolCall) {
                    toolCall.result = data.result
                    toolCall.status = data.success ? "completed" : "error"
                    toolCall.durationMs = data.durationMs
                    updateAssistantMessage()
                  }
                }
                break

              case "error":
                isConnectingRef.current = false
                const err = new Error(data.message)
                setError(err)
                setStatus("error")
                onError?.(err)
                break

              case "done":
                setUsage({
                  inputTokens: data.usage.inputTokens,
                  outputTokens: data.usage.outputTokens,
                  costUsd: data.usage.costUsd,
                })
                setStatus("idle")
                if (process.env.NODE_ENV === "development") {
                  console.log("[useAgentChat] Stream complete, final message:", {
                    textLength: currentAssistantMessageRef.current?.text.length,
                    reasoningLength: currentAssistantMessageRef.current?.reasoning.length,
                    toolCalls: currentAssistantMessageRef.current?.toolCalls.size,
                  })
                }
                break
            }
          }
        }

        // Finalize
        setStatus("idle")
        currentAssistantMessageRef.current = null
      } catch (err) {
        isConnectingRef.current = false
        if ((err as Error).name === "AbortError") {
          setStatus("idle")
          isProcessingRef.current = false
          return
        }
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        setStatus("error")
        onError?.(error)
      } finally {
        abortControllerRef.current = null
        isProcessingRef.current = false
      }
    },
    [agentId, workspaceId, conversationId, onConversationCreated, onError, updateAssistantMessage]
  )

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
    isConnectingRef.current = false
    // Remove partial assistant message on cancel
    if (currentAssistantMessageRef.current) {
      const partialId = currentAssistantMessageRef.current.id
      setMessages((prev) => prev.filter((m) => m.id !== partialId))
      currentAssistantMessageRef.current = null
    }
    setStatus("idle")
    isProcessingRef.current = false
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setConversationId(null)
    setSessionId(null)
    setUsage(null)
    setError(null)
    currentAssistantMessageRef.current = null
  }, [])

  return {
    messages,
    status,
    error,
    conversationId,
    sessionId,
    isStreaming: status === "streaming",
    usage,
    sendMessage,
    stopGeneration,
    clearMessages,
    setMessages,
  }
}

export default useAgentChat
