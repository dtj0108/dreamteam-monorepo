"use client"

import { useMemo } from "react"
import { useMeeting } from "@/providers/meeting-provider"
import { useMeetingRoster } from "@/hooks/use-meeting-roster"
import { useAllVideoTiles } from "@/hooks/use-video-tile"
import { VideoTile } from "./video-tile"
import { cn } from "@/lib/utils"

interface VideoGridProps {
  className?: string
}

export function VideoGrid({ className }: VideoGridProps) {
  const { participants, localParticipant, remoteParticipants } = useMeetingRoster()
  const { hasContentShare, contentTile } = useAllVideoTiles()
  const { layoutMode, pinnedParticipantId, activeSpeakerId } = useMeeting()

  // Calculate grid layout based on participant count
  const gridClass = useMemo(() => {
    const count = participants.length

    if (hasContentShare) {
      // When screen sharing, show content as main and participants as sidebar
      return "grid-cols-1"
    }

    if (count === 1) return "grid-cols-1"
    if (count === 2) return "grid-cols-2"
    if (count <= 4) return "grid-cols-2 grid-rows-2"
    if (count <= 6) return "grid-cols-3 grid-rows-2"
    if (count <= 9) return "grid-cols-3 grid-rows-3"
    if (count <= 12) return "grid-cols-4 grid-rows-3"
    if (count <= 16) return "grid-cols-4 grid-rows-4"
    return "grid-cols-5" // For 17+ participants
  }, [participants.length, hasContentShare])

  // Order participants: local first, then remote
  const orderedParticipants = useMemo(() => {
    if (!localParticipant) return remoteParticipants
    return [localParticipant, ...remoteParticipants]
  }, [localParticipant, remoteParticipants])

  // Determine featured participant for speaker view
  const featuredParticipant = useMemo(() => {
    // Priority: pinned > active speaker > first remote > local
    if (pinnedParticipantId) {
      return participants.find((p) => p.attendeeId === pinnedParticipantId) || null
    }
    if (activeSpeakerId) {
      return participants.find((p) => p.attendeeId === activeSpeakerId) || null
    }
    // Default to first remote participant, or local if alone
    return remoteParticipants[0] || localParticipant
  }, [pinnedParticipantId, activeSpeakerId, participants, remoteParticipants, localParticipant])

  // Get filmstrip participants (everyone except featured)
  const filmstripParticipants = useMemo(() => {
    if (!featuredParticipant) return orderedParticipants
    return orderedParticipants.filter(
      (p) => p.attendeeId !== featuredParticipant.attendeeId
    )
  }, [orderedParticipants, featuredParticipant])

  if (participants.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <p className="text-muted-foreground">Waiting for participants...</p>
      </div>
    )
  }

  // Content share mode: show screen share as main content
  if (hasContentShare && contentTile) {
    return (
      <div className={cn("flex h-full gap-4", className)}>
        {/* Main content (screen share) */}
        <div className="flex-1 bg-black rounded-xl overflow-hidden">
          <video
            id={`content-tile-${contentTile.tileId}`}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
        </div>

        {/* Participant strip on the right */}
        <div className="w-48 flex flex-col gap-2 overflow-y-auto">
          {orderedParticipants.map((participant) => (
            <VideoTile
              key={participant.attendeeId}
              participant={participant}
              className="shrink-0"
              isLarge={false}
              isPinned={pinnedParticipantId === participant.attendeeId}
              isSpeaking={activeSpeakerId === participant.attendeeId}
            />
          ))}
        </div>
      </div>
    )
  }

  // Speaker view mode: large featured tile + filmstrip
  if (layoutMode === "speaker" && participants.length > 1 && featuredParticipant) {
    return (
      <div className={cn("flex flex-col h-full p-3 gap-3", className)}>
        {/* Featured speaker (large tile) */}
        <div className="flex-1 min-h-0">
          <VideoTile
            participant={featuredParticipant}
            isLarge={true}
            isPinned={pinnedParticipantId === featuredParticipant.attendeeId}
            isSpeaking={activeSpeakerId === featuredParticipant.attendeeId}
            className="h-full w-full"
          />
        </div>

        {/* Filmstrip (horizontal thumbnails) */}
        {filmstripParticipants.length > 0 && (
          <div className="h-28 flex gap-2 overflow-x-auto pb-1">
            {filmstripParticipants.map((participant) => (
              <VideoTile
                key={participant.attendeeId}
                participant={participant}
                isLarge={false}
                isPinned={pinnedParticipantId === participant.attendeeId}
                isSpeaking={activeSpeakerId === participant.attendeeId}
                className="h-full aspect-video shrink-0"
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Gallery mode (default): Grid layout
  return (
    <div
      className={cn(
        "grid gap-3 h-full p-3",
        gridClass,
        className
      )}
    >
      {orderedParticipants.map((participant) => (
        <VideoTile
          key={participant.attendeeId}
          participant={participant}
          isLarge={participants.length <= 2}
          isPinned={pinnedParticipantId === participant.attendeeId}
          isSpeaking={activeSpeakerId === participant.attendeeId}
        />
      ))}
    </div>
  )
}
