"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AudioPlayer } from "@/components/ui/audio-player"
import {
  PhoneIncomingIcon,
  PhoneOutgoingIcon,
  PhoneMissedIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CallRecording {
  id: string
  twilio_recording_url?: string
  storage_path?: string
  duration_seconds?: number
}

export interface CallCommunication {
  id: string
  type: "call"
  direction: "inbound" | "outbound"
  from_number: string
  to_number: string
  duration_seconds?: number
  twilio_status: string
  twilio_sid?: string
  recording_url?: string
  recordings?: CallRecording[]
  answered_at?: string
  created_at: string
  error_message?: string
  contact?: {
    id: string
    first_name: string
    last_name?: string
  }
}

interface CallActivityCardProps {
  call: CallCommunication
  className?: string
}

function formatPhone(phone: string): string {
  const match = phone.match(/^\+1(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  return phone
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

type CallStatusType = "completed" | "no-answer" | "busy" | "failed" | "canceled" | "in-progress" | "ringing" | "queued"

function getStatusConfig(status: string): {
  label: string
  color: string
  bgColor: string
  icon: React.ComponentType<{ className?: string }>
} {
  const normalizedStatus = status.toLowerCase().replace(/_/g, "-") as CallStatusType

  switch (normalizedStatus) {
    case "completed":
      return {
        label: "Completed",
        color: "text-green-700",
        bgColor: "bg-green-100",
        icon: CheckCircleIcon,
      }
    case "no-answer":
      return {
        label: "No Answer",
        color: "text-amber-700",
        bgColor: "bg-amber-100",
        icon: PhoneMissedIcon,
      }
    case "busy":
      return {
        label: "Busy",
        color: "text-amber-700",
        bgColor: "bg-amber-100",
        icon: AlertCircleIcon,
      }
    case "failed":
    case "canceled":
      return {
        label: normalizedStatus === "failed" ? "Failed" : "Canceled",
        color: "text-red-700",
        bgColor: "bg-red-100",
        icon: XCircleIcon,
      }
    case "in-progress":
      return {
        label: "In Progress",
        color: "text-blue-700",
        bgColor: "bg-blue-100",
        icon: ClockIcon,
      }
    case "ringing":
    case "queued":
      return {
        label: normalizedStatus === "ringing" ? "Ringing" : "Queued",
        color: "text-blue-700",
        bgColor: "bg-blue-100",
        icon: ClockIcon,
      }
    default:
      return {
        label: status,
        color: "text-gray-700",
        bgColor: "bg-gray-100",
        icon: AlertCircleIcon,
      }
  }
}

export function CallActivityCard({ call, className }: CallActivityCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  const statusConfig = getStatusConfig(call.twilio_status)
  const StatusIcon = statusConfig.icon
  const DirectionIcon = call.direction === "inbound" ? PhoneIncomingIcon : PhoneOutgoingIcon

  // Get recording URL from either the direct field or the recordings array
  const recordingUrl = call.recording_url || call.recordings?.[0]?.twilio_recording_url

  const contactName = call.contact
    ? `${call.contact.first_name}${call.contact.last_name ? ` ${call.contact.last_name}` : ""}`
    : null

  return (
    <div className={cn("border-b", className)}>
      <div className="p-4 space-y-3">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              call.direction === "inbound" ? "bg-blue-100" : "bg-emerald-100"
            )}>
              <DirectionIcon className={cn(
                "size-5",
                call.direction === "inbound" ? "text-blue-600" : "text-emerald-600"
              )} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {call.direction === "inbound" ? "Incoming" : "Outgoing"} Call
                  {contactName && ` with ${contactName}`}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(call.created_at)}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <Badge
            variant="secondary"
            className={cn("gap-1", statusConfig.bgColor, statusConfig.color)}
          >
            <StatusIcon className="size-3" />
            {statusConfig.label}
          </Badge>
        </div>

        {/* Details Row */}
        <div className="flex items-center gap-4 text-sm pl-[52px]">
          {/* Duration */}
          {call.duration_seconds !== undefined && call.duration_seconds > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ClockIcon className="size-4" />
              <span className="font-medium">{formatDuration(call.duration_seconds)}</span>
            </div>
          )}

          {/* Phone Numbers */}
          <div className="text-muted-foreground">
            {formatPhone(call.from_number)} → {formatPhone(call.to_number)}
          </div>
        </div>

        {/* Recording Player */}
        {recordingUrl && (
          <div className="pl-[52px]">
            <AudioPlayer src={recordingUrl} />
          </div>
        )}

        {/* Expandable Details */}
        <div className="pl-[52px]">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUpIcon className="size-3 mr-1" />
                Hide details
              </>
            ) : (
              <>
                <ChevronDownIcon className="size-3 mr-1" />
                Show details
              </>
            )}
          </Button>

          {isExpanded && (
            <div className="mt-2 p-3 rounded-lg bg-muted/50 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Started</span>
                <span>{formatDateTime(call.created_at)}</span>
              </div>
              {call.answered_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Answered</span>
                  <span>{formatDateTime(call.answered_at)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">From</span>
                <span className="font-mono">{call.from_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">To</span>
                <span className="font-mono">{call.to_number}</span>
              </div>
              {call.twilio_sid && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Call SID</span>
                  <span className="font-mono text-[10px]">{call.twilio_sid}</span>
                </div>
              )}
              {call.error_message && (
                <div className="flex justify-between text-red-600">
                  <span>Error</span>
                  <span>{call.error_message}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
