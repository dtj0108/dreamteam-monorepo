import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import { supabase } from "../supabase";

// Key for storing the last registered push token locally
const PUSH_TOKEN_KEY = "lastPushToken";

/**
 * Register a push token with the backend.
 * Stores the token in the user_push_tokens table.
 */
export async function registerPushToken(
  token: string,
  platform: "ios" | "android" = Platform.OS as "ios" | "android"
): Promise<void> {
  console.log("[Notifications API] registerPushToken:", { token: token.substring(0, 30) + "...", platform });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("[Notifications API] registerPushToken - no user, skipping");
      return;
    }

    // Upsert the push token (insert or update if exists)
    const { error } = await supabase
      .from("user_push_tokens")
      .upsert(
        {
          user_id: user.id,
          token,
          platform,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,token",
        }
      );

    if (error) {
      // If the table doesn't exist yet, just log and continue
      if (error.code === "42P01") {
        console.log("[Notifications API] registerPushToken - user_push_tokens table not found (backend setup required)");
        return;
      }
      throw error;
    }

    // Store locally so we can unregister on sign out
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

    console.log("[Notifications API] registerPushToken success");
  } catch (error) {
    console.error("[Notifications API] registerPushToken ERROR:", error);
    // Don't throw - push token registration is non-critical
  }
}

/**
 * Unregister a push token from the backend.
 * Called on sign out to stop sending notifications to this device.
 */
export async function unregisterPushToken(token?: string): Promise<void> {
  console.log("[Notifications API] unregisterPushToken");

  try {
    // Get token from param or storage
    const tokenToRemove = token || await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!tokenToRemove) {
      console.log("[Notifications API] unregisterPushToken - no token to remove");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Still try to clear local storage even if no user
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
      return;
    }

    // Delete the push token from the database
    const { error } = await supabase
      .from("user_push_tokens")
      .delete()
      .eq("user_id", user.id)
      .eq("token", tokenToRemove);

    if (error) {
      // If the table doesn't exist yet, just log and continue
      if (error.code === "42P01") {
        console.log("[Notifications API] unregisterPushToken - user_push_tokens table not found");
      } else {
        console.error("[Notifications API] unregisterPushToken error:", error);
      }
    }

    // Clear local storage
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);

    console.log("[Notifications API] unregisterPushToken success");
  } catch (error) {
    console.error("[Notifications API] unregisterPushToken ERROR:", error);
    // Don't throw - unregistration is non-critical
  }
}

/**
 * Get notification preferences for the current user.
 * Returns default preferences if none are stored.
 */
export interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  messages: boolean;
  mentions: boolean;
  tasks: boolean;
  reminders: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  sound: true,
  messages: true,
  mentions: true,
  tasks: true,
  reminders: true,
};

const PREFERENCES_KEY = "notificationPreferences";

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
    return DEFAULT_PREFERENCES;
  } catch (error) {
    console.error("[Notifications API] getNotificationPreferences ERROR:", error);
    return DEFAULT_PREFERENCES;
  }
}

export async function setNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  try {
    const current = await getNotificationPreferences();
    const updated = { ...current, ...preferences };
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
    console.log("[Notifications API] setNotificationPreferences:", updated);
    return updated;
  } catch (error) {
    console.error("[Notifications API] setNotificationPreferences ERROR:", error);
    throw error;
  }
}
