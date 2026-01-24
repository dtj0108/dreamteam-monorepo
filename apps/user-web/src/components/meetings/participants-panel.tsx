"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Mic, MicOff, Video, VideoOff, X, Crown } from "lucide-react"
import { useMeetingRoster } from "@/hooks/use-meeting-roster"
import { cn } from "@/lib/utils"
import type { Participant } from "@/providers/meeting-provider"

interface ParticipantsPanelProps {
  onClose?: () => void
  className?: string
}

export function ParticipantsPanel({ onClose, className }: ParticipantsPanelProps) {
  const { participants, localParticipant, remoteParticipants, participantCount } =
    useMeetingRoster()

  // Get initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return "?"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const ParticipantRow = ({ participant }: { participant: Participant }) => (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg",
        participant.isLocal && "bg-accent/50"
      )}
    >
      <Avatar className="h-9 w-9">
        <AvatarImage src={participant.avatarUrl} />
        <AvatarFallback>{getInitials(participant.name)}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {participant.name || "Unknown"}
          {participant.isLocal && (
            <span className="text-muted-foreground ml-1">(You)</span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        {participant.isMuted ? (
          <MicOff className="h-4 w-4 text-red-500" />
        ) : (
          <Mic className="h-4 w-4 text-muted-foreground" />
        )}

        {participant.isVideoOn ? (
          <Video className="h-4 w-4 text-muted-foreground" />
        ) : (
          <VideoOff className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </div>
  )

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background border-l",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Participants ({participantCount})</h3>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Participant list */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {/* Show local participant first */}
          {localParticipant && (
            <ParticipantRow participant={localParticipant} />
          )}

          {/* Then remote participants */}
          {remoteParticipants.map((participant) => (
            <ParticipantRow
              key={participant.attendeeId}
              participant={participant}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
