"use client"

import { Video } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@dreamteam/ui/avatar"
import { differenceInMinutes, differenceInHours } from "date-fns"

interface MeetingParticipant {
  profile: {
    id: string
    name: string
    avatar_url: string | null
  }
}

interface MeetingEventItemProps {
  meeting: {
    id: string
    startedAt: string
    endedAt: string
    participants: MeetingParticipant[]
  }
}

function formatDuration(startedAt: string, endedAt: string): string {
  const start = new Date(startedAt)
  const end = new Date(endedAt)

  const totalMinutes = differenceInMinutes(end, start)

  if (totalMinutes < 1) {
    return "< 1 min"
  }

  if (totalMinutes < 60) {
    return `${totalMinutes} min`
  }

  const hours = differenceInHours(end, start)
  const remainingMinutes = totalMinutes % 60

  if (remainingMinutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${remainingMinutes}m`
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const MAX_VISIBLE_AVATARS = 3

export function MeetingEventItem({ meeting }: MeetingEventItemProps) {
  const duration = formatDuration(meeting.startedAt, meeting.endedAt)
  const participants = meeting.participants
  const visibleParticipants = participants.slice(0, MAX_VISIBLE_AVATARS)
  const overflowCount = Math.max(0, participants.length - MAX_VISIBLE_AVATARS)

  return (
    <div className="relative flex items-center justify-center my-4 px-4">
      <div className="flex items-center gap-3 px-4 py-2 rounded-lg border border-border/50 bg-muted/30">
        <Video className="size-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Call ended</span>
        <span className="text-muted-foreground">•</span>
        <span className="text-sm text-muted-foreground">{duration}</span>

        {participants.length > 0 && (
          <>
            <span className="text-muted-foreground">•</span>
            <AvatarGroup>
              {visibleParticipants.map((participant) => (
                <Avatar key={participant.profile.id} size="sm">
                  {participant.profile.avatar_url ? (
                    <AvatarImage src={participant.profile.avatar_url} alt={participant.profile.name} />
                  ) : null}
                  <AvatarFallback>{getInitials(participant.profile.name)}</AvatarFallback>
                </Avatar>
              ))}
              {overflowCount > 0 && (
                <AvatarGroupCount>+{overflowCount}</AvatarGroupCount>
              )}
            </AvatarGroup>
          </>
        )}
      </div>
    </div>
  )
}
