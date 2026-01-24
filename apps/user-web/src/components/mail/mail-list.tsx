"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Star, MessageSquare, Flag, Trash2 } from "lucide-react"

export interface MailItem {
  id: string
  threadId: string | null
  from: Array<{ email: string; name?: string }>
  to: Array<{ email: string; name?: string }>
  subject: string | null
  snippet: string | null
  date: number
  unread: boolean
  starred: boolean
}

interface MailListProps {
  emails: MailItem[]
  selectedId: string | null
  folder?: string
  onSelect: (email: MailItem) => void
  onToggleStar?: (emailId: string, starred: boolean) => void
  onToggleRead?: (emailId: string, unread: boolean) => void
  onDelete?: (emailId: string) => void
  groupByThread?: boolean
}

export function MailList({ emails, selectedId, folder, onSelect, onToggleStar, onToggleRead, onDelete, groupByThread = true }: MailListProps) {
  // Group emails by threadId and count messages per thread
  const threadCounts = useMemo(() => {
    const counts = new Map<string, number>()
    emails.forEach(email => {
      if (email.threadId) {
        counts.set(email.threadId, (counts.get(email.threadId) || 0) + 1)
      }
    })
    return counts
  }, [emails])

  // Get thread-grouped emails (show only the most recent email per thread)
  const displayEmails = useMemo(() => {
    if (!groupByThread) return emails

    const seenThreads = new Set<string>()
    return emails.filter(email => {
      // If no threadId, always show
      if (!email.threadId) return true

      // If we've already seen this thread, skip (emails are already sorted by date desc)
      if (seenThreads.has(email.threadId)) return false

      seenThreads.add(email.threadId)
      return true
    })
  }, [emails, groupByThread])
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
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

  const getDisplayName = (people: Array<{ email: string; name?: string }>) => {
    if (people.length === 0) return 'Unknown'
    return people[0].name || people[0].email
  }

  // In sent/drafts folder, show "To" recipients; otherwise show "From" sender
  const showRecipients = folder === 'sent' || folder === 'drafts'

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <p>No emails to display</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {displayEmails.map((email) => {
        const threadCount = email.threadId ? threadCounts.get(email.threadId) || 1 : 1
        const hasThread = threadCount > 1

        return (
        <div
          key={email.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(email)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelect(email)
            }
          }}
          className={cn(
            "group flex flex-col items-start gap-1 border-b p-3 text-left text-sm transition-colors hover:bg-accent cursor-pointer",
            selectedId === email.id && "bg-accent",
            email.unread && "bg-muted/50"
          )}
        >
          <div className="grid w-full items-center gap-2" style={{ gridTemplateColumns: '1fr auto auto' }}>
            <div className="min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 min-w-0">
                {showRecipients && (
                  <span className="text-xs text-muted-foreground">To:</span>
                )}
                <span className={cn("font-medium truncate", email.unread && "font-semibold")}>
                  {showRecipients ? getDisplayName(email.to) : getDisplayName(email.from)}
                </span>
                {email.unread && (
                  <Badge variant="default" className="h-1.5 w-1.5 rounded-full p-0 bg-blue-500" />
                )}
                {hasThread && (
                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <MessageSquare className="h-3 w-3" />
                    {threadCount}
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDate(email.date)}
            </span>
            {/* Quick Actions - always visible, grid auto column ensures space */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleRead?.(email.id, !email.unread)
                }}
                className={cn(
                  "p-1 rounded hover:bg-muted/80",
                  email.unread ? "text-blue-500" : "text-muted-foreground hover:text-blue-500"
                )}
                title={email.unread ? "Mark as read" : "Mark as unread"}
              >
                <Flag className={cn("h-4 w-4", email.unread && "fill-current")} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleStar?.(email.id, !email.starred)
                }}
                className={cn(
                  "p-1 rounded hover:bg-muted/80",
                  email.starred ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"
                )}
                title={email.starred ? "Unstar" : "Star"}
              >
                <Star className={cn("h-4 w-4", email.starred && "fill-current")} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete?.(email.id)
                }}
                className="p-1 rounded hover:bg-muted/80 text-muted-foreground hover:text-red-500"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex w-full items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className={cn("truncate", email.unread ? "font-medium" : "text-muted-foreground")}>
                {email.subject || "(No subject)"}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {email.snippet || "No preview available"}
              </p>
            </div>
          </div>
        </div>
        )
      })}
    </div>
  )
}
