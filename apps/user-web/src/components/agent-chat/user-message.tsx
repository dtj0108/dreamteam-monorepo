"use client"

import { Message, MessageContent } from "@/components/ai-elements/message"
import { cn } from "@/lib/utils"

interface UserMessageProps {
  content: string
  timestamp?: Date
}

function formatTimestamp(date?: Date) {
  if (!date) return ""
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

export function UserMessage({ content, timestamp }: UserMessageProps) {
  const displayTimestamp = formatTimestamp(timestamp)
  return (
    <div className="group relative flex flex-col items-end gap-1">
      <Message from="user">
        <MessageContent>
          {content}
        </MessageContent>
      </Message>
      {displayTimestamp && (
        <span
          className={cn(
            "text-[11px] text-muted-foreground opacity-0 transition-opacity",
            "group-hover:opacity-100"
          )}
        >
          {displayTimestamp}
        </span>
      )}
    </div>
  )
}
