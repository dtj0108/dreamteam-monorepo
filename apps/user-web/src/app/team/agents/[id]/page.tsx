"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import dynamic from "next/dynamic"
import { useAgentChat, type AgentMessage } from "@/hooks/use-agent-chat"
import { useTeam } from "@/providers/team-provider"
import { useUser } from "@/hooks/use-user"
import { MessageList, MessageInput, type Message } from "@/components/team"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sparkles, AlertCircle, Loader2 } from "lucide-react"
import { type UploadedFile } from "@/types/files"
import { dbMessagesToAgentMessages } from "@/lib/message-mapper"

// Dynamic import for Lottie to reduce initial bundle size
const Lottie = dynamic(() => import("lottie-react"), { ssr: false })

const ANIMATION_PATH = "/animations/ai-sphere.json"

interface Agent {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  system_prompt: string
  tools: string[]
  model: string
}

// Convert agent messages to team Message format
function agentMessagesToTeamMessages(
  agentMessages: AgentMessage[],
  agentProfile: { id: string; name: string; avatar?: string },
  currentUserId: string,
  currentUserName: string
): Message[] {
  return agentMessages.map((msg) => {
    // Extract text content from parts
    let content = msg.content || ""
    if (msg.parts) {
      const textPart = msg.parts.find((p) => p.type === "text")
      if (textPart && textPart.type === "text") {
        content = textPart.text
      }
    }

    return {
      id: msg.id,
      content,
      sender:
        msg.role === "assistant"
          ? agentProfile
          : { id: currentUserId, name: currentUserName },
      createdAt: new Date(),
      status: "sent" as const,
    }
  })
}

export default function AgentChatPage() {
  const params = useParams()
  const agentId = params.id as string
  const { getAgentById, workspaceId, refreshAgents } = useTeam()
  const { user } = useUser()

  // Get cached agent data from sidebar for instant display
  const cachedAgent = getAgentById(agentId)

  const [agent, setAgent] = useState<Agent | null>(null)
  const [loadedMessages, setLoadedMessages] = useState<AgentMessage[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [animationData, setAnimationData] = useState<object | null>(null)
  // Loading state to prevent race conditions with useAgentChat hook
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const lastSavedMessageCount = useRef(0)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Load Lottie animation data
  useEffect(() => {
    const loadAnimation = async () => {
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

  // Use the Claude Agent SDK hook
  // IMPORTANT: Only pass conversationId and initialMessages AFTER initial load completes
  // This prevents the hook's internal useEffect from resetting messages prematurely
  const {
    messages,
    sendMessage,
    status,
    error,
    setMessages,
    conversationId: hookConversationId,
  } = useAgentChat({
    agentId,
    workspaceId: workspaceId || "",
    conversationId: initialLoadComplete ? selectedConversationId : null,
    initialMessages: initialLoadComplete ? loadedMessages : [],
    onConversationCreated: (newConversationId) => {
      setSelectedConversationId(newConversationId)
    },
    onError: (err) => {
      console.error("Chat error:", err)
    },
  })

  // Fetch full agent details (system prompt, tools, etc.) - non-blocking
  const fetchAgent = useCallback(async () => {
    try {
      const response = await fetch(`/api/team/agents/${agentId}`)
      if (response.ok) {
        const data = await response.json()
        setAgent(data)
      }
    } catch (error) {
      console.error("Failed to fetch agent:", error)
    }
  }, [agentId])

  // Save messages when chat completes
  const saveMessages = useCallback(async () => {
    const convId = selectedConversationId || hookConversationId
    if (!convId || messages.length <= lastSavedMessageCount.current) return

    // Get only new messages
    const newMessages = messages.slice(lastSavedMessageCount.current)
    if (newMessages.length === 0) return

    try {
      const messagesToSave = newMessages.map((msg) => {
        // Extract text content from parts
        const textPart = msg.parts?.find((p) => p.type === "text") as
          | { type: "text"; text: string }
          | undefined
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
    } catch (error) {
      console.error("Failed to save messages:", error)
    }
  }, [selectedConversationId, hookConversationId, messages])

  // Save messages when status changes from streaming to idle
  useEffect(() => {
    if (status === "idle" && messages.length > lastSavedMessageCount.current) {
      saveMessages()
    }
  }, [status, messages.length, saveMessages])

  useEffect(() => {
    fetchAgent()
  }, [fetchAgent])

  // Mark conversation as read when conversation loads or changes
  // This clears the unread badge in the sidebar
  useEffect(() => {
    async function markAsRead() {
      if (!selectedConversationId) return

      try {
        await fetch(`/api/agent-conversations/${selectedConversationId}/read`, {
          method: "PATCH",
        })
        // Refresh agents to update unread counts in sidebar
        refreshAgents()
      } catch (error) {
        console.error("Failed to mark conversation as read:", error)
      }
    }

    markAsRead()
  }, [selectedConversationId, refreshAgents])

  // Load existing conversation and messages on mount using combined endpoint
  // This eliminates the sequential API call waterfall (was ~1 second delay)
  useEffect(() => {
    async function loadInitialData() {
      if (!agentId || !workspaceId) {
        setIsInitialLoading(false)
        setInitialLoadComplete(true)
        return
      }

      try {
        // Single combined fetch for conversation + messages
        const response = await fetch(
          `/api/agent-conversations/latest?agentId=${agentId}&workspaceId=${workspaceId}`
        )

        if (!response.ok) {
          console.error("Failed to load conversation data")
          return
        }

        const { conversation, messages: dbMessages } = await response.json()

        if (conversation && dbMessages.length > 0) {
          const msgs = dbMessagesToAgentMessages(dbMessages)
          setSelectedConversationId(conversation.id)
          setLoadedMessages(msgs)
          // Set messages directly on the hook after load completes
          setMessages(msgs)
          lastSavedMessageCount.current = msgs.length
        }
      } catch (error) {
        console.error("Failed to load existing conversation:", error)
      } finally {
        // Mark loading complete regardless of success/failure
        setIsInitialLoading(false)
        setInitialLoadComplete(true)
      }
    }

    loadInitialData()
  }, [agentId, workspaceId, setMessages])

  const handleSendMessage = async (content: string, _attachments?: UploadedFile[]) => {
    if (!content.trim()) return
    sendMessage(content)
  }

  // Use cached data for instant display, fallback to full agent data
  const displayName = agent?.name || cachedAgent?.name || "Agent"
  const displayDescription = agent?.description || cachedAgent?.description
  const displayAvatar = agent?.avatar_url || cachedAgent?.avatar_url
  const currentUserId = user?.id || "user"
  const currentUserName = user?.name || "You"

  // Convert agent messages to team Message format
  const teamMessages = agentMessagesToTeamMessages(
    messages,
    { id: agentId, name: displayName, avatar: displayAvatar || undefined },
    currentUserId,
    currentUserName
  )

  // Generate initials for avatar fallback
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "AI"

  // Agent not found (no cached data either)
  if (!agent && !cachedAgent) {
    return (
      <div className="flex-1 h-full flex flex-col overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Sparkles className="size-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold">Agent not found</h2>
            <p className="text-muted-foreground">This agent may have been deleted.</p>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state while fetching initial conversation data
  // This prevents the flash of empty "Chat with Agent" screen
  if (isInitialLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header with agent info */}
        <div className="h-14 shrink-0 flex items-center gap-3 px-4 border-b bg-background">
          <Avatar className="size-10">
            <AvatarImage src={displayAvatar || undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="font-semibold">{displayName}</h2>
            {displayDescription && (
              <p className="text-xs text-muted-foreground">{displayDescription}</p>
            )}
          </div>
        </div>

        {/* Loading spinner */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="size-8 animate-spin" />
            <p className="text-sm">Loading conversation...</p>
          </div>
        </div>

        {/* Disabled input during loading */}
        <MessageInput
          placeholder={`Message ${displayName}`}
          onSend={handleSendMessage}
          workspaceId={workspaceId || ""}
          disabled
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* DM-style Header */}
      <div className="h-14 shrink-0 flex items-center gap-3 px-4 border-b bg-background">
        <Avatar className="size-10">
          <AvatarImage src={displayAvatar || undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-semibold">{displayName}</h2>
          {displayDescription && (
            <p className="text-xs text-muted-foreground">{displayDescription}</p>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-4 mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error.message || "An error occurred"}</span>
        </div>
      )}

      {/* Messages - scrollable area */}
      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto">
        {messages.length === 0 && status !== "connecting" ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            {/* Lottie Animation */}
            <div className="w-44 h-44 mb-6 flex items-center justify-center">
              {animationData ? (
                <Lottie
                  animationData={animationData}
                  loop
                  autoplay
                  className="w-full h-full"
                />
              ) : (
                <div className="size-36 rounded-full bg-gradient-to-br from-sky-100 to-sky-200 animate-pulse" />
              )}
            </div>
            <h2 className="text-xl font-semibold mb-2">
              Chat with {displayName}
            </h2>
            <p className="text-muted-foreground max-w-md mb-4">
              {displayDescription || "Ask a question to get started."}
            </p>
          </div>
        ) : (
          <MessageList
            messages={teamMessages}
            currentUserId={currentUserId}
            isLoading={status === "connecting" || status === "streaming"}
            scrollContainerRef={messagesContainerRef}
            onReact={undefined}
            onReply={undefined}
            onEdit={undefined}
            onDelete={undefined}
          />
        )}
      </div>

      {/* Message Input */}
      <MessageInput
        placeholder={`Message ${displayName}`}
        onSend={handleSendMessage}
        workspaceId={workspaceId || ""}
      />
    </div>
  )
}
