import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

/**
 * Browser Notification API hook (web platform only)
 * Provides native desktop notifications for new messages
 */

interface BrowserNotificationOptions {
  body?: string;
  tag?: string;
  icon?: string;
  silent?: boolean;
}

interface UseBrowserNotificationsReturn {
  permission: NotificationPermission | "unsupported";
  requestPermission: () => Promise<boolean>;
  showNotification: (title: string, options?: BrowserNotificationOptions) => void;
  isSupported: boolean;
}

// Check if we're on web and notifications are supported
const isNotificationSupported = (): boolean => {
  return (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    "Notification" in window
  );
};

/**
 * Hook to manage browser notifications on web platform
 */
export function useBrowserNotifications(): UseBrowserNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    isNotificationSupported() ? Notification.permission : "unsupported"
  );

  const isSupported = isNotificationSupported();

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    if (permission === "granted") {
      return true;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [isSupported, permission]);

  // Show a notification
  const showNotification = useCallback(
    (title: string, options?: BrowserNotificationOptions) => {
      if (!isSupported || permission !== "granted") {
        // Request permission if not granted
        if (permission === "default") {
          requestPermission();
        }
        return;
      }

      try {
        const notification = new Notification(title, {
          body: options?.body,
          tag: options?.tag, // Prevents duplicate notifications with same tag
          icon: options?.icon || "/favicon.ico",
          silent: options?.silent ?? false,
        });

        // Auto-close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);

        // Focus window on click
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (error) {
        console.error("Error showing notification:", error);
      }
    },
    [isSupported, permission, requestPermission]
  );

  return {
    permission,
    requestPermission,
    showNotification,
    isSupported,
  };
}

/**
 * Standalone function to show browser notification
 * For use outside React components
 */
export function showBrowserNotification(
  title: string,
  options?: BrowserNotificationOptions
): void {
  if (!isNotificationSupported()) {
    return;
  }

  if (Notification.permission !== "granted") {
    // Try to request permission
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        showBrowserNotificationInternal(title, options);
      }
    });
    return;
  }

  showBrowserNotificationInternal(title, options);
}

function showBrowserNotificationInternal(
  title: string,
  options?: BrowserNotificationOptions
): void {
  try {
    const notification = new Notification(title, {
      body: options?.body,
      tag: options?.tag,
      icon: options?.icon || "/favicon.ico",
      silent: options?.silent ?? false,
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    // Focus window on click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.error("Error showing browser notification:", error);
  }
}
