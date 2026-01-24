"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { MessageSquare, MoreHorizontal, Check, CheckCheck, AlertCircle, Copy, Edit2, Bookmark } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { EmojiPicker } from "./emoji-picker"
import { MessageContent } from "./message-content"
import { MessageAttachments, ImageLightbox } from "./file-upload"
import { type MessageAttachment, isImageFile } from "@/types/files"

export interface Message {
  id: string
  content: string
  sender: {
    id: string
    name: string
    avatar?: string
  }
  createdAt: Date
  isEdited?: boolean
  reactions?: { emoji: string; count: number; hasReacted: boolean }[]
  threadCount?: number
  status?: "sending" | "sent" | "read" | "failed"
  readAt?: Date
  attachments?: MessageAttachment[]
}

interface MessageStatusProps {
  status: "sending" | "sent" | "read" | "failed"
  readAt?: Date
}

function MessageStatus({ status, readAt }: MessageStatusProps) {
  const getTooltipText = () => {
    switch (status) {
      case "sending":
        return "Sending..."
      case "sent":
        return "Sent"
      case "read":
        return readAt ? `Read ${formatDistanceToNow(readAt, { addSuffix: true })}` : "Read"
      case "failed":
        return "Failed to send"
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center">
            {status === "sending" && (
              <span className="size-3 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
            )}
            {status === "sent" && (
              <Check className="size-3.5 text-muted-foreground" />
            )}
            {status === "read" && (
              <CheckCheck className="size-3.5 text-primary" />
            )}
            {status === "failed" && (
              <AlertCircle className="size-3.5 text-destructive" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {getTooltipText()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface MessageItemProps {
  message: Message
  isCurrentUser?: boolean
  isFirstInGroup?: boolean
  isLastInGroup?: boolean
  onReact?: (messageId: string, emoji: string) => void
  onReply?: (messageId: string) => void
  onEdit?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onBookmark?: (messageId: string) => void
}

export function MessageItem({
  message,
  isCurrentUser = false,
  isFirstInGroup = true,
  isLastInGroup = true,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onBookmark,
}: MessageItemProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const initials = message.sender.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.content)
  }

  // Get image attachments for lightbox
  const imageAttachments = message.attachments?.filter((a) => isImageFile(a.fileType, a.fileName)) || []

  const handleImageClick = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  return (
    <div
      className={cn(
        "group relative flex gap-3 px-4 hover:bg-muted/50 transition-colors",
        isFirstInGroup ? "pt-2" : "pt-0.5",
        isLastInGroup ? "pb-2 border-b border-border/40" : "pb-0.5"
      )}
    >
      {/* Avatar - only show for first in group, otherwise spacer */}
      {isFirstInGroup ? (
        <Avatar className="size-9 shrink-0 mt-0.5">
          <AvatarImage src={message.sender.avatar} alt={message.sender.name} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-9 shrink-0" /> 
      )}
      
      <div className="flex-1 min-w-0">
        {/* Header: name + timestamp - only show for first in group */}
        {isFirstInGroup && (
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm hover:underline cursor-pointer">
              {message.sender.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(message.createdAt, { addSuffix: true })}
            </span>
            {message.status && <MessageStatus status={message.status} readAt={message.readAt} />}
            {message.isEdited && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>
        )}
        
        {/* Message content */}
        <div className={cn(isFirstInGroup ? "mt-0.5" : "")}>
          {message.content && (
            <MessageContent content={message.content} className="text-sm" />
          )}
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <MessageAttachments
            attachments={message.attachments}
            onImageClick={handleImageClick}
          />
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => onReact?.(message.id, reaction.emoji)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors",
                  reaction.hasReacted
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-muted border-transparent hover:border-border"
                )}
              >
                <span>{reaction.emoji}</span>
                {reaction.count > 1 && <span className="font-medium">{reaction.count}</span>}
              </button>
            ))}
          </div>
        )}
        
        {/* Thread indicator */}
        {message.threadCount && message.threadCount > 0 && (
          <button
            onClick={() => onReply?.(message.id)}
            className="flex items-center gap-1.5 mt-1.5 text-xs text-primary hover:underline"
          >
            <MessageSquare className="size-3.5" />
            <span>{message.threadCount} {message.threadCount === 1 ? "reply" : "replies"}</span>
          </button>
        )}
      </div>
      
      {/* Action buttons - show on hover (positioned above message like Slack) */}
      <div className="absolute -top-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex items-center gap-0.5 bg-background border rounded-lg shadow-md p-0.5">
          {/* Emoji picker */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <EmojiPicker
                    onSelect={(emoji) => onReact?.(message.id, emoji)}
                    align="end"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Add reaction</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Reply in thread */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => onReply?.(message.id)}
                >
                  <MessageSquare className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Reply in thread</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Bookmark */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => onBookmark?.(message.id)}
                >
                  <Bookmark className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Bookmark</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleCopyText}>
                <Copy className="size-4 mr-2" />
                Copy text
              </DropdownMenuItem>
              {isCurrentUser && (
                <>
                  <DropdownMenuItem onClick={() => onEdit?.(message.id)}>
                    <Edit2 className="size-4 mr-2" />
                    Edit message
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete?.(message.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete message
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Image Lightbox */}
      {imageAttachments.length > 0 && (
        <ImageLightbox
          images={imageAttachments}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </div>
  )
}
