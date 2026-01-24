"use client"

import { useMeeting } from "@/providers/meeting-provider"

/**
 * Hook for meeting media controls.
 * Provides a clean interface for toggling audio, video, and screen sharing.
 */
export function useMeetingControls() {
  const {
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    leaveMeeting,
    endMeeting,
    activeMeeting,
    meetingState,
    localParticipant,
  } = useMeeting()

  // Toggle screen share
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare()
    } else {
      await startScreenShare()
    }
  }

  // Check if user is the host (can end meeting)
  const isHost = localParticipant?.externalUserId === activeMeeting?.chimeMeetingId

  return {
    // States
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isConnected: meetingState === "connected",
    isHost,

    // Actions
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    startScreenShare,
    stopScreenShare,
    leaveMeeting,
    endMeeting,
  }
}
