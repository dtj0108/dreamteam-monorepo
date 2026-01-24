"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, Loader2 } from "lucide-react"

interface ThreadLead {
  id: string
  name: string
}

interface ThreadContact {
  id: string
  first_name: string
  last_name: string
}

interface LastMessage {
  id: string
  type: string
  direction: string
  body: string | null
  created_at: string
}

export interface TextThread {
  id: string
  phone_number: string
  unread_count: number
  last_message_at: string | null
  is_archived: boolean
  lead?: ThreadLead | null
  contact?: ThreadContact | null
  last_message?: LastMessage | null
}

interface TextsListProps {
  selectedId: string | null
  onSelect: (thread: TextThread) => void
}

export function TextsList({ selectedId, onSelect }: TextsListProps) {
  const [threads, setThreads] = useState<TextThread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchThreads() {
      try {
        const res = await fetch("/api/communications/threads?limit=100")
        if (!res.ok) throw new Error("Failed to fetch threads")
        const data = await res.json()
        setThreads(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load messages")
      } finally {
        setLoading(false)
      }
    }
    fetchThreads()
  }, [])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffDays === 1) {
      return "Yesterday"
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  const formatPhoneNumber = (number: string) => {
    if (number.startsWith("+1") && number.length === 12) {
      return `(${number.slice(2, 5)}) ${number.slice(5, 8)}-${number.slice(8)}`
    }
    return number
  }

  const getContactName = (thread: TextThread) => {
    if (thread.lead?.name) return thread.lead.name
    if (thread.contact) {
      return `${thread.contact.first_name} ${thread.contact.last_name}`.trim()
    }
    return formatPhoneNumber(thread.phone_number)
  }

  const getMessagePreview = (thread: TextThread) => {
    if (!thread.last_message?.body) return "No messages"
    const prefix = thread.last_message.direction === "outbound" ? "You: " : ""
    const body = thread.last_message.body
    return prefix + (body.length > 50 ? body.slice(0, 50) + "..." : body)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <p>{error}</p>
      </div>
    )
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
        <p>No text conversations</p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 h-0">
      <div className="flex flex-col">
        {threads.map((thread) => {
          const hasUnread = thread.unread_count > 0

          return (
            <div
              key={thread.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(thread)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onSelect(thread)
                }
              }}
              className={cn(
                "flex items-start gap-3 border-b p-3 text-sm transition-colors hover:bg-accent cursor-pointer",
                selectedId === thread.id && "bg-accent",
                hasUnread && "bg-muted/50"
              )}
            >
              <div className="p-2 rounded-full bg-muted shrink-0">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium truncate", hasUnread && "font-semibold")}>
                    {getContactName(thread)}
                  </span>
                  {hasUnread && (
                    <Badge variant="default" className="text-xs px-1.5 py-0">
                      {thread.unread_count}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {getMessagePreview(thread)}
                </p>
              </div>

              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(thread.last_message_at)}
              </span>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
