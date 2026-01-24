"use client"

import { useCallback, useEffect, useState } from "react"
import { useMeeting } from "@/providers/meeting-provider"

/**
 * Hook for managing meeting device selection and preview.
 * Useful for pre-join screens where users select camera/mic before joining.
 */
export function useMeetingDevices() {
  const {
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,
    selectedAudioInput,
    selectedAudioOutput,
    selectedVideoInput,
    selectAudioInput,
    selectAudioOutput,
    selectVideoInput,
  } = useMeeting()

  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // Start local video preview (without joining meeting)
  const startPreview = useCallback(async (videoDeviceId?: string) => {
    setIsLoadingPreview(true)
    setPreviewError(null)

    try {
      const constraints: MediaStreamConstraints = {
        video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
        audio: true,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setLocalStream(stream)
      return stream
    } catch (error) {
      console.error("Failed to start preview:", error)
      setPreviewError(
        error instanceof Error ? error.message : "Failed to access camera/microphone"
      )
      return null
    } finally {
      setIsLoadingPreview(false)
    }
  }, [])

  // Stop local preview
  const stopPreview = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
      setLocalStream(null)
    }
  }, [localStream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [localStream])

  // Check if devices are available
  const hasAudioInput = audioInputDevices.length > 0
  const hasAudioOutput = audioOutputDevices.length > 0
  const hasVideoInput = videoInputDevices.length > 0

  return {
    // Device lists
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,

    // Selected devices
    selectedAudioInput,
    selectedAudioOutput,
    selectedVideoInput,

    // Device selection
    selectAudioInput,
    selectAudioOutput,
    selectVideoInput,

    // Preview
    localStream,
    isLoadingPreview,
    previewError,
    startPreview,
    stopPreview,

    // Availability
    hasAudioInput,
    hasAudioOutput,
    hasVideoInput,
  }
}
