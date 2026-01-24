"use client"

import { useRef, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Loader2, Mail, MessageSquare, Phone, Reply, MessageCircle } from "lucide-react"
import { TimelineItem } from "./timeline-item"
import { TimelineItem as TimelineItemType } from "@/app/api/conversations/[contactId]/timeline/route"

interface ConversationTimelineProps {
  contact: {
    id: string
    first_name: string
    last_name: string | null
    email: string | null
    phone: string | null
    lead: { id: string; name: string }
  } | null
  timeline: TimelineItemType[]
  loading: boolean
  grantId: string | null
  onReplyEmail?: () => void
  onSendText?: () => void
  onCall?: () => void
}

export function ConversationTimeline({
  contact,
  timeline,
  loading,
  grantId,
  onReplyEmail,
  onSendText,
  onCall,
}: ConversationTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when timeline updates
  useEffect(() => {
    if (scrollRef.current) {
      // The scrollable viewport is the parent element
      const viewport = scrollRef.current.parentElement
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight
      }
    }
  }, [timeline])

  // Empty state - no contact selected
  if (!contact) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-muted-foreground">
        <MessageCircle className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">Select a contact</p>
        <p className="text-sm text-center mt-1">
          Choose a contact from the list to view your conversation history
        </p>
      </div>
    )
  }

  const getInitials = (firstName: string, lastName: string | null) => {
    return `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ''}`.toUpperCase()
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="border-b p-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {getInitials(contact.first_name, contact.last_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">
                {contact.first_name} {contact.last_name}
              </h2>
              <p className="text-sm text-muted-foreground">{contact.lead.name}</p>
            </div>
          </div>

          {/* Contact info badges */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {contact.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{contact.email}</span>
              </span>
            )}
            {contact.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{contact.phone}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1 h-0">
        <div className="p-4 space-y-4" ref={scrollRef}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : timeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MessageCircle className="h-8 w-8 mb-2" />
              <p>No messages yet</p>
              <p className="text-sm mt-1">
                Start a conversation by sending an email, text, or making a call
              </p>
            </div>
          ) : (
            timeline.map((item) => (
              <TimelineItem
                key={item.id}
                item={item}
                contactName={`${contact.first_name} ${contact.last_name || ''}`.trim()}
                grantId={grantId}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      <div className="border-t p-4 shrink-0">
        <div className="flex items-center gap-2">
          {contact.email && grantId && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReplyEmail}
              className="flex-1"
            >
              <Reply className="h-4 w-4 mr-2" />
              Reply Email
            </Button>
          )}
          {contact.phone && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onSendText}
                className="flex-1"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Text
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onCall}
                className="flex-1"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
            </>
          )}
          {!contact.email && !contact.phone && (
            <p className="text-sm text-muted-foreground">
              No email or phone number on file
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
