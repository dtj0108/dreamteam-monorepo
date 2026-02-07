"use client"

import { useRef, useEffect, useMemo } from "react"
import { isSameDay } from "date-fns"
import { MessageItem, Message } from "./message-item"
import { TypingIndicator } from "./typing-indicator"
import { DateSeparator } from "./date-separator"
import { MeetingEventItem } from "./meeting-event-item"
import { Loader2 } from "lucide-react"

interface TypingUser {
  id: string
  name: string
  avatar?: string
}

export interface MeetingEvent {
  id: string
  startedAt: string
  endedAt: string
  participants: Array<{
    profile: {
      id: string
      name: string
      avatar_url: string | null
    }
  }>
}

// Union type for timeline items
type TimelineItem =
  | { type: "message"; data: Message; timestamp: Date }
  | { type: "meeting"; data: MeetingEvent; timestamp: Date }

interface MessageListProps {
  messages: Message[]
  meetings?: MeetingEvent[]
  currentUserId?: string
  isLoading?: boolean
  hasMore?: boolean
  typingUsers?: TypingUser[]
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>
  onLoadMore?: () => void
  onReact?: (messageId: string, emoji: string) => void
  onReply?: (messageId: string) => void
  onEdit?: (messageId: string, newContent: string) => Promise<void>
  onDelete?: (messageId: string) => void
}

export function MessageList({
  messages,
  meetings = [],
  currentUserId,
  isLoading = false,
  hasMore = false,
  typingUsers = [],
  scrollContainerRef,
  onLoadMore,
  onReact,
  onReply,
  onEdit,
  onDelete,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const hasScrolledInitially = useRef(false)

  // Merge messages and meetings into a unified timeline, sorted by timestamp
  const timelineItems = useMemo((): TimelineItem[] => {
    const messageItems: TimelineItem[] = messages.map((msg) => ({
      type: "message" as const,
      data: msg,
      timestamp: new Date(msg.createdAt),
    }))

    const meetingItems: TimelineItem[] = meetings.map((meeting) => ({
      type: "meeting" as const,
      data: meeting,
      timestamp: new Date(meeting.endedAt),
    }))

    // Combine and sort by timestamp (oldest first)
    return [...messageItems, ...meetingItems].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    )
  }, [messages, meetings])

  // Initial scroll to bottom when messages first load
  useEffect(() => {
    if (timelineItems.length > 0 && !hasScrolledInitially.current) {
      // Use requestAnimationFrame to wait for DOM paint
      // This ensures scrollHeight reflects the actual rendered messages
      requestAnimationFrame(() => {
        if (scrollContainerRef?.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
        }
      })
      hasScrolledInitially.current = true
    }
  }, [timelineItems.length, scrollContainerRef])

  // Reset initial scroll flag when channel changes (messages array identity changes)
  useEffect(() => {
    hasScrolledInitially.current = false
  }, [messages])

  // Auto-scroll to bottom on new messages/meetings or typing indicator
  useEffect(() => {
    // Use scrollContainerRef if provided (preferred - avoids page scroll)
    if (scrollContainerRef?.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    } else if (bottomRef.current) {
      // Fallback to scrollIntoView with block: 'nearest' to avoid page scroll
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [timelineItems.length, typingUsers.length, scrollContainerRef])

  // Infinite scroll handler (uses provided scroll container when available)
  useEffect(() => {
    const target = scrollContainerRef?.current ?? scrollRef.current
    if (!target || !onLoadMore) return

    const handleScroll = () => {
      if (target.scrollTop === 0 && hasMore && !isLoading) {
        onLoadMore()
      }
    }

    target.addEventListener("scroll", handleScroll)
    return () => target.removeEventListener("scroll", handleScroll)
  }, [scrollContainerRef, hasMore, isLoading, onLoadMore])

  if (timelineItems.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No messages yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Be the first to say something!
          </p>
        </div>
      </div>
    )
  }

  // Determine if we should show a date separator before this item
  const shouldShowDateSeparator = (index: number) => {
    const item = timelineItems[index]
    const prevItem = index > 0 ? timelineItems[index - 1] : null

    if (!prevItem) return true // Always show separator before first item
    return !isSameDay(item.timestamp, prevItem.timestamp)
  }

  // Determine message grouping (only applies to message items)
  const getMessageGrouping = (item: TimelineItem, index: number) => {
    if (item.type !== "message") {
      return { isFirstInGroup: true, isLastInGroup: true }
    }

    const message = item.data
    const prevItem = index > 0 ? timelineItems[index - 1] : null
    const nextItem = index < timelineItems.length - 1 ? timelineItems[index + 1] : null

    // Day change resets grouping
    const isDifferentDayFromPrev = shouldShowDateSeparator(index)

    // Grouping only continues with same sender AND same item type (message)
    const isSameSenderAsPrev =
      prevItem?.type === "message" &&
      prevItem.data.sender.id === message.sender.id &&
      !isDifferentDayFromPrev

    const isSameSenderAsNext =
      nextItem?.type === "message" &&
      nextItem.data.sender.id === message.sender.id &&
      isSameDay(item.timestamp, nextItem.timestamp)

    return {
      isFirstInGroup: !isSameSenderAsPrev,
      isLastInGroup: !isSameSenderAsNext,
    }
  }

  return (
    <div ref={scrollRef} className="flex flex-col min-h-0">
      <div className="py-4">
        {/* Loading indicator for older messages */}
        {isLoading && hasMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Timeline items (messages + meetings) */}
        <div>
          {timelineItems.map((item, index) => {
            const showDateSeparator = shouldShowDateSeparator(index)

            if (item.type === "meeting") {
              return (
                <div key={`meeting-${item.data.id}`}>
                  {showDateSeparator && (
                    <DateSeparator date={item.timestamp} />
                  )}
                  <MeetingEventItem meeting={item.data} />
                </div>
              )
            }

            // Message item
            const { isFirstInGroup, isLastInGroup } = getMessageGrouping(item, index)
            const message = item.data

            return (
              <div key={message.id}>
                {showDateSeparator && (
                  <DateSeparator date={item.timestamp} />
                )}
                <MessageItem
                  message={message}
                  isCurrentUser={message.sender.id === currentUserId}
                  isFirstInGroup={isFirstInGroup}
                  isLastInGroup={isLastInGroup}
                  onReact={onReact}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            )
          })}
        </div>

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <TypingIndicator users={typingUsers} />
        )}

        {/* Bottom anchor for auto-scroll */}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
