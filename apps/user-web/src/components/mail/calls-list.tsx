"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Loader2 } from "lucide-react"

export interface CallItem {
  id: string
  type: "call"
  direction: "inbound" | "outbound"
  from_number: string
  to_number: string
  duration_seconds: number | null
  twilio_status: string
  created_at: string
  lead_id?: string
  contact_id?: string
  notes?: string
  disposition?: string
  recordings?: Array<{
    id: string
    duration_seconds: number
    transcription?: string
    transcription_status?: string
  }>
}

interface CallsListProps {
  selectedId: string | null
  onSelect: (call: CallItem) => void
}

export function CallsList({ selectedId, onSelect }: CallsListProps) {
  const [calls, setCalls] = useState<CallItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCalls() {
      try {
        const res = await fetch("/api/communications?type=call&limit=100")
        if (!res.ok) throw new Error("Failed to fetch calls")
        const data = await res.json()
        setCalls(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load calls")
      } finally {
        setLoading(false)
      }
    }
    fetchCalls()
  }, [])

  const formatDate = (dateStr: string) => {
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

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatPhoneNumber = (number: string) => {
    // Format E.164 to readable
    if (number.startsWith("+1") && number.length === 12) {
      return `(${number.slice(2, 5)}) ${number.slice(5, 8)}-${number.slice(8)}`
    }
    return number
  }

  const getCallIcon = (call: CallItem) => {
    const isMissed = call.twilio_status === "no-answer" || call.twilio_status === "busy" || call.twilio_status === "failed"

    if (isMissed) {
      return <PhoneMissed className="h-4 w-4 text-destructive" />
    }
    if (call.direction === "inbound") {
      return <PhoneIncoming className="h-4 w-4 text-green-600" />
    }
    return <PhoneOutgoing className="h-4 w-4 text-blue-600" />
  }

  const getCallLabel = (call: CallItem) => {
    const isMissed = call.twilio_status === "no-answer" || call.twilio_status === "busy" || call.twilio_status === "failed"

    if (isMissed) return "Missed"
    if (call.direction === "inbound") return "Incoming"
    return "Outgoing"
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

  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <p>No calls to display</p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 h-0">
      <div className="flex flex-col">
        {calls.map((call) => {
          const isMissed = call.twilio_status === "no-answer" || call.twilio_status === "busy" || call.twilio_status === "failed"
          const phoneNumber = call.direction === "inbound" ? call.from_number : call.to_number

          return (
            <div
              key={call.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(call)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onSelect(call)
                }
              }}
              className={cn(
                "flex items-center gap-3 border-b p-3 text-sm transition-colors hover:bg-accent cursor-pointer",
                selectedId === call.id && "bg-accent",
                isMissed && "bg-destructive/5"
              )}
            >
              {getCallIcon(call)}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium truncate", isMissed && "text-destructive")}>
                    {formatPhoneNumber(phoneNumber)}
                  </span>
                  <Badge variant={isMissed ? "destructive" : "secondary"} className="text-xs">
                    {getCallLabel(call)}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDuration(call.duration_seconds)}
                  {call.recordings && call.recordings.length > 0 && (
                    <span className="ml-2">• Recording available</span>
                  )}
                </div>
              </div>

              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(call.created_at)}
              </span>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
