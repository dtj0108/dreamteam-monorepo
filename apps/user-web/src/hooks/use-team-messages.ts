"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase"
import type { Message } from "@/components/team/message-item"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { playNotificationSound } from "./use-notification-sound"
import { showBrowserNotification } from "./use-browser-notifications"

// Module-level cache for instant loads when switching channels
const messageCache = new Map<string, Message[]>()

function getCacheKey(channelId?: string, dmConversationId?: string): string {
  if (channelId) return `channel:${channelId}`
  if (dmConversationId) return `dm:${dmConversationId}`
  return ""
}

interface UseTeamMessagesOptions {
  channelId?: string
  dmConversationId?: string
  workspaceId?: string
  currentUserId?: string
  currentUserName?: string
  currentUserAvatar?: string
}

interface RawReaction {
  id: string
  emoji: string
  profile_id: string
}

interface RawAttachment {
  id: string
  file_name: string
  file_type: string | null
  file_size: number | null
  file_url: string
  storage_path?: string
}

interface MessagePayload {
  id: string
  content: string
  sender_id: string
  channel_id: string | null
  dm_conversation_id: string | null
  parent_id: string | null
  created_at: string
  is_edited: boolean
  edited_at: string | null
  is_deleted?: boolean
  sender?: {
    id: string
    name: string
    avatar_url: string | null
  }
  reactions?: RawReaction[]
  attachments?: RawAttachment[]
}

export interface TypingUser {
  id: string
  name: string
  avatar?: string
}

export function useTeamMessages({
  channelId,
  dmConversationId,
  workspaceId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
}: UseTeamMessagesOptions) {
  const cacheKey = getCacheKey(channelId, dmConversationId)
  const cachedMessages = cacheKey ? messageCache.get(cacheKey) : undefined

  // Initialize with cached messages if available (instant load)
  const [messages, setMessages] = useState<Message[]>(cachedMessages || [])
  const [isLoading, setIsLoading] = useState(!cachedMessages) // Only loading if no cache
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasInitialDataRef = useRef(!!cachedMessages)
  const supabase = createClient()

  // Reset messages when channel changes (useState initial value only runs on mount)
  useEffect(() => {
    const newCacheKey = getCacheKey(channelId, dmConversationId)
    const newCachedMessages = newCacheKey ? messageCache.get(newCacheKey) : undefined
    setMessages(newCachedMessages || [])
    setIsLoading(!newCachedMessages)
    hasInitialDataRef.current = !!newCachedMessages
  }, [channelId, dmConversationId])

  // Aggregate raw reactions into UI format
  const aggregateReactions = useCallback((rawReactions: RawReaction[] | undefined, userId: string | undefined) => {
    if (!rawReactions || rawReactions.length === 0) return undefined

    const reactionMap = new Map<string, { count: number; hasReacted: boolean }>()

    for (const reaction of rawReactions) {
      const existing = reactionMap.get(reaction.emoji)
      if (existing) {
        existing.count++
        if (reaction.profile_id === userId) {
          existing.hasReacted = true
        }
      } else {
        reactionMap.set(reaction.emoji, {
          count: 1,
          hasReacted: reaction.profile_id === userId,
        })
      }
    }

    return Array.from(reactionMap.entries()).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      hasReacted: data.hasReacted,
    }))
  }, [])

  // Transform database message to UI message format
  const transformMessage = useCallback((msg: MessagePayload): Message => {
    return {
      id: msg.id,
      content: msg.content,
      sender: {
        id: msg.sender_id,
        name: msg.sender?.name || "Unknown",
        avatar: msg.sender?.avatar_url || undefined,
      },
      createdAt: new Date(msg.created_at),
      isEdited: msg.is_edited,
      status: "sent", // Default to sent for received messages
      reactions: aggregateReactions(msg.reactions, currentUserId),
      attachments: msg.attachments?.map((att) => ({
        id: att.id,
        fileName: att.file_name,
        fileType: att.file_type,
        fileSize: att.file_size,
        fileUrl: att.file_url,
        storagePath: att.storage_path,
      })),
    }
  }, [aggregateReactions, currentUserId])

  // Fetch initial messages - stale-while-revalidate pattern
  const fetchMessages = useCallback(async (before?: string) => {
    if (!channelId && !dmConversationId) return

    const key = getCacheKey(channelId, dmConversationId)

    try {
      // Only show loading on first fetch, not on revalidation
      if (!hasInitialDataRef.current) {
        setIsLoading(true)
      }
      setError(null)

      const params = new URLSearchParams()
      if (channelId) params.set("channelId", channelId)
      if (dmConversationId) params.set("dmConversationId", dmConversationId)
      if (before) params.set("before", before)

      const response = await fetch(`/api/team/messages?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch messages")
      }

      const transformedMessages = data.messages.map(transformMessage)

      if (before) {
        setMessages((prev) => {
          const updated = [...transformedMessages, ...prev]
          if (key) messageCache.set(key, updated) // Update cache
          return updated
        })
      } else {
        setMessages(transformedMessages)
        if (key) messageCache.set(key, transformedMessages) // Update cache
      }

      setHasMore(data.hasMore)
      hasInitialDataRef.current = true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages")
    } finally {
      setIsLoading(false)
    }
  }, [channelId, dmConversationId, transformMessage])

  // Send a message
  const sendMessage = useCallback(async (content: string, attachments?: Array<{
    id: string
    fileName: string
    fileType: string
    fileSize: number
    fileUrl: string
    storagePath: string
  }>) => {
    if (!workspaceId || (!channelId && !dmConversationId)) {
      throw new Error("Missing required context")
    }

    // Optimistically add the message with "sending" status
    const tempId = `temp-${Date.now()}`
    const optimisticMessage: Message = {
      id: tempId,
      content,
      sender: {
        id: currentUserId || "",
        name: currentUserName || "You",
        avatar: currentUserAvatar,
      },
      createdAt: new Date(),
      status: "sending",
      attachments: attachments?.map((att) => ({
        id: att.id,
        fileName: att.fileName,
        fileType: att.fileType,
        fileSize: att.fileSize,
        fileUrl: att.fileUrl,
        storagePath: att.storagePath,
      })),
    }
    setMessages((prev) => [...prev, optimisticMessage])

    try {
      const response = await fetch("/api/team/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          channelId,
          dmConversationId,
          content,
          attachments,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Update optimistic message to failed
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId ? { ...msg, status: "failed" as const } : msg
          )
        )
        throw new Error(data.error || "Failed to send message")
      }

      // Replace optimistic message with real one
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === tempId
            ? { ...transformMessage(data), status: "sent" as const }
            : msg
        )
        // Update cache
        const key = getCacheKey(channelId, dmConversationId)
        if (key) messageCache.set(key, updated)
        return updated
      })

      return data
    } catch (err) {
      // Mark as failed on error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...msg, status: "failed" as const } : msg
        )
      )
      throw err
    }
  }, [workspaceId, channelId, dmConversationId, currentUserId, currentUserName, currentUserAvatar, transformMessage])

  // Edit a message
  const editMessage = useCallback(async (messageId: string, content: string) => {
    const response = await fetch(`/api/team/messages/${messageId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Failed to edit message")
    }

    // Update local state
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, content, isEdited: true } : msg
      )
    )

    return data
  }, [])

  // Delete a message
  const deleteMessage = useCallback(async (messageId: string) => {
    const response = await fetch(`/api/team/messages/${messageId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || "Failed to delete message")
    }

    // Remove from local state
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
  }, [])

  // React to a message (toggle - add or remove)
  const reactToMessage = useCallback(async (messageId: string, emoji: string) => {
    // Find the current message to check if user has already reacted
    const message = messages.find((m) => m.id === messageId)
    const existingReaction = message?.reactions?.find((r) => r.emoji === emoji)
    const hasReacted = existingReaction?.hasReacted || false

    if (hasReacted) {
      // Remove reaction - optimistic update first
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg
          const reactions = msg.reactions || []
          return {
            ...msg,
            reactions: reactions
              .map((r) =>
                r.emoji === emoji
                  ? { ...r, count: r.count - 1, hasReacted: false }
                  : r
              )
              .filter((r) => r.count > 0), // Remove if count is 0
          }
        })
      )

      // Call DELETE endpoint
      const response = await fetch(
        `/api/team/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        // Revert on error
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== messageId) return msg
            const reactions = msg.reactions || []
            const existing = reactions.find((r) => r.emoji === emoji)
            if (existing) {
              return {
                ...msg,
                reactions: reactions.map((r) =>
                  r.emoji === emoji ? { ...r, count: r.count + 1, hasReacted: true } : r
                ),
              }
            }
            return {
              ...msg,
              reactions: [...reactions, { emoji, count: 1, hasReacted: true }],
            }
          })
        )
        const data = await response.json()
        throw new Error(data.error || "Failed to remove reaction")
      }
    } else {
      // Add reaction - optimistic update first
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg
          const reactions = msg.reactions || []
          const existing = reactions.find((r) => r.emoji === emoji)
          if (existing) {
            return {
              ...msg,
              reactions: reactions.map((r) =>
                r.emoji === emoji ? { ...r, count: r.count + 1, hasReacted: true } : r
              ),
            }
          }
          return {
            ...msg,
            reactions: [...reactions, { emoji, count: 1, hasReacted: true }],
          }
        })
      )

      // Call POST endpoint
      const response = await fetch(`/api/team/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      })

      if (!response.ok) {
        // Revert on error
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== messageId) return msg
            const reactions = msg.reactions || []
            return {
              ...msg,
              reactions: reactions
                .map((r) =>
                  r.emoji === emoji
                    ? { ...r, count: r.count - 1, hasReacted: false }
                    : r
                )
                .filter((r) => r.count > 0),
            }
          })
        )
        const data = await response.json()
        throw new Error(data.error || "Failed to add reaction")
      }
    }
  }, [messages])

  // Load more messages (pagination)
  const loadMore = useCallback(() => {
    if (messages.length > 0) {
      const oldest = messages[0]
      fetchMessages(oldest.createdAt.toISOString())
    }
  }, [messages, fetchMessages])

  // Broadcast typing status
  const setTyping = useCallback((isTyping: boolean) => {
    if (!realtimeChannelRef.current || !currentUserId) return

    if (isTyping) {
      realtimeChannelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: currentUserId,
          userName: currentUserName || "Someone",
          userAvatar: currentUserAvatar,
          isTyping: true,
        },
      })
    } else {
      realtimeChannelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: currentUserId,
          isTyping: false,
        },
      })
    }
  }, [currentUserId, currentUserName, currentUserAvatar])

  // Set up realtime subscription
  useEffect(() => {
    if (!channelId && !dmConversationId) return

    // Initial fetch
    fetchMessages()

    // Subscribe to new messages and typing events
    const roomId = channelId
      ? `channel:${channelId}`
      : `dm:${dmConversationId}`

    const channel = supabase
      .channel(roomId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: channelId
            ? `channel_id=eq.${channelId}`
            : `dm_conversation_id=eq.${dmConversationId}`,
        },
        async (payload) => {
          // Skip if this is our own optimistic message
          if (payload.new.sender_id === currentUserId) {
            // Check if we already have this message (from optimistic update)
            const exists = messages.some(
              (m) => m.id === payload.new.id || m.content === payload.new.content
            )
            if (exists) return
          }

          // Fetch the full message with sender info
          const { data: newMessage } = await supabase
            .from("messages")
            .select(`
              *,
              sender:sender_id(id, name, avatar_url)
            `)
            .eq("id", payload.new.id)
            .single()

          if (newMessage) {
            const transformed = transformMessage(newMessage as MessagePayload)
            setMessages((prev) => {
              // Dedupe by id
              if (prev.some((m) => m.id === transformed.id)) return prev
              return [...prev, transformed]
            })

            // Play notification sound and show browser notification for messages from others
            if (newMessage.sender_id !== currentUserId) {
              // Check if message mentions current user
              const mentionsMe = currentUserName && newMessage.content?.includes(`@${currentUserName}`)
              playNotificationSound(mentionsMe ? "mention" : "message")

              // Show browser notification
              const senderName = newMessage.sender?.name || "Someone"
              const preview = newMessage.content?.slice(0, 100) || "Sent an attachment"
              showBrowserNotification(`New message from ${senderName}`, {
                body: preview,
                tag: `message-${newMessage.id}`, // Prevent duplicate notifications
              })
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: channelId
            ? `channel_id=eq.${channelId}`
            : `dm_conversation_id=eq.${dmConversationId}`,
        },
        (payload) => {
          const updated = payload.new as MessagePayload
          if (updated.is_deleted) {
            setMessages((prev) => prev.filter((msg) => msg.id !== updated.id))
          } else {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === updated.id
                  ? { ...msg, content: updated.content, isEdited: updated.is_edited }
                  : msg
              )
            )
          }
        }
      )
      // Listen for typing events
      .on("broadcast", { event: "typing" }, (payload) => {
        const { userId, userName, userAvatar, isTyping } = payload.payload

        // Don't show our own typing indicator
        if (userId === currentUserId) return

        if (isTyping) {
          setTypingUsers((prev) => {
            if (prev.some((u) => u.id === userId)) return prev
            return [...prev, { id: userId, name: userName, avatar: userAvatar }]
          })

          // Auto-remove after 3 seconds if no update
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
          }
          typingTimeoutRef.current = setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u.id !== userId))
          }, 3000)
        } else {
          setTypingUsers((prev) => prev.filter((u) => u.id !== userId))
        }
      })
      .subscribe()

    realtimeChannelRef.current = channel

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  // Note: messages intentionally excluded from deps - subscription should not recreate on message changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, dmConversationId, supabase, fetchMessages, transformMessage, currentUserId])

  return {
    messages,
    isLoading,
    hasMore,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    loadMore,
    typingUsers,
    setTyping,
  }
}
