import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { Platform } from "react-native";

import {
  setupNotificationHandler,
  setupAndroidChannel,
  registerForPushNotificationsAsync,
} from "@/lib/notifications";
import {
  registerPushToken,
  unregisterPushToken,
  getNotificationPreferences,
  NotificationPreferences,
} from "@/lib/api/notifications";
import { useAuth } from "@/providers/auth-provider";

// Types for notification data payload
interface NotificationData {
  type?: "message" | "mention" | "task" | "reminder" | "channel" | "dm";
  channelId?: string;
  dmId?: string;
  taskId?: string;
  projectId?: string;
  messageId?: string;
  url?: string;
}

interface NotificationContextValue {
  expoPushToken: string | undefined;
  notification: Notifications.Notification | undefined;
  preferences: NotificationPreferences;
  requestPermissions: () => Promise<string | undefined>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, session } = useAuth();
  const router = useRouter();
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<
    Notifications.Notification | undefined
  >();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    sound: true,
    messages: true,
    mentions: true,
    tasks: true,
    reminders: true,
  });
  const notificationListener = useRef<Notifications.EventSubscription>(null);
  const responseListener = useRef<Notifications.EventSubscription>(null);
  const lastTokenRef = useRef<string | undefined>(undefined);

  // Load preferences on mount
  useEffect(() => {
    getNotificationPreferences().then(setPreferences).catch(console.error);
  }, []);

  // Handle deep linking from notification tap
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      console.log("Notification response:", response);
      const data = response.notification.request.content
        .data as NotificationData;

      if (!data) return;

      // Handle custom URL if provided
      if (data.url) {
        router.push(data.url as any);
        return;
      }

      // Route based on notification type
      switch (data.type) {
        case "message":
        case "channel":
          if (data.channelId) {
            router.push(`/(main)/team/channels/${data.channelId}` as any);
          }
          break;

        case "dm":
          if (data.dmId) {
            router.push(`/(main)/team/dms/${data.dmId}` as any);
          }
          break;

        case "mention":
          // Navigate to the specific message if available
          if (data.channelId) {
            router.push(`/(main)/team/channels/${data.channelId}` as any);
          } else if (data.dmId) {
            router.push(`/(main)/team/dms/${data.dmId}` as any);
          }
          break;

        case "task":
          if (data.taskId && data.projectId) {
            router.push(
              `/(main)/projects/${data.projectId}` as any
            );
          }
          break;

        case "reminder":
          // Navigate to hub or relevant screen
          router.push("/(main)/hub" as any);
          break;

        default:
          // Default to hub if no specific routing
          console.log("Notification data:", data);
          break;
      }
    },
    [router]
  );

  // Setup notifications and register token when user is authenticated
  useEffect(() => {
    const setup = async () => {
      try {
        // Set up notification handler for foreground notifications
        setupNotificationHandler();

        // Set up Android notification channel
        await setupAndroidChannel();

        // Only register for push if user is authenticated
        if (user && session) {
          const token = await registerForPushNotificationsAsync();
          setExpoPushToken(token);

          // Register token with backend if we got one
          if (token && token !== lastTokenRef.current) {
            lastTokenRef.current = token;
            const platform = Platform.OS as "ios" | "android";
            await registerPushToken(token, platform);
          }
        }
      } catch (error) {
        console.log("Notification setup failed:", error);
      }
    };
    setup();
  }, [user, session]);

  // Setup notification listeners
  useEffect(() => {
    try {
      // Listen for incoming notifications (when app is foregrounded)
      notificationListener.current =
        Notifications.addNotificationReceivedListener((notification) => {
          setNotification(notification);
          console.log("Notification received:", notification);
        });

      // Listen for notification responses (when user taps notification)
      responseListener.current =
        Notifications.addNotificationResponseReceivedListener(
          handleNotificationResponse
        );
    } catch (error) {
      console.log("Notification listener setup failed:", error);
    }

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [handleNotificationResponse]);

  // Unregister token when user signs out
  useEffect(() => {
    // If user becomes null (signed out), unregister the token
    if (!user && lastTokenRef.current) {
      const tokenToUnregister = lastTokenRef.current;
      lastTokenRef.current = undefined;
      setExpoPushToken(undefined);
      unregisterPushToken(tokenToUnregister).catch(console.error);
    }
  }, [user]);

  const requestPermissions = useCallback(async () => {
    const token = await registerForPushNotificationsAsync();
    setExpoPushToken(token);

    // Register with backend if authenticated
    if (token && user) {
      lastTokenRef.current = token;
      const platform = Platform.OS as "ios" | "android";
      await registerPushToken(token, platform);
    }

    return token;
  }, [user]);

  const updatePreferences = useCallback(
    async (prefs: Partial<NotificationPreferences>) => {
      const { setNotificationPreferences } = await import(
        "@/lib/api/notifications"
      );
      const updated = await setNotificationPreferences(prefs);
      setPreferences(updated);
    },
    []
  );

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        preferences,
        requestPermissions,
        updatePreferences,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}
