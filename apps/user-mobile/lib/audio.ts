import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Sound type
type NotificationSoundType = "message" | "mention";

// User preference key
const NOTIFICATION_SOUND_ENABLED_KEY = "@notification_sound_enabled";

/**
 * Initialize audio mode for notifications
 * No-op when using expo-notifications (setup handled elsewhere)
 */
export async function initializeAudio(): Promise<void> {
  // expo-notifications handles its own setup via setupNotificationHandler
}

/**
 * Play a notification sound by showing a local notification
 * @param type - "message" for regular messages, "mention" for @mentions
 */
export async function playNotificationSound(
  type: NotificationSoundType = "message"
): Promise<void> {
  // Skip on web - use browser notifications instead
  if (Platform.OS === "web") {
    return;
  }

  // Check if sounds are enabled
  const enabled = await isNotificationSoundEnabled();
  if (!enabled) {
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: type === "mention" ? "You were mentioned" : "New message",
        body:
          type === "mention"
            ? "Someone mentioned you in a message"
            : "You have a new message",
        sound: true,
      },
      trigger: null, // Immediate notification
    });
  } catch (error) {
    console.error(`Failed to show ${type} notification:`, error);
  }
}

/**
 * Preload notification sounds - no-op for expo-notifications
 */
export async function preloadNotificationSounds(): Promise<void> {
  // No preloading needed with expo-notifications
}

/**
 * Unload notification sounds - no-op for expo-notifications
 */
export async function unloadNotificationSounds(): Promise<void> {
  // No unloading needed with expo-notifications
}

/**
 * Check if notification sounds are enabled
 */
export async function isNotificationSoundEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(NOTIFICATION_SOUND_ENABLED_KEY);
    // Default to true if not set
    return value === null ? true : value === "true";
  } catch {
    return true;
  }
}

/**
 * Set notification sound preference
 */
export async function setNotificationSoundEnabled(
  enabled: boolean
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      NOTIFICATION_SOUND_ENABLED_KEY,
      enabled ? "true" : "false"
    );
  } catch (error) {
    console.error("Failed to save notification sound preference:", error);
  }
}
