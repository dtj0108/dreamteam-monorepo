"use client"

import { useMemo } from "react"
import { useMeeting, type Participant } from "@/providers/meeting-provider"

/**
 * Hook for accessing meeting roster (participants).
 * Provides derived state like active speakers and participant counts.
 */
export function useMeetingRoster() {
  const { participants, localParticipant } = useMeeting()

  // Remote participants (everyone except local user)
  const remoteParticipants = useMemo(
    () => participants.filter((p) => !p.isLocal),
    [participants]
  )

  // Participants with video enabled
  const participantsWithVideo = useMemo(
    () => participants.filter((p) => p.isVideoOn),
    [participants]
  )

  // Participants with video disabled (showing avatar)
  const participantsWithoutVideo = useMemo(
    () => participants.filter((p) => !p.isVideoOn),
    [participants]
  )

  // Muted participants
  const mutedParticipants = useMemo(
    () => participants.filter((p) => p.isMuted),
    [participants]
  )

  // Find participant by attendee ID
  const getParticipantById = (attendeeId: string): Participant | undefined => {
    return participants.find((p) => p.attendeeId === attendeeId)
  }

  // Find participant by external user ID (our profile ID)
  const getParticipantByExternalId = (externalUserId: string): Participant | undefined => {
    return participants.find((p) => p.externalUserId === externalUserId)
  }

  return {
    // All participants
    participants,
    participantCount: participants.length,

    // Local user
    localParticipant,

    // Remote participants
    remoteParticipants,
    remoteParticipantCount: remoteParticipants.length,

    // By video state
    participantsWithVideo,
    participantsWithoutVideo,

    // By audio state
    mutedParticipants,

    // Lookup functions
    getParticipantById,
    getParticipantByExternalId,
  }
}
