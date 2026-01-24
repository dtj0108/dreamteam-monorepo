"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Star } from "lucide-react"

export interface MailItem {
  id: string
  from: Array<{ email: string; name?: string }>
  subject: string | null
  snippet: string | null
  date: number
  unread: boolean
  starred: boolean
}

interface MailListProps {
  emails: MailItem[]
  selectedId: string | null
  onSelect: (email: MailItem) => void
  onToggleStar?: (emailId: string, starred: boolean) => void
}

export function MailList({ emails, selectedId, onSelect, onToggleStar }: MailListProps) {
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

  const getSenderName = (from: Array<{ email: string; name?: string }>) => {
    if (from.length === 0) return 'Unknown'
    return from[0].name || from[0].email
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <p>No emails to display</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {emails.map((email) => (
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
            "flex flex-col items-start gap-1 border-b p-3 text-left text-sm transition-colors hover:bg-accent cursor-pointer",
            selectedId === email.id && "bg-accent",
            email.unread && "bg-muted/50"
          )}
        >
          <div className="flex w-full items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn("font-medium truncate", email.unread && "font-semibold")}>
                  {getSenderName(email.from)}
                </span>
                {email.unread && (
                  <Badge variant="default" className="h-1.5 w-1.5 rounded-full p-0 bg-blue-500" />
                )}
              </div>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDate(email.date)}
            </span>
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
            {onToggleStar && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleStar(email.id, !email.starred)
                }}
                className={cn(
                  "flex-shrink-0 p-1 -m-1 rounded hover:bg-background transition-colors",
                  email.starred ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"
                )}
              >
                <Star className={cn("h-4 w-4", email.starred && "fill-current")} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
