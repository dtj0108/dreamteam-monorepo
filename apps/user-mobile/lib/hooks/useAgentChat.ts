import { useState, useCallback, useRef } from "react";

import { chatWithAgentStreaming } from "../api/agents";
import {
  ChatMessage,
  ChatMessagePart,
  ChatStatus,
  ChatUsage,
  TextPart,
  ReasoningPart,
  ToolCallPart,
  SSEEvent,
} from "../types/agents";

// Re-export types for convenience
export type { ChatMessage, ChatMessagePart, ChatStatus, ChatUsage };

interface UseAgentChatOptions {
  agentId: string;
  workspaceId: string;
  conversationId?: string | null;
  initialMessages?: ChatMessage[];
  onConversationCreated?: (conversationId: string) => void;
  onError?: (error: Error) => void;
}

interface UseAgentChatReturn {
  messages: ChatMessage[];
  status: ChatStatus;
  error: Error | null;
  conversationId: string | null;
  sessionId: string | null;
  isStreaming: boolean;
  usage: ChatUsage | null;
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
  clearMessages: () => void;
  setMessages: (messages: ChatMessage[]) => void;
  setConversationId: (id: string | null) => void;
}

export function useAgentChat({
  agentId,
  workspaceId,
  conversationId: initialConversationId = null,
  initialMessages = [],
  onConversationCreated,
  onError,
}: UseAgentChatOptions): UseAgentChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [usage, setUsage] = useState<ChatUsage | null>(null);

  // Store abort function from XHR
  const abortFnRef = useRef<(() => void) | null>(null);

  const isStreaming = status === "streaming" || status === "connecting";

  const stopGeneration = useCallback(() => {
    if (abortFnRef.current) {
      abortFnRef.current();
      abortFnRef.current = null;
    }
    setStatus("idle");
  }, []);

  const clearMessages = useCallback(() => {
    stopGeneration();
    setMessages([]);
    setConversationId(null);
    setSessionId(null);
    setError(null);
    setUsage(null);
  }, [stopGeneration]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      const trimmedContent = content.trim();

      // Add user message
      const userMessage: ChatMessage = {
        id: `msg_user_${Date.now()}`,
        role: "user",
        content: trimmedContent,
        parts: [{ type: "text", text: trimmedContent }],
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Initialize assistant message
      const assistantMessageId = `msg_assistant_${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        parts: [],
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Start connecting
      setStatus("connecting");
      setError(null);

      // Track accumulated content for the assistant message
      let accumulatedContent = "";
      let currentParts: ChatMessagePart[] = [];
      let buffer = "";

      // Helper to update assistant message
      const updateAssistantMessage = () => {
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          if (newMessages[lastIndex]?.role === "assistant") {
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              content: accumulatedContent,
              parts: [...currentParts],
            };
          }
          return newMessages;
        });
      };

      // Process SSE data chunk
      const processChunk = (chunk: string) => {
        buffer += chunk;

        // Process complete SSE events
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          // Skip event type lines and empty lines
          if (line.startsWith("event: ") || line.trim() === "") {
            continue;
          }

          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed: SSEEvent = JSON.parse(data);
              
              switch (parsed.type) {
                case "session":
                  setSessionId(parsed.sessionId);
                  setConversationId(parsed.conversationId);
                  setStatus("streaming");
                  if (!parsed.isResumed) {
                    onConversationCreated?.(parsed.conversationId);
                  }
                  break;

                case "text":
                  // Accumulate text content
                  accumulatedContent += parsed.content;

                  // Find existing text part or create new one
                  const lastTextPartIndex = currentParts.findIndex(
                    (p, i) =>
                      p.type === "text" &&
                      i === currentParts.length - 1 &&
                      // Only append to text if it's the most recent part
                      !currentParts.slice(i + 1).some((p) => p.type !== "text")
                  );

                  if (
                    lastTextPartIndex >= 0 &&
                    currentParts[lastTextPartIndex].type === "text"
                  ) {
                    // Append to existing text part
                    (currentParts[lastTextPartIndex] as TextPart).text +=
                      parsed.content;
                  } else {
                    // Create new text part
                    const textPart: TextPart = {
                      type: "text",
                      text: parsed.content,
                    };
                    currentParts.push(textPart);
                  }
                  updateAssistantMessage();
                  break;

                case "reasoning":
                  // Add reasoning part
                  const reasoningPart: ReasoningPart = {
                    type: "reasoning",
                    reasoning: parsed.content,
                  };
                  currentParts.push(reasoningPart);
                  updateAssistantMessage();
                  break;

                case "tool_start":
                  // Add tool call part with running state
                  const toolCallPart: ToolCallPart = {
                    type: "tool-call",
                    toolCallId: parsed.toolCallId,
                    toolName: parsed.toolName,
                    args: parsed.args,
                    state: "running",
                    displayName: parsed.displayName,
                  };
                  currentParts.push(toolCallPart);
                  updateAssistantMessage();
                  break;

                case "tool_result":
                  // Find and update the tool call part
                  const toolIndex = currentParts.findIndex(
                    (p) =>
                      p.type === "tool-call" &&
                      p.toolCallId === parsed.toolCallId
                  );
                  if (toolIndex >= 0) {
                    const existingPart = currentParts[toolIndex] as ToolCallPart;
                    currentParts[toolIndex] = {
                      ...existingPart,
                      result: parsed.result,
                      state: parsed.success ? "completed" : "error",
                      durationMs: parsed.durationMs,
                    };
                    updateAssistantMessage();
                  }
                  break;

                case "done":
                  setUsage(parsed.usage);
                  break;

                case "error":
                  const err = new Error(parsed.message);
                  setError(err);
                  setStatus("error");
                  onError?.(err);
                  // Remove empty assistant message on error
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastIndex = newMessages.length - 1;
                    if (
                      newMessages[lastIndex]?.role === "assistant" &&
                      !newMessages[lastIndex]?.content &&
                      newMessages[lastIndex]?.parts.length === 0
                    ) {
                      newMessages.pop();
                    }
                    return newMessages;
                  });
                  break;
              }
            } catch (parseError) {
              // Ignore JSON parse errors for incomplete data
              if (parseError instanceof SyntaxError) continue;
            }
          }
        }
      };

      try {
        // Use XHR-based streaming for proper real-time data delivery
        const abortFn = await chatWithAgentStreaming(
          agentId,
          trimmedContent,
          workspaceId,
          conversationId || undefined,
          // onChunk
          (chunk) => {
            processChunk(chunk);
          },
          // onError
          (err) => {
            setError(err);
            setStatus("error");
            onError?.(err);
            // Remove empty assistant message on error
            setMessages((prev) => {
              const newMessages = [...prev];
              const lastIndex = newMessages.length - 1;
              if (
                newMessages[lastIndex]?.role === "assistant" &&
                !newMessages[lastIndex]?.content &&
                newMessages[lastIndex]?.parts.length === 0
              ) {
                newMessages.pop();
              }
              return newMessages;
            });
          },
          // onComplete
          () => {
            setStatus("idle");
            abortFnRef.current = null;
          }
        );

        abortFnRef.current = abortFn;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to send message");
        setError(error);
        setStatus("error");
        onError?.(error);

        // Remove empty assistant message on error
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          if (
            newMessages[lastIndex]?.role === "assistant" &&
            !newMessages[lastIndex]?.content &&
            newMessages[lastIndex]?.parts.length === 0
          ) {
            newMessages.pop();
          }
          return newMessages;
        });
      }
    },
    [
      agentId,
      workspaceId,
      conversationId,
      isStreaming,
      onConversationCreated,
      onError,
    ]
  );

  return {
    messages,
    status,
    error,
    conversationId,
    sessionId,
    isStreaming,
    usage,
    sendMessage,
    stopGeneration,
    clearMessages,
    setMessages,
    setConversationId,
  };
}
