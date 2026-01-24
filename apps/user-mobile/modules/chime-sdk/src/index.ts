import {
  NativeModulesProxy,
  EventEmitter,
  Subscription,
} from "expo-modules-core";

import ChimeVideoView from "./ChimeVideoView";
import type {
  MeetingConfig,
  AttendeeConfig,
  MeetingEvent,
  VideoTileState,
} from "./ChimeSdk.types";

// Re-export types
export * from "./ChimeSdk.types";
export { ChimeVideoView };

// Check if native module exists (won't exist in Expo Go)
let ChimeSdkModule: any = null;
let isNativeModuleAvailable = false;

try {
  ChimeSdkModule = NativeModulesProxy.ChimeSdk;
  isNativeModuleAvailable = ChimeSdkModule != null;
} catch {
  isNativeModuleAvailable = false;
}

/**
 * Check if the Chime SDK native module is available.
 * Returns false in Expo Go, true in development/production builds.
 */
export const isAvailable = isNativeModuleAvailable;

// Create event emitter only if module is available
const emitter = isNativeModuleAvailable
  ? new EventEmitter(ChimeSdkModule)
  : null;

const UNAVAILABLE_ERROR = new Error(
  "Huddles require a development build. Run `eas build --profile development` to enable."
);

/**
 * Start a meeting session with the given configuration
 */
export async function startMeeting(
  meeting: MeetingConfig,
  attendee: AttendeeConfig
): Promise<void> {
  if (!isAvailable) throw UNAVAILABLE_ERROR;
  return ChimeSdkModule.startMeeting(meeting, attendee);
}

/**
 * Stop the current meeting session
 */
export async function stopMeeting(): Promise<void> {
  if (!isAvailable) throw UNAVAILABLE_ERROR;
  return ChimeSdkModule.stopMeeting();
}

/**
 * Mute local audio
 */
export async function muteLocalAudio(): Promise<void> {
  if (!isAvailable) throw UNAVAILABLE_ERROR;
  return ChimeSdkModule.muteLocalAudio();
}

/**
 * Unmute local audio
 */
export async function unmuteLocalAudio(): Promise<void> {
  if (!isAvailable) throw UNAVAILABLE_ERROR;
  return ChimeSdkModule.unmuteLocalAudio();
}

/**
 * Check if local audio is muted
 */
export async function isLocalAudioMuted(): Promise<boolean> {
  if (!isAvailable) throw UNAVAILABLE_ERROR;
  return ChimeSdkModule.isLocalAudioMuted();
}

/**
 * Start local video capture
 */
export async function startLocalVideo(): Promise<void> {
  if (!isAvailable) throw UNAVAILABLE_ERROR;
  return ChimeSdkModule.startLocalVideo();
}

/**
 * Stop local video capture
 */
export async function stopLocalVideo(): Promise<void> {
  if (!isAvailable) throw UNAVAILABLE_ERROR;
  return ChimeSdkModule.stopLocalVideo();
}

/**
 * Switch between front and back camera
 */
export async function switchCamera(): Promise<void> {
  if (!isAvailable) throw UNAVAILABLE_ERROR;
  return ChimeSdkModule.switchCamera();
}

/**
 * Bind a video tile to a native video view
 * @param viewTag React Native view tag from findNodeHandle
 * @param tileId The tile ID to bind
 */
export async function bindVideoView(
  viewTag: number,
  tileId: number
): Promise<void> {
  if (!isAvailable) throw UNAVAILABLE_ERROR;
  return ChimeSdkModule.bindVideoView(viewTag, tileId);
}

/**
 * Unbind a video tile from its view
 * @param tileId The tile ID to unbind
 */
export async function unbindVideoView(tileId: number): Promise<void> {
  if (!isAvailable) throw UNAVAILABLE_ERROR;
  return ChimeSdkModule.unbindVideoView(tileId);
}

/**
 * Get all current video tiles
 */
export async function getVideoTiles(): Promise<VideoTileState[]> {
  if (!isAvailable) throw UNAVAILABLE_ERROR;
  return ChimeSdkModule.getVideoTiles();
}

/**
 * Subscribe to meeting events
 */
export function addMeetingEventListener(
  callback: (event: MeetingEvent) => void
): Subscription {
  if (!emitter) {
    // Return a no-op subscription when unavailable
    return {
      remove: () => {},
    } as Subscription;
  }
  return emitter.addListener("onMeetingEvent", callback);
}

/**
 * Remove all meeting event listeners
 */
export function removeAllMeetingEventListeners(): void {
  if (emitter) {
    emitter.removeAllListeners("onMeetingEvent");
  }
}
