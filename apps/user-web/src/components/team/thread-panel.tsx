"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageInput } from "./message-input"
import { MessageItem, Message } from "./message-item"
import { X, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ThreadPanelProps {
  parentMessage: Message
  replies: Message[]
  isLoading?: boolean
  currentUserId?: string
  workspaceId: string
  channelId?: string
  dmConversationId?: string
  onClose: () => void
  onSendReply: (content: string) => void
  onReact?: (messageId: string, emoji: string) => void
  onEdit?: (messageId: string, newContent: string) => Promise<void>
  onDelete?: (messageId: string) => void
}

export function ThreadPanel({
  parentMessage,
  replies,
  isLoading = false,
  currentUserId,
  workspaceId,
  channelId,
  dmConversationId,
  onClose,
  onSendReply,
  onReact,
  onEdit,
  onDelete,
}: ThreadPanelProps) {
  const initials = parentMessage.sender.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="w-96 border-l flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-14 border-b px-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Thread</h2>
          <p className="text-xs text-muted-foreground">
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {/* Parent Message */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex gap-3">
            <Avatar className="size-9 shrink-0">
              <AvatarImage src={parentMessage.sender.avatar} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-sm">
                  {parentMessage.sender.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(parentMessage.createdAt, { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">
                {parentMessage.content}
              </p>
            </div>
          </div>
        </div>

        {/* Replies */}
        <div className="py-2">
          {isLoading && replies.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : replies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No replies yet. Be the first to reply!
            </div>
          ) : (
            replies.map((reply) => (
              <MessageItem
                key={reply.id}
                message={reply}
                isCurrentUser={reply.sender.id === currentUserId}
                onReact={onReact}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Reply Input */}
      <MessageInput
        placeholder="Reply in thread..."
        onSend={onSendReply}
        workspaceId={workspaceId}
        channelId={channelId}
        dmConversationId={dmConversationId}
      />
    </div>
  )
}

