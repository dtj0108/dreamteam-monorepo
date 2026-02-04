"use client"

import { useState, useEffect, useCallback, useRef, type FormEvent } from "react"
import { useParams } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { useAgentChat, type AgentMessage } from "@/hooks/use-agent-chat"
import { dbMessagesToAgentMessages } from "@/lib/message-mapper"
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputHeader,
  PromptInputBody,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
  PromptInputButton,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion"
import { useAgents } from "@/providers/agents-provider"
import { useUser } from "@/hooks/use-user"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
} from "@/components/ai-elements/attachments"
import {
  Sparkles,
  Bot,
  Square,
  AlertCircle,
  RotateCcw,
  Paperclip,
  Mic,
  Loader2,
  WifiOff,
  ServerOff,
  AlertTriangle,
  PanelLeft,
  Info,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { ConversationSidebar, type ConversationItem } from "@/components/agents"
import dynamic from "next/dynamic"
import {
  MessageRenderer,
  SyntheticThinkingRenderer,
  SRAnnouncer,
  useSRAnnouncer,
} from "@/components/agent-chat"

// Dynamic import for Lottie to reduce initial bundle size
const Lottie = dynamic(() => import("lottie-react"), { ssr: false })

const ANIMATION_PATH = "/animations/ai-sphere.json"

// Suggestions for welcome screen (flat list like the demo)
const DEFAULT_SUGGESTIONS = [
  "Summarize our recent performance",
  "Help me write a function to calculate revenue",
  "What are the key metrics to focus on?",
  "Research best practices for data visualization",
  "Give me a quick overview of pending tasks",
  "Help me debug this code",
]

// Attachments display component using AI Elements
function PromptInputAttachmentsDisplay() {
  const { files, remove } = usePromptInputAttachments()
  
  if (files.length === 0) return null
  
  return (
    <Attachments variant="inline" className="px-4 pb-2">
      {files.map((file) => (
        <Attachment
          key={file.id}
          data={file}
          onRemove={() => remove(file.id)}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const { announcement, politeness, announcePolite } = useSRAnnouncer()

  // Loading states
  const [isLoadingActivity, setIsLoadingActivity] = useState(false)
  const [isSwitchingConversation, setIsSwitchingConversation] = useState(false)
  
  // Error handling with user-friendly messages
  const [errorAlert, setErrorAlert] = useState<{
    type: 'network' | 'server' | 'validation' | 'unknown'
    message: string
    retry?: () => void
  } | null>(null)

  // Welcome screen state
  const [animationData, setAnimationData] = useState<object | null>(null)

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
      if (process.env.NODE_ENV === "development") {
        console.error("Chat error:", err)
      }
      const details = getErrorDetails(err)
      setErrorAlert({
        type: details.type,
        message: details.message,
        retry: () => {
          setErrorAlert(null)
          if (lastUserMessage) {
            sendMessage(lastUserMessage)
          }
        }
      })
    },
  })

  const mappedStatus = status === "idle" ? "ready" : status === "connecting" ? "submitted" : status
  const hasStartedConversation = messages.length > 0
  const statusLabel = !isOnline
    ? "Offline"
    : status === "streaming"
      ? "Thinking…"
      : status === "connecting"
        ? "Connecting…"
        : "Ready"
  const statusBadgeClass = !isOnline
    ? "bg-destructive/10 text-destructive"
    : status === "streaming"
      ? "bg-primary/10 text-primary"
      : status === "connecting"
        ? "bg-muted text-muted-foreground"
        : "bg-emerald-100 text-emerald-700"

  // Helper to get user-friendly error message
  const getErrorDetails = useCallback((err: Error): { type: 'network' | 'server' | 'validation' | 'unknown'; message: string } => {
    const message = err.message?.toLowerCase() || ''
    
    // Network errors
    if (message.includes('network') || 
        message.includes('fetch') || 
        message.includes('failed to fetch') ||
        message.includes('abort') ||
        !navigator.onLine) {
      return {
        type: 'network',
        message: 'Connection failed. Please check your internet.'
      }
    }
    
    // Server errors (5xx)
    if (message.includes('500') || 
        message.includes('502') || 
        message.includes('503') ||
        message.includes('504') ||
        message.includes('http error: 5')) {
      return {
        type: 'server',
        message: 'Server error. Please try again later.'
      }
    }
    
    // Validation errors (4xx)
    if (message.includes('400') || 
        message.includes('401') || 
        message.includes('403') ||
        message.includes('404') ||
        message.includes('422') ||
        message.includes('http error: 4')) {
      return {
        type: 'validation',
        message: 'Invalid input. Please check your message.'
      }
    }
    
    return {
      type: 'unknown',
      message: err.message || 'Something went wrong. Please try again.'
    }
  }, [])

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

  // Track online/offline state
  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Screen reader announcements for streaming lifecycle
  const previousStatusRef = useRef(status)
  useEffect(() => {
    const prev = previousStatusRef.current
    if (status === "streaming" && prev !== "streaming") {
      announcePolite("Assistant is responding.")
    }
    if (prev === "streaming" && status === "idle") {
      announcePolite("Response complete.")
    }
    previousStatusRef.current = status
  }, [status, announcePolite])

  const fetchConversations = useCallback(async () => {
    if (!workspaceId) return
    setIsLoadingActivity(true)
    try {
      const response = await fetch(
        `/api/agent-conversations?agentId=${agentId}&workspaceId=${workspaceId}`
      )
      if (response.ok) {
        const data = await response.json()
        setConversations(data)
      } else {
        const err = new Error(`HTTP error: ${response.status}`)
        const details = getErrorDetails(err)
        setErrorAlert({
          type: details.type,
          message: `Failed to load conversations: ${details.message}`,
          retry: () => fetchConversations()
        })
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      const details = getErrorDetails(err)
      setErrorAlert({
        type: details.type,
        message: `Failed to load conversations: ${details.message}`,
        retry: () => fetchConversations()
      })
    } finally {
      setIsLoadingActivity(false)
    }
  }, [agentId, workspaceId, getErrorDetails])

  const loadConversation = useCallback(async (conversationId: string) => {
    setIsSwitchingConversation(true)
    try {
      const response = await fetch(`/api/agent-conversations/${conversationId}`)
      if (response.ok) {
        const data = await response.json()
        const msgs = dbMessagesToAgentMessages(data.messages || [])
        setLoadedMessages(msgs)
        setMessages(msgs)
        lastSavedMessageCount.current = msgs.length
        setErrorAlert(null) // Clear any previous errors
      } else {
        const err = new Error(`HTTP error: ${response.status}`)
        const details = getErrorDetails(err)
        setErrorAlert({
          type: details.type,
          message: `Failed to load conversation: ${details.message}`,
          retry: () => loadConversation(conversationId)
        })
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      const details = getErrorDetails(err)
      setErrorAlert({
        type: details.type,
        message: `Failed to load conversation: ${details.message}`,
        retry: () => loadConversation(conversationId)
      })
    } finally {
      setIsSwitchingConversation(false)
    }
  }, [setMessages, getErrorDetails])

  const startNewConversation = useCallback(() => {
    setSelectedConversationId(null)
    setLoadedMessages([])
    setMessages([])
    lastSavedMessageCount.current = 0
    setIsSidebarOpen(false)
  }, [setMessages])

  const selectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId)
    loadConversation(conversationId)
    setIsSidebarOpen(false)
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
      if (!isOnline) {
        setErrorAlert({
          type: "network",
          message: "You are offline. Reconnect to send messages.",
        })
        return
      }
      if (isSwitchingConversation) {
        return
      }
      setLastUserMessage(text)
      sendMessage(text)
    },
    [sendMessage, isOnline, isSwitchingConversation]
  )

  const handleRetry = useCallback(() => {
    if (lastUserMessage) {
      sendMessage(lastUserMessage)
    }
  }, [lastUserMessage, sendMessage])

  const handleSuggestionClick = useCallback((suggestion: string) => {
    sendMessage(suggestion)
  }, [sendMessage])

  const displayName = currentAgent?.name || cachedAgent?.name || "Agent"
  const displayDescription = currentAgent?.description || cachedAgent?.description
  const displayAvatar = currentAgent?.avatar_url || cachedAgent?.avatar_url
  
  // Use agent's suggested prompts if available, otherwise fall back to defaults
  const agentSuggestions = currentAgent?.suggested_prompts || cachedAgent?.suggested_prompts
  const suggestionsToShow = agentSuggestions && agentSuggestions.length > 0 ? agentSuggestions : DEFAULT_SUGGESTIONS

  // Loading state - shimmer skeleton for better UX
  if (isLoadingAgent && !cachedAgent) {
    return (
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar skeleton */}
        <div className="w-64 border-r bg-muted/30 hidden md:flex flex-col p-4 gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-full" />
          <div className="space-y-2 mt-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
        
        {/* Main content skeleton */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Header skeleton with shimmer */}
          <div className="flex items-center px-4 py-3 border-b shrink-0">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
          
          {/* Content area skeleton */}
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <Skeleton className="w-64 h-64 rounded-full mb-6" />
            <Skeleton className="h-8 w-96 mb-2" />
            <Skeleton className="h-8 w-64" />
          </div>
          
          {/* Input area skeleton */}
          <div className="p-4 border-t">
            <Skeleton className="h-20 w-full max-w-4xl mx-auto rounded-2xl" />
          </div>
        </div>
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
      <SRAnnouncer message={announcement} politeness={politeness} />

      {/* Conversation sidebar (desktop) */}
      <div className="hidden md:flex">
        <ConversationSidebar
          conversations={conversations}
          selectedId={selectedConversationId}
          onSelect={selectConversation}
          onNewConversation={startNewConversation}
          isLoading={isLoadingActivity}
        />
      </div>

      {/* Main chat area - centered layout like shadcn-ui-kit */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header - always present */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar trigger */}
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="md:hidden">
                  <PanelLeft className="size-4" />
                  <span className="sr-only">Open conversations</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <ConversationSidebar
                  conversations={conversations}
                  selectedId={selectedConversationId}
                  onSelect={selectConversation}
                  onNewConversation={startNewConversation}
                  isLoading={isLoadingActivity}
                />
              </SheetContent>
            </Sheet>

            <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-lg">
              {displayAvatar || <Sparkles className="size-4 text-muted-foreground" />}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium">{displayName}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusBadgeClass)}>
                  {statusLabel}
                </span>
              </div>
              {displayDescription && (
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {displayDescription}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Sheet open={isInfoOpen} onOpenChange={setIsInfoOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <Info className="size-4" />
                  <span className="sr-only">Agent info</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Agent info</SheetTitle>
                  <SheetDescription>Overview and capabilities.</SheetDescription>
                </SheetHeader>
                <div className="space-y-4 text-sm">
                  <div>
                    <div className="font-medium">Name</div>
                    <div className="text-muted-foreground">{displayName}</div>
                  </div>
                  {displayDescription && (
                    <div>
                      <div className="font-medium">Description</div>
                      <div className="text-muted-foreground">{displayDescription}</div>
                    </div>
                  )}
                  <div>
                    <div className="font-medium">Status</div>
                    <div className="text-muted-foreground">{statusLabel}</div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <Settings className="size-4" />
                  <span className="sr-only">Chat settings</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Chat settings</SheetTitle>
                  <SheetDescription>Preferences for this chat.</SheetDescription>
                </SheetHeader>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>Preferences will appear here in a future update.</p>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {!isOnline && (
          <div className="px-4 pt-4">
            <Alert variant="destructive" className="flex items-center gap-3">
              <WifiOff className="h-4 w-4" />
              <AlertDescription>
                Offline mode. Reconnect to send messages.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Main content area - using AI Elements Conversation for auto-scroll */}
        <Conversation className="flex-1 min-h-0">
          <ConversationContent className={cn(
            "mx-auto w-full max-w-4xl p-4",
            !hasStartedConversation && "h-full flex flex-col items-center justify-center"
          )}>
            {/* Messages section - only show when conversation started */}
            {hasStartedConversation && (
              <div className="space-y-6 py-6 flex-1">
                {messages.map((message, messageIndex) => (
                  <MessageRenderer
                    key={message.id}
                    message={message}
                    messageIndex={messageIndex}
                    messages={messages}
                    status={status}
                    handleRetry={handleRetry}
                  />
                ))}

                {/* Synthetic thinking - show when streaming with no real content yet */}
                <SyntheticThinkingRenderer 
                  status={status}
                  messages={messages}
                />

                {/* Error state with retry */}
                {(errorAlert || (error && status === "error")) && (
                  <Alert variant="destructive" className="animate-in fade-in-0 slide-in-from-bottom-2">
                    {errorAlert?.type === 'network' ? (
                      <WifiOff className="h-4 w-4 shrink-0" />
                    ) : errorAlert?.type === 'server' ? (
                      <ServerOff className="h-4 w-4 shrink-0" />
                    ) : errorAlert?.type === 'validation' ? (
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    <AlertDescription className="flex items-center justify-between gap-4 ml-2">
                      <span>{errorAlert?.message || error?.message || "Something went wrong. Please try again."}</span>
                      {(errorAlert?.retry || lastUserMessage) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setErrorAlert(null)
                            errorAlert?.retry ? errorAlert.retry() : handleRetry()
                          }}
                          className="shrink-0 gap-1"
                        >
                          <RotateCcw className="size-3" />
                          Retry
                        </Button>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Conversation loading indicator */}
                {isSwitchingConversation && (
                  <div className="flex items-center justify-center py-8 gap-3 text-muted-foreground animate-in fade-in-0">
                    <Loader2 className="size-5 animate-spin" />
                    <span className="text-sm">Loading conversation...</span>
                  </div>
                )}
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
          </ConversationContent>
          {hasStartedConversation && <ConversationScrollButton className="absolute bottom-4 right-4" />}
        </Conversation>

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
              globalDrop
              className="w-full overflow-hidden border-0 p-0 shadow-none"
            >
              <PromptInputHeader>
                <PromptInputAttachmentsDisplay />
              </PromptInputHeader>

              <PromptInputBody>
              <PromptInputTextarea
                placeholder={isSwitchingConversation ? "Loading conversation..." : `Ask ${displayName} anything...`}
                className="min-h-[44px] px-4 py-3"
                disabled={isSwitchingConversation || !isOnline}
              />
            </PromptInputBody>

            <PromptInputFooter className="flex items-center justify-between gap-2 p-3">
              <PromptInputTools className="flex items-center gap-2">
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger
                    className="hover:bg-secondary-foreground/10 flex size-8 cursor-pointer items-center justify-center rounded-2xl"
                    disabled={isSwitchingConversation || !isOnline}
                  >
                    <Paperclip className="text-primary size-5" />
                  </PromptInputActionMenuTrigger>
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
              </PromptInputTools>

              <div className="flex items-center gap-2">
                <PromptInputButton variant="ghost" disabled={isSwitchingConversation || !isOnline}>
                  <Mic className="size-4" />
                  <span className="sr-only">Voice</span>
                </PromptInputButton>
                <PromptInputSubmit
                  status={mappedStatus === "streaming" ? "streaming" : mappedStatus === "submitted" ? "submitted" : isSwitchingConversation ? "submitted" : "ready"}
                  disabled={isSwitchingConversation || !isOnline}
                />
              </div>
            </PromptInputFooter>
            </PromptInput>
          </div>

          {/* Suggestions - shown below input when no messages */}
          {!hasStartedConversation && (
            <Suggestions className="mt-4">
              {suggestionsToShow.map((suggestion) => (
                <Suggestion
                  key={suggestion}
                  suggestion={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                />
              ))}
            </Suggestions>
          )}
        </div>
      </div>
    </div>
  )
}
