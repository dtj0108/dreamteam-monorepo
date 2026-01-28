"use client"

import { Message, MessageContent } from "@/components/ai-elements/message"

interface UserMessageProps {
  content: string
  timestamp?: Date
}

export function UserMessage({ content, timestamp }: UserMessageProps) {
  return (
    <Message from="user">
      <MessageContent>
        {content}
      </MessageContent>
    </Message>
  )
}
