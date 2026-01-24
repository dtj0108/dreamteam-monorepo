"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { MessageSquare, Send, Loader2, User } from "lucide-react"
import { TextThread } from "./texts-list"

interface Message {
  id: string
  type: string
  direction: "inbound" | "outbound"
  body: string | null
  twilio_status: string
  created_at: string
}

interface TextsDisplayProps {
  thread: TextThread | null
}

export function TextsDisplay({ thread }: TextsDisplayProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!thread) {
      setMessages([])
      return
    }

    const currentThread = thread

    async function fetchMessages() {
      setLoading(true)
      try {
        // Fetch messages for this phone number
        const res = await fetch(`/api/communications?type=sms&limit=100`)
        if (!res.ok) throw new Error("Failed to fetch messages")
        const data = await res.json()

        // Filter to messages matching this thread's phone number
        const threadMessages = data.filter(
          (msg: Message & { from_number: string; to_number: string }) =>
            msg.from_number === currentThread.phone_number || msg.to_number === currentThread.phone_number
        )

        // Sort by date ascending (oldest first)
        threadMessages.sort(
          (a: Message, b: Message) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )

        setMessages(threadMessages)

        // Mark as read
        if (currentThread.unread_count > 0) {
          fetch("/api/communications/threads", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ threadId: currentThread.id, markAsRead: true }),
          })
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [thread])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })
  }

  const formatPhoneNumber = (number: string) => {
    if (number.startsWith("+1") && number.length === 12) {
      return `(${number.slice(2, 5)}) ${number.slice(5, 8)}-${number.slice(8)}`
    }
    return number
  }

  const getContactName = () => {
    if (!thread) return ""
    if (thread.lead?.name) return thread.lead.name
    if (thread.contact) {
      return `${thread.contact.first_name} ${thread.contact.last_name}`.trim()
    }
    return formatPhoneNumber(thread.phone_number)
  }

  const handleSend = async () => {
    if (!thread || !newMessage.trim()) return

    setSending(true)
    try {
      const res = await fetch("/api/communications/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: thread.phone_number,
          body: newMessage.trim(),
          leadId: thread.lead?.id,
          contactId: thread.contact?.id,
        }),
      })

      if (!res.ok) throw new Error("Failed to send message")

      // Add optimistic message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        type: "sms",
        direction: "outbound",
        body: newMessage.trim(),
        twilio_status: "sent",
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, optimisticMessage])
      setNewMessage("")
    } catch (err) {
      console.error("Failed to send:", err)
    } finally {
      setSending(false)
    }
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.created_at)
    if (!groups[date]) groups[date] = []
    groups[date].push(msg)
    return groups
  }, {} as Record<string, Message[]>)

  if (!thread) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Select a conversation to view messages</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-3">
        <div className="p-2 rounded-full bg-muted">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <h2 className="font-semibold">{getContactName()}</h2>
          <p className="text-xs text-muted-foreground">
            {formatPhoneNumber(thread.phone_number)}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No messages yet</p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                <div className="flex justify-center mb-4">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {date}
                  </span>
                </div>
                <div className="space-y-2">
                  {msgs.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.direction === "outbound" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] px-3 py-2 rounded-lg",
                          msg.direction === "outbound"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                        <p
                          className={cn(
                            "text-xs mt-1",
                            msg.direction === "outbound"
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          )}
                        >
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-[120px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <Button onClick={handleSend} disabled={sending || !newMessage.trim()}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
