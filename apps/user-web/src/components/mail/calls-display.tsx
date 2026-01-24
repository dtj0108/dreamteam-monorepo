"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  Calendar,
  Phone,
  User,
} from "lucide-react"
import { CallItem } from "./calls-list"
import { RecordingPlayer } from "@/components/sales/recording-player"

interface CallsDisplayProps {
  call: CallItem | null
}

export function CallsDisplay({ call }: CallsDisplayProps) {
  if (!call) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Phone className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Select a call to view details</p>
        </div>
      </div>
    )
  }

  const isMissed =
    call.twilio_status === "no-answer" ||
    call.twilio_status === "busy" ||
    call.twilio_status === "failed"

  const formatPhoneNumber = (number: string) => {
    if (number.startsWith("+1") && number.length === 12) {
      return `(${number.slice(2, 5)}) ${number.slice(5, 8)}-${number.slice(8)}`
    }
    return number
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getCallIcon = () => {
    if (isMissed) {
      return <PhoneMissed className="h-6 w-6 text-destructive" />
    }
    if (call.direction === "inbound") {
      return <PhoneIncoming className="h-6 w-6 text-green-600" />
    }
    return <PhoneOutgoing className="h-6 w-6 text-blue-600" />
  }

  const getCallTypeLabel = () => {
    if (isMissed) return "Missed Call"
    if (call.direction === "inbound") return "Incoming Call"
    return "Outgoing Call"
  }

  const phoneNumber = call.direction === "inbound" ? call.from_number : call.to_number

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-muted">{getCallIcon()}</div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold">{formatPhoneNumber(phoneNumber)}</h2>
              <Badge variant={isMissed ? "destructive" : "secondary"}>
                {getCallTypeLabel()}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {call.direction === "inbound" ? "From" : "To"}: {formatPhoneNumber(phoneNumber)}
            </p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6 max-w-2xl">
          {/* Call Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Date & Time</p>
                <p className="text-sm">{formatDateTime(call.created_at)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm">
                  {call.duration_seconds
                    ? formatDuration(call.duration_seconds)
                    : isMissed
                    ? "Not answered"
                    : "0:00"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm capitalize">{call.twilio_status.replace("-", " ")}</p>
              </div>
            </div>

            {(call.lead_id || call.contact_id) && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Associated With</p>
                  <p className="text-sm">
                    {call.lead_id ? "Lead" : "Contact"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Recording */}
          {call.recordings && call.recordings.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-3">Call Recording</h3>
                {call.recordings.map((recording) => (
                  <RecordingPlayer
                    key={recording.id}
                    recordingId={recording.id}
                    duration={recording.duration_seconds}
                  />
                ))}
              </div>
            </>
          )}

          {/* Actions */}
          <Separator />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = `tel:${phoneNumber}`
              }}
            >
              <Phone className="h-4 w-4 mr-2" />
              Call Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
