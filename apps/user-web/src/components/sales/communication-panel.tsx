"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PhoneIcon,
  SendIcon,
  PhoneIncomingIcon,
  PhoneOutgoingIcon,
  MessageSquareIcon,
  Loader2Icon,
  AlertCircleIcon,
} from "lucide-react"
import { RecordingPlayer } from "./recording-player"

interface Recording {
  id: string
  duration_seconds: number
}

interface Communication {
  id: string
  type: "sms" | "call"
  direction: "inbound" | "outbound"
  body?: string
  duration_seconds?: number
  twilio_status: string
  created_at: string
  recordings?: Recording[]
}

interface OwnedNumber {
  id: string
  phone_number: string
  friendly_name: string | null
  is_primary: boolean
}

interface CommunicationPanelProps {
  leadId: string
  contactId?: string
  phoneNumber: string
  contactName?: string
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return "Today"
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday"
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function groupByDate(communications: Communication[]): Record<string, Communication[]> {
  return communications.reduce((groups, comm) => {
    const date = formatDate(comm.created_at)
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(comm)
    return groups
  }, {} as Record<string, Communication[]>)
}

export function CommunicationPanel({
  leadId,
  contactId,
  phoneNumber,
  contactName,
}: CommunicationPanelProps) {
  const [communications, setCommunications] = React.useState<Communication[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [message, setMessage] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [isCalling, setIsCalling] = React.useState(false)
  const [ownedNumbers, setOwnedNumbers] = React.useState<OwnedNumber[]>([])
  const [selectedNumberId, setSelectedNumberId] = React.useState<string>("")
  const [isLoadingNumbers, setIsLoadingNumbers] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Fetch communications
  const fetchCommunications = React.useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (leadId) params.set("leadId", leadId)
      if (contactId) params.set("contactId", contactId)

      const res = await fetch(`/api/communications?${params}`)
      if (res.ok) {
        const data = await res.json()
        setCommunications(data)
      }
    } catch (error) {
      console.error("Error fetching communications:", error)
    } finally {
      setIsLoading(false)
    }
  }, [leadId, contactId])

  // Fetch owned phone numbers
  const fetchOwnedNumbers = React.useCallback(async () => {
    setIsLoadingNumbers(true)
    try {
      const res = await fetch("/api/twilio/numbers/owned")
      if (res.ok) {
        const data = await res.json()
        const numbers = data.numbers || []
        setOwnedNumbers(numbers)
        // Default to primary number, or first available
        const primary = numbers.find((n: OwnedNumber) => n.is_primary)
        if (primary) {
          setSelectedNumberId(primary.id)
        } else if (numbers.length > 0) {
          setSelectedNumberId(numbers[0].id)
        }
      }
    } catch (error) {
      console.error("Error fetching owned numbers:", error)
    } finally {
      setIsLoadingNumbers(false)
    }
  }, [])

  React.useEffect(() => {
    fetchOwnedNumbers()
  }, [fetchOwnedNumbers])

  React.useEffect(() => {
    fetchCommunications()
  }, [fetchCommunications])

  // Poll for new messages every 5 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchCommunications()
    }, 5000)

    return () => clearInterval(interval)
  }, [fetchCommunications])

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [communications])

  const handleSendSMS = async () => {
    if (!message.trim() || !selectedNumberId) return

    // Optimistic update - add message to UI immediately
    const optimisticId = `temp-${Date.now()}`
    const optimisticMessage: Communication = {
      id: optimisticId,
      type: "sms",
      direction: "outbound",
      body: message,
      twilio_status: "sending",
      created_at: new Date().toISOString(),
    }

    setCommunications(prev => [...prev, optimisticMessage])
    const sentMessage = message
    setMessage("")
    setIsSending(true)
    setError(null)

    try {
      const res = await fetch("/api/communications/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phoneNumber,
          message: sentMessage,
          leadId,
          contactId,
          fromNumberId: selectedNumberId,
        }),
      })

      if (res.ok) {
        // Refresh to get the real message with actual ID
        await fetchCommunications()
      } else {
        const data = await res.json()
        console.error("Failed to send SMS:", data.error)
        setError(data.error || "Failed to send SMS")
        // Mark optimistic message as failed
        setCommunications(prev =>
          prev.map(c => c.id === optimisticId
            ? { ...c, twilio_status: "failed" }
            : c
          )
        )
      }
    } catch (err) {
      console.error("Error sending SMS:", err)
      setError("Network error. Please try again.")
      // Mark optimistic message as failed
      setCommunications(prev =>
        prev.map(c => c.id === optimisticId
          ? { ...c, twilio_status: "failed" }
          : c
        )
      )
    } finally {
      setIsSending(false)
    }
  }

  const handleMakeCall = async () => {
    if (!selectedNumberId) return

    setIsCalling(true)
    try {
      const res = await fetch("/api/communications/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phoneNumber,
          leadId,
          contactId,
          record: true,
          fromNumberId: selectedNumberId,
        }),
      })

      if (res.ok) {
        // Refresh to show the call
        await fetchCommunications()
      } else {
        const data = await res.json()
        console.error("Failed to make call:", data.error)
      }
    } catch (error) {
      console.error("Error making call:", error)
    } finally {
      setIsCalling(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendSMS()
    }
  }

  const groupedCommunications = groupByDate(communications)

  return (
    <div className="flex flex-col h-full border rounded-lg bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquareIcon className="size-5 text-muted-foreground" />
          <div>
            <h3 className="font-medium">{contactName || phoneNumber}</h3>
            {contactName && (
              <p className="text-xs text-muted-foreground">{phoneNumber}</p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleMakeCall}
          disabled={isCalling || !selectedNumberId}
          title={!selectedNumberId ? "Purchase a phone number to make calls" : undefined}
        >
          {isCalling ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <PhoneIcon className="size-4" />
          )}
          {isCalling ? "Calling..." : "Call"}
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : communications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquareIcon className="size-12 text-muted-foreground mb-4" />
            <h4 className="font-medium mb-2">No messages yet</h4>
            <p className="text-sm text-muted-foreground">
              Send a message or make a call to start the conversation.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedCommunications).map(([date, comms]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">{date}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-3">
                  {comms.map((comm) => (
                    <div
                      key={comm.id}
                      className={`flex ${
                        comm.direction === "outbound" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          comm.direction === "outbound"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {comm.type === "sms" ? (
                          <p className="text-sm whitespace-pre-wrap">{comm.body}</p>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {comm.direction === "inbound" ? (
                                <PhoneIncomingIcon className="size-4" />
                              ) : (
                                <PhoneOutgoingIcon className="size-4" />
                              )}
                              <span className="text-sm font-medium">
                                {comm.direction === "inbound" ? "Incoming" : "Outgoing"} Call
                              </span>
                              {comm.duration_seconds !== undefined && comm.duration_seconds > 0 && (
                                <span className="text-sm opacity-80">
                                  ({formatDuration(comm.duration_seconds)})
                                </span>
                              )}
                            </div>
                            {comm.recordings && comm.recordings.length > 0 && (
                              <RecordingPlayer
                                recordingId={comm.recordings[0].id}
                                duration={comm.recordings[0].duration_seconds}
                              />
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span
                            className={`text-xs ${
                              comm.direction === "outbound"
                                ? "opacity-70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatTime(comm.created_at)}
                          </span>
                          {/* Only show status for sending/failed - hide for normal sent messages */}
                          {(comm.twilio_status === "sending" || comm.twilio_status === "failed") && (
                            <Badge
                              variant={comm.twilio_status === "failed" ? "destructive" : "secondary"}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {comm.twilio_status === "sending" ? "Sending..." : "Failed"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t space-y-3">
        {/* Phone Number Selector or Purchase Prompt */}
        {isLoadingNumbers ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Loading phone numbers...
          </div>
        ) : ownedNumbers.length === 0 ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <AlertCircleIcon className="size-4 shrink-0" />
            <span className="text-sm">
              You need a phone number to send messages.{" "}
              <Link
                href="/sales/settings/phone-numbers"
                className="font-medium underline underline-offset-2 hover:text-amber-900"
              >
                Purchase a number
              </Link>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Send from:</span>
            <Select value={selectedNumberId} onValueChange={setSelectedNumberId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select a number" />
              </SelectTrigger>
              <SelectContent>
                {ownedNumbers.map((num) => (
                  <SelectItem key={num.id} value={num.id}>
                    {formatPhoneDisplay(num.phone_number)}
                    {num.is_primary && " (Primary)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800">
            <AlertCircleIcon className="size-4 shrink-0" />
            <span className="text-sm flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 font-medium"
            >
              &times;
            </button>
          </div>
        )}

        {/* Message Input */}
        <div className="flex gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={ownedNumbers.length === 0 ? "Purchase a phone number to send messages" : "Type a message... (Enter to send)"}
            rows={2}
            className="resize-none"
            disabled={ownedNumbers.length === 0}
          />
          <Button
            onClick={handleSendSMS}
            disabled={isSending || !message.trim() || !selectedNumberId}
            className="self-end"
          >
            {isSending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SendIcon className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function formatPhoneDisplay(phone: string): string {
  const match = phone.match(/^\+1(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  return phone
}
