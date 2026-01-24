"use client"

import { useState, useEffect, useCallback, Fragment, useRef, type FormEvent } from "react"
import { useParams } from "next/navigation"
import { useAgentChat, type AgentMessage } from "@/hooks/use-agent-chat"
import { dbMessagesToAgentMessages } from "@/lib/message-mapper"
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputAttachments,
  PromptInputAttachment,
  PromptInputSubmit,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import { useAgents } from "@/providers/agents-provider"
import { useUser } from "@/hooks/use-user"
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message"
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning"
import {
  Sparkles,
  Copy,
  Bot,
  Square,
  AlertCircle,
  RotateCcw,
  Paperclip,
  ThumbsUp,
  ThumbsDown,
  Mic,
  ArrowUp,
  FileText,
  Code,
  Palette,
  Search,
} from "lucide-react"
import { ChatContainer } from "@/components/ai-elements/chat-container"
import { PromptScrollButton } from "@/components/ai-elements/scroll-button"
import { ToolResultRenderer } from "@/components/ai-elements/tool-result-renderer"
import { StepIndicator } from "@/components/ai-elements/step-indicator"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { ConversationSidebar, type ConversationItem } from "@/components/agents"
import dynamic from "next/dynamic"

// Dynamic import for Lottie to reduce initial bundle size
const Lottie = dynamic(() => import("lottie-react"), { ssr: false })

const ANIMATION_PATH = "/animations/ai-sphere.json"

// Suggestion categories for welcome screen
const SUGGESTION_CATEGORIES = [
  {
    id: "summary",
    icon: FileText,
    label: "Summary",
    highlight: "Summarize",
    suggestions: [
      "Summarize our recent performance",
      "Summarize the latest updates",
      "Give me a quick overview of pending tasks",
      "What are the key metrics to focus on?",
    ],
  },
  {
    id: "code",
    icon: Code,
    label: "Code",
    highlight: "Help me",
    suggestions: [
      "Help me write a function to calculate revenue",
      "Help me debug this code",
      "Explain how this algorithm works",
      "Generate a utility function for data parsing",
    ],
  },
  {
    id: "design",
    icon: Palette,
    label: "Design",
    highlight: "Design",
    suggestions: [
      "Design a color scheme for the dashboard",
      "How can I improve the user experience?",
      "Review the layout of this page",
      "Recommend UI improvements for the form",
    ],
  },
  {
    id: "research",
    icon: Search,
    label: "Research",
    highlight: "Research",
    suggestions: [
      "Research best practices for data visualization",
      "What are competitors doing differently?",
      "Research the latest industry trends",
      "Help me understand this concept",
    ],
  },
]

// Helper to highlight text in suggestions (safe - only uses hardcoded values)
function highlightText(text: string, highlight: string): React.ReactNode {
  const parts = text.split(new RegExp(`(${highlight})`, "gi"))
  return parts.map((part, i) =>
    part.toLowerCase() === highlight.toLowerCase() ? (
      <span key={i} className="text-primary font-medium">
        {part}
      </span>
    ) : (
      part
    )
  )
}

export default function AgentChatPage() {
  const params = useParams()
  const agentId = params.id as string
  const { user } = useUser()
  const workspaceId = user?.workspaceId || ""
  const { fetchAgent, currentAgent, isLoadingAgent, getLocalAgentById } = useAgents()

  const cachedAgent = getLocalAgentById(agentId)

  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [loadedMessages, setLoadedMessages] = useState<AgentMessage[]>([])
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null)
  const lastSavedMessageCount = useRef(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Welcome screen state
  const [animationData, setAnimationData] = useState<object | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const {
    messages,
    sendMessage,
    stopGeneration,
    status,
    error,
    setMessages,
    conversationId: hookConversationId,
  } = useAgentChat({
    agentId,
    workspaceId,
    conversationId: selectedConversationId,
    initialMessages: loadedMessages,
    onConversationCreated: (newConversationId) => {
      setSelectedConversationId(newConversationId)
      fetchConversations()
    },
    onError: (err) => {
      console.error("Chat error:", err)
    },
  })

  const mappedStatus = status === "idle" ? "ready" : status === "connecting" ? "submitted" : status
  const hasStartedConversation = messages.length > 0

  // Load Lottie animation
  useEffect(() => {
    async function loadAnimation() {
      try {
        const response = await fetch(ANIMATION_PATH)
        if (response.ok) {
          const data = await response.json()
          setAnimationData(data)
        }
      } catch (error) {
        console.error("Failed to load animation:", error)
      }
    }
    loadAnimation()
  }, [])

  const fetchConversations = useCallback(async () => {
    if (!workspaceId) return
    try {
      const response = await fetch(
        `/api/agent-conversations?agentId=${agentId}&workspaceId=${workspaceId}`
      )
      if (response.ok) {
        const data = await response.json()
        setConversations(data)
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error)
    }
  }, [agentId, workspaceId])

  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/agent-conversations/${conversationId}`)
      if (response.ok) {
        const data = await response.json()
        const msgs = dbMessagesToAgentMessages(data.messages || [])
        setLoadedMessages(msgs)
        setMessages(msgs)
        lastSavedMessageCount.current = msgs.length
      }
    } catch (error) {
      console.error("Failed to load conversation:", error)
    }
  }, [setMessages])

  const startNewConversation = useCallback(() => {
    setSelectedConversationId(null)
    setLoadedMessages([])
    setMessages([])
    lastSavedMessageCount.current = 0
    setActiveCategory(null)
  }, [setMessages])

  const selectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId)
    loadConversation(conversationId)
  }, [loadConversation])

  const saveMessages = useCallback(async () => {
    const convId = selectedConversationId || hookConversationId
    if (!convId || messages.length <= lastSavedMessageCount.current) return

    const newMessages = messages.slice(lastSavedMessageCount.current)
    if (newMessages.length === 0) return

    try {
      const messagesToSave = newMessages.map((msg) => {
        const textPart = msg.parts?.find((p) => p.type === "text") as { type: "text"; text: string } | undefined
        return {
          role: msg.role,
          content: textPart?.text || msg.content || "",
          parts: msg.parts,
        }
      })

      await fetch(`/api/agent-conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesToSave }),
      })

      lastSavedMessageCount.current = messages.length
      fetchConversations()
    } catch (error) {
      console.error("Failed to save messages:", error)
    }
  }, [selectedConversationId, hookConversationId, messages, fetchConversations])

  useEffect(() => {
    if (status === "idle" && messages.length > lastSavedMessageCount.current) {
      saveMessages()
    }
  }, [status, messages.length, saveMessages])

  useEffect(() => {
    fetchAgent(agentId)
    fetchConversations()
  }, [agentId, fetchAgent, fetchConversations])

  const handleSubmit = useCallback(
    async ({ text, files }: PromptInputMessage, _event: FormEvent<HTMLFormElement>) => {
      if (!text.trim() && files.length === 0) return
      setLastUserMessage(text)
      setActiveCategory(null)
      sendMessage(text)
    },
    [sendMessage]
  )

  const handleRetry = useCallback(() => {
    if (lastUserMessage) {
      sendMessage(lastUserMessage)
    }
  }, [lastUserMessage, sendMessage])

  const handleSuggestionClick = useCallback((text: string) => {
    setActiveCategory(null)
    sendMessage(text)
  }, [sendMessage])

  const displayName = currentAgent?.name || cachedAgent?.name || "Agent"
  const displayDescription = currentAgent?.description || cachedAgent?.description
  const displayAvatar = currentAgent?.avatar_url || cachedAgent?.avatar_url

  const activeCategoryData = activeCategory
    ? SUGGESTION_CATEGORIES.find((c) => c.id === activeCategory)
    : null

  // Loading state
  if (isLoadingAgent && !cachedAgent) {
    return (
      <div className="flex flex-col flex-1 min-h-0 items-center justify-center">
        <Bot className="size-16 text-muted-foreground animate-pulse mb-4" />
        <p className="text-muted-foreground">Loading agent...</p>
      </div>
    )
  }

  // Agent not found
  if (!currentAgent && !cachedAgent && !isLoadingAgent) {
    return (
      <div className="flex flex-col flex-1 min-h-0 items-center justify-center">
        <Bot className="size-16 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">Agent not found</h2>
        <p className="text-muted-foreground">This agent may have been deleted or you don&apos;t have access.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Conversation sidebar */}
      <ConversationSidebar
        conversations={conversations}
        selectedId={selectedConversationId}
        onSelect={selectConversation}
        onNewConversation={startNewConversation}
      />

      {/* Main chat area - centered layout like shadcn-ui-kit */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header - always present */}
        <div className="flex items-center px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-lg">
              {displayAvatar || <Sparkles className="size-4 text-muted-foreground" />}
            </div>
            <span className="font-medium">{displayName}</span>
          </div>
        </div>

        {/* Main content area - scrollable container spans full width so scrollbar is at screen edge */}
        <ChatContainer
          containerRef={scrollContainerRef}
          autoScroll={hasStartedConversation}
          className={cn(
            "flex-1 min-h-0 overflow-y-auto",
            !hasStartedConversation && "overflow-hidden"
          )}
        >
          <div className={cn(
            "mx-auto flex w-full max-w-4xl flex-col p-4",
            hasStartedConversation ? "flex-1 min-h-0" : "h-full items-center justify-center space-y-4"
          )}>
            {/* Messages section - only show when conversation started */}
            {hasStartedConversation && <div className="space-y-6 py-6 flex-1">
              {messages.map((message, messageIndex) => {
                const isLastMessage = messageIndex === messages.length - 1
                const isAssistant = message.role === "assistant"

                if (message.parts && message.parts.length > 0) {
                  const toolParts = message.parts.filter((p) => p.type === "tool-call")
                  let toolIndex = 0

                  return (
                    <Fragment key={message.id}>
                      {message.parts.map((part, i) => {
                        switch (part.type) {
                          case "text": {
                            const isStreamingText = mappedStatus === "streaming" && isLastMessage && isAssistant
                            const isNotStreaming = !isStreamingText && isAssistant
                            return (
                              <Message
                                key={`${message.id}-${i}`}
                                from={message.role as "user" | "assistant"}
                                className={isAssistant ? "justify-start" : "justify-end"}
                              >
                                <div className={cn(isAssistant ? "flex-1" : "max-w-[85%] text-end ml-auto")}>
                                  {isAssistant ? (
                                    <div className="space-y-2 group/message">
                                      <MessageResponse isStreaming={isStreamingText}>
                                        {part.text}
                                      </MessageResponse>
                                      {isNotStreaming && (
                                        <MessageActions className="flex gap-0 opacity-0 transition-opacity duration-150 group-hover/message:opacity-100">
                                          <MessageAction
                                            onClick={() => navigator.clipboard.writeText(part.text)}
                                            label="Copy"
                                            tooltip="Copy to clipboard"
                                          >
                                            <Copy className="size-4" />
                                          </MessageAction>
                                          <MessageAction
                                            onClick={() => console.log("Good response:", message.id)}
                                            label="Upvote"
                                            tooltip="Good response"
                                          >
                                            <ThumbsUp className="size-4" />
                                          </MessageAction>
                                          <MessageAction
                                            onClick={() => console.log("Bad response:", message.id)}
                                            label="Downvote"
                                            tooltip="Bad response"
                                          >
                                            <ThumbsDown className="size-4" />
                                          </MessageAction>
                                        </MessageActions>
                                      )}
                                    </div>
                                  ) : (
                                    <MessageContent className="bg-primary text-primary-foreground inline-flex">
                                      {part.text}
                                    </MessageContent>
                                  )}
                                </div>
                              </Message>
                            )
                          }
                          case "reasoning": {
                            return (
                              <div key={`${message.id}-${i}`} className="flex gap-3">
                                <Reasoning isStreaming={(status === "connecting" || status === "streaming") && isLastMessage}>
                                  <ReasoningTrigger />
                                  <ReasoningContent>{part.reasoning}</ReasoningContent>
                                </Reasoning>
                              </div>
                            )
                          }
                          case "tool-call": {
                            const currentToolIndex = ++toolIndex
                            const hasResult = part.state === "completed" || part.result !== undefined
                            return (
                              <div key={`${message.id}-${i}`} className="flex gap-3">
                                <div className="flex-1">
                                  <StepIndicator
                                    step={currentToolIndex}
                                    total={toolParts.length}
                                    action={`Using ${part.toolName}`}
                                  />
                                  {hasResult && (
                                    <ToolResultRenderer
                                      toolName={part.toolName}
                                      state="result"
                                      result={part.result}
                                      args={part.args as Record<string, unknown>}
                                    />
                                  )}
                                </div>
                              </div>
                            )
                          }
                          default:
                            return null
                        }
                      })}
                    </Fragment>
                  )
                }

                // Fallback for messages without parts
                return (
                  <Message
                    key={message.id}
                    from={message.role as "user" | "assistant"}
                    className={isAssistant ? "justify-start" : "justify-end"}
                  >
                    <div className={cn(isAssistant ? "flex-1" : "max-w-[85%] text-end ml-auto")}>
                      {isAssistant ? (
                        <MessageResponse isStreaming={mappedStatus === "streaming" && isLastMessage}>
                          {message.content}
                        </MessageResponse>
                      ) : (
                        <MessageContent className="bg-primary text-primary-foreground inline-flex">
                          {message.content}
                        </MessageContent>
                      )}
                    </div>
                  </Message>
                )
              })}

              {/* Error state with retry */}
              {error && status === "error" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>{error.message || "Something went wrong. Please try again."}</span>
                    {lastUserMessage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetry}
                        className="ml-4 gap-1"
                      >
                        <RotateCcw className="size-3" />
                        Retry
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div ref={messagesEndRef} />
            </div>}

            {/* Scroll button - only show when chatting */}
          {hasStartedConversation && (
            <div className="fixed right-4 bottom-4 z-10">
              <PromptScrollButton
                containerRef={scrollContainerRef}
                threshold={100}
                className="shadow-sm"
              />
            </div>
          )}

          {/* Welcome message - shown when no messages */}
          {!hasStartedConversation && (
            <div className="mb-6">
              {/* Lottie Animation */}
              <div className="mx-auto -mt-16 hidden w-64 mask-b-from-100% md:block">
                {animationData ? (
                  <Lottie
                    animationData={animationData}
                    loop
                    autoplay
                    className="w-full"
                  />
                ) : (
                  <div className="mx-auto size-44 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 animate-pulse" />
                )}
              </div>

              {/* Greeting */}
              <h1 className="text-center text-2xl leading-normal font-medium lg:text-4xl">
                Good to see you, {user?.name?.split(" ")[0] || "there"}! <br />
                How can I help you today?
              </h1>
            </div>
          )}

        </div>
      </ChatContainer>

      {/* Input area - fixed at bottom, outside scroll container */}
      <div className="mx-auto w-full max-w-4xl px-4 pb-4 shrink-0">
        <div className={cn(
          "bg-muted w-full rounded-2xl p-1 pt-0",
          "[&_[data-slot=input-group]]:border-0 [&_[data-slot=input-group]]:ring-0 [&_[data-slot=input-group]:focus-within]:border-0 [&_[data-slot=input-group]:focus-within]:ring-0"
        )}>
            {/* Stop generation button */}
            {status === "streaming" && (
              <div className="flex justify-center py-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopGeneration}
                  className="gap-2"
                >
                  <Square className="size-3 fill-current" />
                  Stop generating
                </Button>
              </div>
            )}

            <PromptInput
              onSubmit={handleSubmit}
              accept="image/*"
              multiple
              className="w-full overflow-hidden border-0 p-0 shadow-none"
            >
              <PromptInputAttachments className="flex flex-wrap gap-2 px-4 pb-2">
                {(attachment) => <PromptInputAttachment data={attachment} />}
              </PromptInputAttachments>

              <PromptInputTextarea
                placeholder={`Ask ${displayName} anything...`}
                className="min-h-[44px] px-4 py-3"
              />

              <PromptInputFooter className="flex items-center justify-between gap-2 p-3">
                <PromptInputTools className="flex items-center gap-2">
                  <PromptInputActionMenu>
                    <PromptInputActionMenuTrigger className="hover:bg-secondary-foreground/10 flex size-8 cursor-pointer items-center justify-center rounded-2xl">
                      <Paperclip className="text-primary size-5" />
                    </PromptInputActionMenuTrigger>
                    <PromptInputActionMenuContent>
                      <PromptInputActionAddAttachments />
                    </PromptInputActionMenuContent>
                  </PromptInputActionMenu>
                </PromptInputTools>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="size-9 rounded-full">
                    <Mic className="size-4" />
                  </Button>
                  <PromptInputSubmit
                    status={mappedStatus === "streaming" ? "streaming" : mappedStatus === "submitted" ? "submitted" : "ready"}
                    className="size-8 rounded-full bg-foreground text-background hover:bg-foreground/90"
                  >
                    {status === "streaming" ? <Square className="size-4" /> : <ArrowUp className="size-4" />}
                  </PromptInputSubmit>
                </div>
              </PromptInputFooter>
            </PromptInput>
          </div>

          {/* Suggestion categories - shown below input when no messages */}
          {!hasStartedConversation && (
            <div className="relative w-full mt-4">
              {activeCategoryData ? (
                /* Expanded category suggestions */
                <div className="flex w-full flex-col space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                  {activeCategoryData.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-xl",
                        "border border-border bg-background",
                        "hover:bg-muted hover:border-muted-foreground/30",
                        "transition-all duration-200 cursor-pointer",
                        "text-sm"
                      )}
                    >
                      {highlightText(suggestion, activeCategoryData.highlight)}
                    </button>
                  ))}
                  <button
                    onClick={() => setActiveCategory(null)}
                    className="text-sm text-muted-foreground hover:text-foreground mt-2"
                  >
                    ← Back to categories
                  </button>
                </div>
              ) : (
                /* Category chips */
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {SUGGESTION_CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full",
                        "border border-border bg-background",
                        "hover:bg-muted hover:border-muted-foreground/30",
                        "transition-all duration-200 cursor-pointer",
                        "text-sm font-medium capitalize"
                      )}
                    >
                      <category.icon className="size-4" />
                      {category.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
