"use client"

import { useState, useEffect } from "react"
import { useMeeting } from "@/providers/meeting-provider"
import { VideoGrid } from "./video-grid"
import { MeetingControls } from "./meeting-controls"
import { ParticipantsPanel } from "./participants-panel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, Clock, LayoutGrid, Presentation } from "lucide-react"
import { cn } from "@/lib/utils"

interface MeetingRoomProps {
  onLeave?: () => void
  className?: string
}

// Format seconds to HH:MM:SS or MM:SS
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`
}

export function MeetingRoom({ onLeave, className }: MeetingRoomProps) {
  const { activeMeeting, meetingState, meetingError, layoutMode, participants } = useMeeting()
  const [showParticipants, setShowParticipants] = useState(false)
  const [duration, setDuration] = useState(0)

  // Meeting duration timer
  useEffect(() => {
    if (meetingState !== "connected") {
      setDuration(0)
      return
    }

    const interval = setInterval(() => {
      setDuration((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [meetingState])

  // Connecting state
  if (meetingState === "joining" || meetingState === "reconnecting") {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full bg-gradient-to-br from-zinc-900 to-black", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-zinc-400">
          {meetingState === "reconnecting" ? "Reconnecting..." : "Joining meeting..."}
        </p>
      </div>
    )
  }

  // Error state
  if (meetingState === "error") {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full bg-gradient-to-br from-zinc-900 to-black", className)}>
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold text-white mb-2">Unable to join meeting</h2>
        <p className="text-zinc-400 text-center max-w-md mb-4">
          {meetingError || "An error occurred while joining the meeting."}
        </p>
        <Button onClick={onLeave}>Go Back</Button>
      </div>
    )
  }

  // Ended state
  if (meetingState === "ended") {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full bg-gradient-to-br from-zinc-900 to-black", className)}>
        <h2 className="text-lg font-semibold text-white mb-2">Meeting Ended</h2>
        <p className="text-zinc-400 mb-4">
          The meeting has ended. Thank you for joining!
        </p>
        <Button onClick={onLeave}>Return to Channel</Button>
      </div>
    )
  }

  // Not in meeting
  if (!activeMeeting || meetingState === "idle") {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full bg-gradient-to-br from-zinc-900 to-black", className)}>
        <p className="text-zinc-400">No active meeting</p>
      </div>
    )
  }

  // Active meeting
  return (
    <div className={cn("flex flex-col h-full bg-gradient-to-br from-zinc-900 via-zinc-900 to-black", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/30 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="font-semibold text-white">{activeMeeting.title || "Video Meeting"}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-zinc-400 text-sm">{participants.length} participant{participants.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Layout indicator */}
          <Badge variant="secondary" className="bg-white/10 text-white border-0 gap-1.5">
            {layoutMode === "gallery" ? (
              <>
                <LayoutGrid className="h-3.5 w-3.5" />
                Gallery
              </>
            ) : (
              <>
                <Presentation className="h-3.5 w-3.5" />
                Speaker
              </>
            )}
          </Badge>

          {/* Duration */}
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-mono tabular-nums">{formatDuration(duration)}</span>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 relative">
          <VideoGrid className="h-full" />
        </div>

        {/* Participants panel (sidebar) */}
        {showParticipants && (
          <ParticipantsPanel
            className="w-72 border-l border-white/10"
            onClose={() => setShowParticipants(false)}
          />
        )}
      </div>

      {/* Controls bar */}
      <MeetingControls
        onLeave={onLeave}
        onShowParticipants={() => setShowParticipants(!showParticipants)}
      />
    </div>
  )
}
