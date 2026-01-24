/**
 * Meeting configuration from the backend API
 */
export interface MeetingConfig {
  meetingId: string;
  externalMeetingId?: string;
  mediaPlacement: {
    audioHostUrl: string;
    audioFallbackUrl: string;
    screenDataUrl: string;
    screenSharingUrl: string;
    screenViewingUrl: string;
    signalingUrl: string;
    turnControlUrl: string;
    eventIngestionUrl?: string;
  };
  mediaRegion: string;
}

/**
 * Attendee configuration from the backend API
 */
export interface AttendeeConfig {
  attendeeId: string;
  externalUserId: string;
  joinToken: string;
}

/**
 * Video tile state
 */
export interface VideoTileState {
  tileId: number;
  attendeeId: string;
  isLocalTile: boolean;
  isContent: boolean;
  pauseState: number;
  videoStreamContentWidth: number;
  videoStreamContentHeight: number;
}

/**
 * Attendee info
 */
export interface AttendeeInfo {
  attendeeId: string;
  externalUserId: string;
}

/**
 * Meeting session status
 */
export type MeetingSessionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed"
  | "reconnecting";

/**
 * Meeting event types emitted from native SDK
 */
export type MeetingEventType =
  | "meetingStarted"
  | "meetingEnded"
  | "meetingFailed"
  | "attendeeJoined"
  | "attendeeLeft"
  | "attendeeMuteChanged"
  | "videoTileAdded"
  | "videoTileRemoved"
  | "videoTilePaused"
  | "videoTileResumed"
  | "activeSpeakerChanged"
  | "audioDeviceChanged";

/**
 * Base meeting event payload
 */
export interface BaseMeetingEvent {
  type: MeetingEventType;
}

/**
 * Meeting started event
 */
export interface MeetingStartedEvent extends BaseMeetingEvent {
  type: "meetingStarted";
}

/**
 * Meeting ended event
 */
export interface MeetingEndedEvent extends BaseMeetingEvent {
  type: "meetingEnded";
}

/**
 * Meeting failed event
 */
export interface MeetingFailedEvent extends BaseMeetingEvent {
  type: "meetingFailed";
  error: string;
}

/**
 * Attendee joined event
 */
export interface AttendeeJoinedEvent extends BaseMeetingEvent {
  type: "attendeeJoined";
  attendeeId: string;
  externalUserId: string;
}

/**
 * Attendee left event
 */
export interface AttendeeLeftEvent extends BaseMeetingEvent {
  type: "attendeeLeft";
  attendeeId: string;
}

/**
 * Attendee mute changed event
 */
export interface AttendeeMuteChangedEvent extends BaseMeetingEvent {
  type: "attendeeMuteChanged";
  attendeeId: string;
  isMuted: boolean;
}

/**
 * Video tile added event
 */
export interface VideoTileAddedEvent extends BaseMeetingEvent {
  type: "videoTileAdded";
  tileState: VideoTileState;
}

/**
 * Video tile removed event
 */
export interface VideoTileRemovedEvent extends BaseMeetingEvent {
  type: "videoTileRemoved";
  tileId: number;
}

/**
 * Video tile paused event
 */
export interface VideoTilePausedEvent extends BaseMeetingEvent {
  type: "videoTilePaused";
  tileId: number;
}

/**
 * Video tile resumed event
 */
export interface VideoTileResumedEvent extends BaseMeetingEvent {
  type: "videoTileResumed";
  tileId: number;
}

/**
 * Active speaker changed event
 */
export interface ActiveSpeakerChangedEvent extends BaseMeetingEvent {
  type: "activeSpeakerChanged";
  attendeeIds: string[];
}

/**
 * Audio device changed event
 */
export interface AudioDeviceChangedEvent extends BaseMeetingEvent {
  type: "audioDeviceChanged";
  device: string;
}

/**
 * Union of all meeting events
 */
export type MeetingEvent =
  | MeetingStartedEvent
  | MeetingEndedEvent
  | MeetingFailedEvent
  | AttendeeJoinedEvent
  | AttendeeLeftEvent
  | AttendeeMuteChangedEvent
  | VideoTileAddedEvent
  | VideoTileRemovedEvent
  | VideoTilePausedEvent
  | VideoTileResumedEvent
  | ActiveSpeakerChangedEvent
  | AudioDeviceChangedEvent;

/**
 * Video scaling type for rendering
 */
export type VideoScalingType = "aspectFit" | "aspectFill";

/**
 * Props for native video view
 */
export interface ChimeVideoViewProps {
  tileId: number;
  scalingType?: VideoScalingType;
  mirror?: boolean;
  style?: object;
}
