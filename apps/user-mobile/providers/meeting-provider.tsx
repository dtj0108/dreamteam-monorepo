import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import type { Subscription } from "expo-modules-core";

import {
  isAvailable as isChimeSdkAvailable,
  startMeeting as nativeStartMeeting,
  stopMeeting as nativeStopMeeting,
  muteLocalAudio,
  unmuteLocalAudio,
  startLocalVideo as nativeStartLocalVideo,
  stopLocalVideo as nativeStopLocalVideo,
  switchCamera as nativeSwitchCamera,
  addMeetingEventListener,
  removeAllMeetingEventListeners,
  type MeetingConfig,
  type AttendeeConfig,
  type MeetingEvent,
  type VideoTileState,
} from "@/modules/chime-sdk/src";
import { post } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

export type MeetingStatus =
  | "idle"
  | "joining"
  | "connected"
  | "reconnecting"
  | "ended"
  | "failed";

export interface Participant {
  attendeeId: string;
  externalUserId: string;
  isMuted: boolean;
  isVideoOn: boolean;
  videoTileId: number | null;
}

interface MeetingState {
  status: MeetingStatus;
  meetingId: string | null;
  channelId: string | null;
  error: string | null;
  isAudioMuted: boolean;
  isVideoOn: boolean;
  localVideoTileId: number | null;
  participants: Map<string, Participant>;
  activeSpeakerIds: string[];
  videoTiles: Map<number, VideoTileState>;
}

type MeetingAction =
  | { type: "JOIN_STARTED"; meetingId: string; channelId: string | null }
  | { type: "MEETING_STARTED" }
  | { type: "MEETING_ENDED" }
  | { type: "MEETING_FAILED"; error: string }
  | { type: "ATTENDEE_JOINED"; attendeeId: string; externalUserId: string }
  | { type: "ATTENDEE_LEFT"; attendeeId: string }
  | { type: "ATTENDEE_MUTE_CHANGED"; attendeeId: string; isMuted: boolean }
  | { type: "VIDEO_TILE_ADDED"; tileState: VideoTileState }
  | { type: "VIDEO_TILE_REMOVED"; tileId: number }
  | { type: "ACTIVE_SPEAKERS_CHANGED"; attendeeIds: string[] }
  | { type: "LOCAL_AUDIO_MUTED" }
  | { type: "LOCAL_AUDIO_UNMUTED" }
  | { type: "LOCAL_VIDEO_STARTED" }
  | { type: "LOCAL_VIDEO_STOPPED" }
  | { type: "RESET" };

interface MeetingContextType {
  // Availability
  isAvailable: boolean;

  // State
  status: MeetingStatus;
  meetingId: string | null;
  channelId: string | null;
  error: string | null;
  isAudioMuted: boolean;
  isVideoOn: boolean;
  localVideoTileId: number | null;
  participants: Map<string, Participant>;
  activeSpeakerIds: string[];
  videoTiles: Map<number, VideoTileState>;

  // Actions
  joinMeeting: (channelId: string) => Promise<void>;
  leaveMeeting: () => Promise<void>;
  toggleAudio: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  switchCamera: () => Promise<void>;
}

interface JoinMeetingResponse {
  meeting: MeetingConfig;
  attendee: AttendeeConfig;
}

// ============================================================================
// Context
// ============================================================================

const MeetingContext = createContext<MeetingContextType | undefined>(undefined);

// ============================================================================
// Reducer
// ============================================================================

const initialState: MeetingState = {
  status: "idle",
  meetingId: null,
  channelId: null,
  error: null,
  isAudioMuted: false,
  isVideoOn: false,
  localVideoTileId: null,
  participants: new Map(),
  activeSpeakerIds: [],
  videoTiles: new Map(),
};

function meetingReducer(state: MeetingState, action: MeetingAction): MeetingState {
  switch (action.type) {
    case "JOIN_STARTED":
      return {
        ...initialState,
        status: "joining",
        meetingId: action.meetingId,
        channelId: action.channelId,
      };

    case "MEETING_STARTED":
      return {
        ...state,
        status: "connected",
        error: null,
      };

    case "MEETING_ENDED":
      return {
        ...state,
        status: "ended",
      };

    case "MEETING_FAILED":
      return {
        ...state,
        status: "failed",
        error: action.error,
      };

    case "ATTENDEE_JOINED": {
      const participants = new Map(state.participants);
      participants.set(action.attendeeId, {
        attendeeId: action.attendeeId,
        externalUserId: action.externalUserId,
        isMuted: false,
        isVideoOn: false,
        videoTileId: null,
      });
      return { ...state, participants };
    }

    case "ATTENDEE_LEFT": {
      const participants = new Map(state.participants);
      participants.delete(action.attendeeId);
      return { ...state, participants };
    }

    case "ATTENDEE_MUTE_CHANGED": {
      const participants = new Map(state.participants);
      const participant = participants.get(action.attendeeId);
      if (participant) {
        participants.set(action.attendeeId, {
          ...participant,
          isMuted: action.isMuted,
        });
      }
      return { ...state, participants };
    }

    case "VIDEO_TILE_ADDED": {
      const videoTiles = new Map(state.videoTiles);
      videoTiles.set(action.tileState.tileId, action.tileState);

      // Update participant video tile reference
      const participants = new Map(state.participants);
      if (action.tileState.attendeeId) {
        const participant = participants.get(action.tileState.attendeeId);
        if (participant) {
          participants.set(action.tileState.attendeeId, {
            ...participant,
            isVideoOn: true,
            videoTileId: action.tileState.tileId,
          });
        }
      }

      // Track local video tile
      let localVideoTileId = state.localVideoTileId;
      if (action.tileState.isLocalTile) {
        localVideoTileId = action.tileState.tileId;
      }

      return { ...state, videoTiles, participants, localVideoTileId };
    }

    case "VIDEO_TILE_REMOVED": {
      const videoTiles = new Map(state.videoTiles);
      const removedTile = videoTiles.get(action.tileId);
      videoTiles.delete(action.tileId);

      // Update participant video tile reference
      const participants = new Map(state.participants);
      if (removedTile?.attendeeId) {
        const participant = participants.get(removedTile.attendeeId);
        if (participant) {
          participants.set(removedTile.attendeeId, {
            ...participant,
            isVideoOn: false,
            videoTileId: null,
          });
        }
      }

      // Clear local video tile if it was the one removed
      let localVideoTileId = state.localVideoTileId;
      if (removedTile?.isLocalTile) {
        localVideoTileId = null;
      }

      return { ...state, videoTiles, participants, localVideoTileId };
    }

    case "ACTIVE_SPEAKERS_CHANGED":
      return { ...state, activeSpeakerIds: action.attendeeIds };

    case "LOCAL_AUDIO_MUTED":
      return { ...state, isAudioMuted: true };

    case "LOCAL_AUDIO_UNMUTED":
      return { ...state, isAudioMuted: false };

    case "LOCAL_VIDEO_STARTED":
      return { ...state, isVideoOn: true };

    case "LOCAL_VIDEO_STOPPED":
      return { ...state, isVideoOn: false };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

// ============================================================================
// Provider
// ============================================================================

export function MeetingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(meetingReducer, initialState);
  const eventSubscriptionRef = useRef<Subscription | null>(null);

  // Handle meeting events from native SDK
  const handleMeetingEvent = useCallback((event: MeetingEvent) => {
    switch (event.type) {
      case "meetingStarted":
        dispatch({ type: "MEETING_STARTED" });
        break;

      case "meetingEnded":
        dispatch({ type: "MEETING_ENDED" });
        break;

      case "meetingFailed":
        dispatch({ type: "MEETING_FAILED", error: event.error });
        break;

      case "attendeeJoined":
        dispatch({
          type: "ATTENDEE_JOINED",
          attendeeId: event.attendeeId,
          externalUserId: event.externalUserId,
        });
        break;

      case "attendeeLeft":
        dispatch({ type: "ATTENDEE_LEFT", attendeeId: event.attendeeId });
        break;

      case "attendeeMuteChanged":
        dispatch({
          type: "ATTENDEE_MUTE_CHANGED",
          attendeeId: event.attendeeId,
          isMuted: event.isMuted,
        });
        break;

      case "videoTileAdded":
        dispatch({ type: "VIDEO_TILE_ADDED", tileState: event.tileState });
        break;

      case "videoTileRemoved":
        dispatch({ type: "VIDEO_TILE_REMOVED", tileId: event.tileId });
        break;

      case "activeSpeakerChanged":
        dispatch({
          type: "ACTIVE_SPEAKERS_CHANGED",
          attendeeIds: event.attendeeIds,
        });
        break;
    }
  }, []);

  // Subscribe to native events on mount
  useEffect(() => {
    eventSubscriptionRef.current = addMeetingEventListener(handleMeetingEvent);

    return () => {
      if (eventSubscriptionRef.current) {
        eventSubscriptionRef.current.remove();
      }
      removeAllMeetingEventListeners();
    };
  }, [handleMeetingEvent]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (state.status !== "connected") return;

      // Audio continues in background on iOS
      // Video should stop when backgrounded
      if (nextAppState === "background" && state.isVideoOn) {
        nativeStopLocalVideo().catch(() => {});
        dispatch({ type: "LOCAL_VIDEO_STOPPED" });
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [state.status, state.isVideoOn]);

  // Join meeting
  const joinMeeting = useCallback(async (channelId: string) => {
    try {
      // Get meeting credentials from backend
      const response = await post<JoinMeetingResponse>(
        `/api/meetings/${channelId}/join`
      );

      dispatch({
        type: "JOIN_STARTED",
        meetingId: response.meeting.meetingId,
        channelId,
      });

      // Start native meeting session
      await nativeStartMeeting(response.meeting, response.attendee);
    } catch (error) {
      dispatch({
        type: "MEETING_FAILED",
        error: error instanceof Error ? error.message : "Failed to join meeting",
      });
      throw error;
    }
  }, []);

  // Leave meeting
  const leaveMeeting = useCallback(async () => {
    try {
      await nativeStopMeeting();
      dispatch({ type: "RESET" });
    } catch (error) {
      console.error("Error leaving meeting:", error);
      dispatch({ type: "RESET" });
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    try {
      if (state.isAudioMuted) {
        await unmuteLocalAudio();
        dispatch({ type: "LOCAL_AUDIO_UNMUTED" });
      } else {
        await muteLocalAudio();
        dispatch({ type: "LOCAL_AUDIO_MUTED" });
      }
    } catch (error) {
      console.error("Error toggling audio:", error);
    }
  }, [state.isAudioMuted]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    try {
      if (state.isVideoOn) {
        await nativeStopLocalVideo();
        dispatch({ type: "LOCAL_VIDEO_STOPPED" });
      } else {
        await nativeStartLocalVideo();
        dispatch({ type: "LOCAL_VIDEO_STARTED" });
      }
    } catch (error) {
      console.error("Error toggling video:", error);
    }
  }, [state.isVideoOn]);

  // Switch camera
  const switchCamera = useCallback(async () => {
    try {
      await nativeSwitchCamera();
    } catch (error) {
      console.error("Error switching camera:", error);
    }
  }, []);

  const value: MeetingContextType = {
    // Availability
    isAvailable: isChimeSdkAvailable,

    // State
    status: state.status,
    meetingId: state.meetingId,
    channelId: state.channelId,
    error: state.error,
    isAudioMuted: state.isAudioMuted,
    isVideoOn: state.isVideoOn,
    localVideoTileId: state.localVideoTileId,
    participants: state.participants,
    activeSpeakerIds: state.activeSpeakerIds,
    videoTiles: state.videoTiles,

    // Actions
    joinMeeting,
    leaveMeeting,
    toggleAudio,
    toggleVideo,
    switchCamera,
  };

  return (
    <MeetingContext.Provider value={value}>{children}</MeetingContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useMeeting() {
  const context = useContext(MeetingContext);
  if (context === undefined) {
    throw new Error("useMeeting must be used within a MeetingProvider");
  }
  return context;
}
