"use client"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, MessageSquare } from "lucide-react"

export interface ConversationContactItem {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  lead: { id: string; name: string }
  last_communication: {
    type: 'sms' | 'call' | 'email'
    preview: string
    timestamp: string
    direction: 'inbound' | 'outbound'
  } | null
  unread_count: number
}

interface ConversationsListProps {
  contacts: ConversationContactItem[]
  selectedId: string | null
  onSelect: (contact: ConversationContactItem) => void
}

export function ConversationsList({ contacts, selectedId, onSelect }: ConversationsListProps) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const getInitials = (firstName: string, lastName: string | null) => {
    return `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ''}`.toUpperCase()
  }

  const getChannelIcon = (type: 'sms' | 'call' | 'email' | null) => {
    switch (type) {
      case 'email':
        return <Mail className="h-3.5 w-3.5" />
      case 'sms':
        return <MessageSquare className="h-3.5 w-3.5" />
      case 'call':
        return <Phone className="h-3.5 w-3.5" />
      default:
        return null
    }
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <MessageSquare className="h-8 w-8 mb-2" />
        <p>No contacts found</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {contacts.map((contact) => (
        <div
          key={contact.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(contact)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelect(contact)
            }
          }}
          className={cn(
            "group flex items-start gap-3 border-b p-3 text-left text-sm transition-colors hover:bg-accent cursor-pointer",
            selectedId === contact.id && "bg-accent",
            contact.unread_count > 0 && "bg-muted/50"
          )}
        >
          {/* Avatar */}
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="text-xs">
              {getInitials(contact.first_name, contact.last_name)}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Name and company */}
            <div className="flex items-center gap-2">
              <span className={cn(
                "font-medium truncate",
                contact.unread_count > 0 && "font-semibold"
              )}>
                {contact.first_name} {contact.last_name}
              </span>
              {contact.unread_count > 0 && (
                <Badge variant="default" className="h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center bg-blue-500">
                  {contact.unread_count > 9 ? '9+' : contact.unread_count}
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground truncate block">
              {contact.lead.name}
            </span>

            {/* Last message preview */}
            {contact.last_communication ? (
              <p className={cn(
                "text-xs mt-1 line-clamp-1",
                contact.unread_count > 0 ? "text-foreground" : "text-muted-foreground"
              )}>
                {contact.last_communication.preview}
              </p>
            ) : (
              <p className="text-xs mt-1 text-muted-foreground italic">
                No messages yet
              </p>
            )}
          </div>

          {/* Timestamp and channel icon */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            {contact.last_communication && (
              <>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(contact.last_communication.timestamp)}
                </span>
                <span className="text-muted-foreground">
                  {getChannelIcon(contact.last_communication.type)}
                </span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
