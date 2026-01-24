"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react"
import {
  ConsoleLogger,
  DefaultActiveSpeakerPolicy,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration,
  MeetingSessionStatusCode,
  type AudioVideoFacade,
  type AudioVideoObserver,
  type DeviceChangeObserver,
  type MeetingSessionStatus,
  type VideoTileState,
} from "amazon-chime-sdk-js"

// ============================================
// Types
// ============================================

export type MeetingState =
  | "idle"
  | "joining"
  | "connected"
  | "reconnecting"
  | "ended"
  | "error"

export type LayoutMode = "gallery" | "speaker"

export interface Participant {
  attendeeId: string
  externalUserId: string
  name?: string
  avatarUrl?: string
  isLocal: boolean
  isMuted: boolean
  isVideoOn: boolean
  videoTileId?: number
}

export interface ActiveMeeting {
  id: string // Our database ID
  channelId?: string
  title?: string
  chimeMeetingId: string
  mediaRegion: string
}

export interface MeetingContextType {
  // State
  activeMeeting: ActiveMeeting | null
  meetingState: MeetingState
  meetingError: string | null
  participants: Participant[]
  localParticipant: Participant | null

  // Layout state
  layoutMode: LayoutMode
  pinnedParticipantId: string | null
  activeSpeakerId: string | null
  setLayoutMode: (mode: LayoutMode) => void
  pinParticipant: (attendeeId: string | null) => void

  // Device state
  isAudioEnabled: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean
  audioInputDevices: MediaDeviceInfo[]
  audioOutputDevices: MediaDeviceInfo[]
  videoInputDevices: MediaDeviceInfo[]
  selectedAudioInput: string | null
  selectedAudioOutput: string | null
  selectedVideoInput: string | null

  // Video tiles
  videoTiles: Map<number, VideoTileState>

  // Facades for advanced usage
  audioVideo: AudioVideoFacade | null

  // Actions
  createMeeting: (workspaceId: string, channelId?: string, title?: string) => Promise<string | null>
  joinMeeting: (meetingId: string) => Promise<boolean>
  leaveMeeting: () => Promise<void>
  endMeeting: () => Promise<void>

  // Media controls
  toggleAudio: () => Promise<void>
  toggleVideo: () => Promise<void>
  startScreenShare: () => Promise<void>
  stopScreenShare: () => Promise<void>

  // Device selection
  selectAudioInput: (deviceId: string) => Promise<void>
  selectAudioOutput: (deviceId: string) => Promise<void>
  selectVideoInput: (deviceId: string) => Promise<void>
}

const MeetingContext = createContext<MeetingContextType | null>(null)

export function useMeeting() {
  const context = useContext(MeetingContext)
  if (!context) {
    throw new Error("useMeeting must be used within MeetingProvider")
  }
  return context
}

// ============================================
// Provider
// ============================================

export function MeetingProvider({ children }: { children: ReactNode }) {
  // Meeting state
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeeting | null>(null)
  const [meetingState, setMeetingState] = useState<MeetingState>("idle")
  const [meetingError, setMeetingError] = useState<string | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])

  // Layout state
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("gallery")
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null)
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null)

  // Device state
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([])
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([])
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedAudioInput, setSelectedAudioInput] = useState<string | null>(null)
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string | null>(null)
  const [selectedVideoInput, setSelectedVideoInput] = useState<string | null>(null)

  // Video tiles
  const [videoTiles, setVideoTiles] = useState<Map<number, VideoTileState>>(new Map())

  // Refs for Chime SDK
  const meetingSessionRef = useRef<DefaultMeetingSession | null>(null)
  const deviceControllerRef = useRef<DefaultDeviceController | null>(null)
  const localAttendeeIdRef = useRef<string | null>(null)

  // Refs for cleanup - store observers and callbacks so they can be properly removed
  const audioVideoObserverRef = useRef<AudioVideoObserver | null>(null)
  const deviceChangeObserverRef = useRef<DeviceChangeObserver | null>(null)
  const attendeePresenceCallbackRef = useRef<((attendeeId: string, present: boolean, externalUserId?: string) => void) | null>(null)
  const muteCallbackRef = useRef<((muted: boolean) => void) | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const meetingSession = meetingSessionRef.current
      if (meetingSession) {
        const audioVideo = meetingSession.audioVideo

        // 1. Remove observers FIRST (before stopping session)
        if (audioVideoObserverRef.current) {
          audioVideo.removeObserver(audioVideoObserverRef.current)
          audioVideoObserverRef.current = null
        }
        if (deviceChangeObserverRef.current) {
          audioVideo.removeDeviceChangeObserver(deviceChangeObserverRef.current)
          deviceChangeObserverRef.current = null
        }

        // 2. Unsubscribe from realtime subscriptions
        if (attendeePresenceCallbackRef.current) {
          audioVideo.realtimeUnsubscribeToAttendeeIdPresence(attendeePresenceCallbackRef.current)
          attendeePresenceCallbackRef.current = null
        }
        if (muteCallbackRef.current) {
          audioVideo.realtimeUnsubscribeToMuteAndUnmuteLocalAudio(muteCallbackRef.current)
          muteCallbackRef.current = null
        }

        // 3. Stop inputs and session
        audioVideo.stopVideoInput()
        audioVideo.stopAudioInput()
        audioVideo.stop()

        meetingSessionRef.current = null
      }
    }
  }, [])

  // List available devices
  const listDevices = useCallback(async () => {
    try {
      // Request permission first - then immediately stop the temp stream to release hardware
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      tempStream.getTracks().forEach(track => track.stop())

      const devices = await navigator.mediaDevices.enumerateDevices()

      setAudioInputDevices(devices.filter((d) => d.kind === "audioinput"))
      setAudioOutputDevices(devices.filter((d) => d.kind === "audiooutput"))
      setVideoInputDevices(devices.filter((d) => d.kind === "videoinput"))

      // Set defaults if not already set
      const audioInput = devices.find((d) => d.kind === "audioinput")
      const audioOutput = devices.find((d) => d.kind === "audiooutput")
      const videoInput = devices.find((d) => d.kind === "videoinput")

      if (audioInput && !selectedAudioInput) setSelectedAudioInput(audioInput.deviceId)
      if (audioOutput && !selectedAudioOutput) setSelectedAudioOutput(audioOutput.deviceId)
      if (videoInput && !selectedVideoInput) setSelectedVideoInput(videoInput.deviceId)
    } catch (error) {
      console.error("Failed to enumerate devices:", error)
    }
  }, [selectedAudioInput, selectedAudioOutput, selectedVideoInput])

  // Create a new meeting
  const createMeeting = useCallback(
    async (workspaceId: string, channelId?: string, title?: string): Promise<string | null> => {
      try {
        setMeetingState("joining")
        setMeetingError(null)

        const response = await fetch("/api/meetings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, channelId, title }),
        })

        const data = await response.json()

        // Handle 409: Meeting already exists in this channel
        // Return the existing meeting ID so the caller can navigate to it
        if (response.status === 409 && data.existingMeetingId) {
          setMeetingState("idle") // Reset state - we're not creating
          return data.existingMeetingId
        }

        if (!response.ok) {
          throw new Error(data.error || "Failed to create meeting")
        }

        // Set active meeting
        setActiveMeeting({
          id: data.meeting.id,
          channelId: data.meeting.channelId,
          title: data.meeting.title,
          chimeMeetingId: data.chime.meetingId,
          mediaRegion: data.chime.mediaRegion,
        })

        // Initialize the meeting session
        await initializeMeetingSession(data.chime, data.attendee)

        return data.meeting.id
      } catch (error) {
        console.error("Failed to create meeting:", error)
        setMeetingError(error instanceof Error ? error.message : "Failed to create meeting")
        setMeetingState("error")
        return null
      }
    },
    []
  )

  // Join an existing meeting
  const joinMeeting = useCallback(async (meetingId: string): Promise<boolean> => {
    try {
      setMeetingState("joining")
      setMeetingError(null)

      const response = await fetch(`/api/meetings/${meetingId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to join meeting")
      }

      // Set active meeting
      setActiveMeeting({
        id: data.meeting.id,
        channelId: data.meeting.channelId,
        title: data.meeting.title,
        chimeMeetingId: data.chime.meetingId,
        mediaRegion: data.chime.mediaRegion,
      })

      // Initialize the meeting session
      await initializeMeetingSession(data.chime, data.attendee)

      return true
    } catch (error) {
      console.error("Failed to join meeting:", error)
      setMeetingError(error instanceof Error ? error.message : "Failed to join meeting")
      setMeetingState("error")
      return false
    }
  }, [])

  // Initialize Chime meeting session
  const initializeMeetingSession = useCallback(
    async (
      chimeData: { meetingId: string; mediaRegion: string; mediaPlacement: unknown },
      attendeeData: { attendeeId: string; joinToken: string }
    ) => {
      try {
        // List devices first
        await listDevices()

        // Create logger
        const logger = new ConsoleLogger("ChimeSDK", LogLevel.WARN)

        // Create device controller
        const deviceController = new DefaultDeviceController(logger)
        deviceControllerRef.current = deviceController

        // Create meeting session configuration
        const configuration = new MeetingSessionConfiguration(
          {
            MeetingId: chimeData.meetingId,
            MediaRegion: chimeData.mediaRegion,
            MediaPlacement: chimeData.mediaPlacement,
          },
          {
            AttendeeId: attendeeData.attendeeId,
            JoinToken: attendeeData.joinToken,
          }
        )

        // Create meeting session
        const meetingSession = new DefaultMeetingSession(configuration, logger, deviceController)
        meetingSessionRef.current = meetingSession
        localAttendeeIdRef.current = attendeeData.attendeeId

        // Set up observers
        setupObservers(meetingSession)

        // Select default devices
        const audioInputs = await meetingSession.audioVideo.listAudioInputDevices()
        const videoInputs = await meetingSession.audioVideo.listVideoInputDevices()

        if (audioInputs.length > 0) {
          await meetingSession.audioVideo.startAudioInput(audioInputs[0].deviceId)
        }
        if (videoInputs.length > 0) {
          await meetingSession.audioVideo.startVideoInput(videoInputs[0].deviceId)
        }

        // Start the meeting
        meetingSession.audioVideo.start()

        // Bind audio element for remote audio
        const audioElement = document.getElementById("chime-audio-element") as HTMLAudioElement
        if (audioElement) {
          meetingSession.audioVideo.bindAudioElement(audioElement)
        }

        // Start local video
        meetingSession.audioVideo.startLocalVideoTile()

        setMeetingState("connected")
      } catch (error) {
        console.error("Failed to initialize meeting session:", error)
        throw error
      }
    },
    [listDevices]
  )

  // Set up Chime SDK observers
  const setupObservers = useCallback((meetingSession: DefaultMeetingSession) => {
    const audioVideoObserver: AudioVideoObserver = {
      audioVideoDidStart: () => {
        console.log("Audio/video started")
        setMeetingState("connected")
      },
      audioVideoDidStop: (sessionStatus: MeetingSessionStatus) => {
        const statusCode = sessionStatus.statusCode()
        console.log("Audio/video stopped:", statusCode)

        // Handle specific error codes with user-friendly messages
        if (statusCode === MeetingSessionStatusCode.AudioJoinedFromAnotherDevice) {
          setMeetingError("You joined this meeting from another device or tab. This session has been disconnected.")
          setMeetingState("error")
        } else if (statusCode === MeetingSessionStatusCode.Left) {
          // User explicitly left the meeting
          setMeetingState("ended")
        } else if (statusCode === MeetingSessionStatusCode.MeetingEnded) {
          // Meeting was ended by the host
          setMeetingState("ended")
        } else {
          setMeetingState("ended")
        }
        cleanup()
      },
      audioVideoDidStartConnecting: (reconnecting: boolean) => {
        if (reconnecting) {
          setMeetingState("reconnecting")
        }
      },
      videoTileDidUpdate: (tileState: VideoTileState) => {
        setVideoTiles((prev) => {
          const newMap = new Map(prev)
          if (tileState.tileId !== null) {
            newMap.set(tileState.tileId, tileState)
          }
          return newMap
        })

        // Update participant video state
        if (tileState.boundAttendeeId) {
          setParticipants((prev) =>
            prev.map((p) =>
              p.attendeeId === tileState.boundAttendeeId
                ? { ...p, isVideoOn: tileState.active ?? false, videoTileId: tileState.tileId ?? undefined }
                : p
            )
          )
        }
      },
      videoTileWasRemoved: (tileId: number) => {
        setVideoTiles((prev) => {
          const newMap = new Map(prev)
          newMap.delete(tileId)
          return newMap
        })
      },
    }

    const deviceChangeObserver: DeviceChangeObserver = {
      audioInputsChanged: (freshAudioInputDevices: MediaDeviceInfo[]) => {
        setAudioInputDevices(freshAudioInputDevices)
      },
      audioOutputsChanged: (freshAudioOutputDevices: MediaDeviceInfo[]) => {
        setAudioOutputDevices(freshAudioOutputDevices)
      },
      videoInputsChanged: (freshVideoInputDevices: MediaDeviceInfo[]) => {
        setVideoInputDevices(freshVideoInputDevices)
      },
    }

    // Store refs for cleanup
    audioVideoObserverRef.current = audioVideoObserver
    deviceChangeObserverRef.current = deviceChangeObserver

    meetingSession.audioVideo.addObserver(audioVideoObserver)
    meetingSession.audioVideo.addDeviceChangeObserver(deviceChangeObserver)

    // Subscribe to roster updates (participants)
    const attendeePresenceCallback = async (attendeeId: string, present: boolean, externalUserId?: string) => {
      if (present) {
        // Check if already exists using current state via ref pattern
        setParticipants((prev) => {
          if (prev.find((p) => p.attendeeId === attendeeId)) {
            return prev // Already exists, no change
          }
          // Add participant initially without profile data (will update async)
          return [
            ...prev,
            {
              attendeeId,
              externalUserId: externalUserId || "",
              isLocal: attendeeId === localAttendeeIdRef.current,
              isMuted: false,
              isVideoOn: false,
            },
          ]
        })

        // Fetch profile data asynchronously and update participant
        if (externalUserId) {
          try {
            const response = await fetch(`/api/profiles/${externalUserId}`)
            if (response.ok) {
              const profile = await response.json()
              setParticipants((prev) =>
                prev.map((p) =>
                  p.attendeeId === attendeeId
                    ? { ...p, name: profile.name, avatarUrl: profile.avatar_url }
                    : p
                )
              )
            }
          } catch (error) {
            console.error("Failed to fetch profile for participant:", error)
          }
        }
      } else {
        // Remove participant
        setParticipants((prev) => prev.filter((p) => p.attendeeId !== attendeeId))
      }
    }
    attendeePresenceCallbackRef.current = attendeePresenceCallback
    meetingSession.audioVideo.realtimeSubscribeToAttendeeIdPresence(attendeePresenceCallback)

    // Subscribe to local mute changes
    const muteCallback = (muted: boolean) => {
      setIsAudioEnabled(!muted)
      // Update local participant mute state
      if (localAttendeeIdRef.current) {
        setParticipants((prev) =>
          prev.map((p) =>
            p.attendeeId === localAttendeeIdRef.current ? { ...p, isMuted: muted } : p
          )
        )
      }
    }
    muteCallbackRef.current = muteCallback
    meetingSession.audioVideo.realtimeSubscribeToMuteAndUnmuteLocalAudio(muteCallback)

    // Subscribe to active speaker detection
    const activeSpeakerPolicy = new DefaultActiveSpeakerPolicy()
    meetingSession.audioVideo.subscribeToActiveSpeakerDetector(
      activeSpeakerPolicy,
      (attendeeIds: string[]) => {
        // The first attendee in the array is the most active speaker
        const activeSpeaker = attendeeIds.length > 0 ? attendeeIds[0] : null
        setActiveSpeakerId(activeSpeaker)
      }
    )
  }, [])

  // Cleanup meeting session
  const cleanup = useCallback(() => {
    const meetingSession = meetingSessionRef.current
    if (meetingSession) {
      const audioVideo = meetingSession.audioVideo

      // 1. Remove observers FIRST (before stopping session)
      // This prevents orphaned observers from trying to report events to a closed channel
      if (audioVideoObserverRef.current) {
        audioVideo.removeObserver(audioVideoObserverRef.current)
        audioVideoObserverRef.current = null
      }
      if (deviceChangeObserverRef.current) {
        audioVideo.removeDeviceChangeObserver(deviceChangeObserverRef.current)
        deviceChangeObserverRef.current = null
      }

      // 2. Unsubscribe from realtime subscriptions
      if (attendeePresenceCallbackRef.current) {
        audioVideo.realtimeUnsubscribeToAttendeeIdPresence(attendeePresenceCallbackRef.current)
        attendeePresenceCallbackRef.current = null
      }
      if (muteCallbackRef.current) {
        audioVideo.realtimeUnsubscribeToMuteAndUnmuteLocalAudio(muteCallbackRef.current)
        muteCallbackRef.current = null
      }

      // 3. Stop inputs and session
      audioVideo.stopVideoInput()
      audioVideo.stopAudioInput()
      audioVideo.stop()

      meetingSessionRef.current = null
    }

    // 4. Clear all refs and reset state
    deviceControllerRef.current = null
    localAttendeeIdRef.current = null
    setActiveMeeting(null)
    setParticipants([])
    setVideoTiles(new Map())
    setIsAudioEnabled(true)
    setIsVideoEnabled(true)
    setIsScreenSharing(false)
    // Reset layout state
    setLayoutMode("gallery")
    setPinnedParticipantId(null)
    setActiveSpeakerId(null)
  }, [])

  // Leave meeting
  const leaveMeeting = useCallback(async () => {
    if (!activeMeeting) return

    try {
      // Notify server
      await fetch(`/api/meetings/${activeMeeting.id}/leave`, {
        method: "POST",
      })

      // Stop local session
      cleanup()
      setMeetingState("idle")
    } catch (error) {
      console.error("Error leaving meeting:", error)
      cleanup()
      setMeetingState("idle")
    }
  }, [activeMeeting, cleanup])

  // End meeting (host only)
  const endMeeting = useCallback(async () => {
    if (!activeMeeting) return

    try {
      await fetch(`/api/meetings/${activeMeeting.id}`, {
        method: "DELETE",
      })

      cleanup()
      setMeetingState("ended")
    } catch (error) {
      console.error("Error ending meeting:", error)
      cleanup()
      setMeetingState("ended")
    }
  }, [activeMeeting, cleanup])

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    const audioVideo = meetingSessionRef.current?.audioVideo
    if (!audioVideo) return

    if (isAudioEnabled) {
      audioVideo.realtimeMuteLocalAudio()
    } else {
      audioVideo.realtimeUnmuteLocalAudio()
    }
    setIsAudioEnabled(!isAudioEnabled)
  }, [isAudioEnabled])

  // Toggle video
  const toggleVideo = useCallback(async () => {
    const audioVideo = meetingSessionRef.current?.audioVideo
    if (!audioVideo) return

    if (isVideoEnabled) {
      audioVideo.stopLocalVideoTile()
    } else {
      audioVideo.startLocalVideoTile()
    }
    setIsVideoEnabled(!isVideoEnabled)
  }, [isVideoEnabled])

  // Start screen share
  const startScreenShare = useCallback(async () => {
    const audioVideo = meetingSessionRef.current?.audioVideo
    if (!audioVideo) return

    try {
      await audioVideo.startContentShareFromScreenCapture()
      setIsScreenSharing(true)
    } catch (error) {
      console.error("Failed to start screen share:", error)
    }
  }, [])

  // Stop screen share
  const stopScreenShare = useCallback(async () => {
    const audioVideo = meetingSessionRef.current?.audioVideo
    if (!audioVideo) return

    audioVideo.stopContentShare()
    setIsScreenSharing(false)
  }, [])

  // Device selection
  const selectAudioInput = useCallback(async (deviceId: string) => {
    const audioVideo = meetingSessionRef.current?.audioVideo
    if (audioVideo) {
      await audioVideo.startAudioInput(deviceId)
    }
    setSelectedAudioInput(deviceId)
  }, [])

  const selectAudioOutput = useCallback(async (deviceId: string) => {
    const audioVideo = meetingSessionRef.current?.audioVideo
    if (audioVideo) {
      await audioVideo.chooseAudioOutput(deviceId)
    }
    setSelectedAudioOutput(deviceId)
  }, [])

  const selectVideoInput = useCallback(async (deviceId: string) => {
    const audioVideo = meetingSessionRef.current?.audioVideo
    if (audioVideo) {
      await audioVideo.startVideoInput(deviceId)
    }
    setSelectedVideoInput(deviceId)
  }, [])

  // Pin/unpin participant for speaker view
  const pinParticipant = useCallback((attendeeId: string | null) => {
    setPinnedParticipantId((current) => {
      // If same participant is clicked, unpin them
      if (current === attendeeId) {
        return null
      }
      return attendeeId
    })
  }, [])

  // Get local participant
  const localParticipant = participants.find((p) => p.isLocal) || null

  const value: MeetingContextType = {
    // State
    activeMeeting,
    meetingState,
    meetingError,
    participants,
    localParticipant,

    // Layout state
    layoutMode,
    pinnedParticipantId,
    activeSpeakerId,
    setLayoutMode,
    pinParticipant,

    // Device state
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,
    selectedAudioInput,
    selectedAudioOutput,
    selectedVideoInput,

    // Video tiles
    videoTiles,

    // Facade
    audioVideo: meetingSessionRef.current?.audioVideo || null,

    // Actions
    createMeeting,
    joinMeeting,
    leaveMeeting,
    endMeeting,

    // Media controls
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,

    // Device selection
    selectAudioInput,
    selectAudioOutput,
    selectVideoInput,
  }

  return (
    <MeetingContext.Provider value={value}>
      {children}
      {/* Hidden audio element for remote audio */}
      <audio id="chime-audio-element" style={{ display: "none" }} />
    </MeetingContext.Provider>
  )
}
