"use client"

import { useState, useEffect, useCallback } from "react"

type NotificationPermission = "default" | "granted" | "denied"

interface UseBrowserNotificationsReturn {
  permission: NotificationPermission
  isSupported: boolean
  requestPermission: () => Promise<NotificationPermission>
  showNotification: (title: string, options?: NotificationOptions) => void
}

/**
 * Hook to manage browser notifications
 * Handles permission requests and showing notifications
 */
export function useBrowserNotifications(): UseBrowserNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isSupported, setIsSupported] = useState(false)

  // Check if notifications are supported and get current permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setIsSupported(true)
      setPermission(Notification.permission as NotificationPermission)
    }
  }, [])

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) return "denied"

    try {
      const result = await Notification.requestPermission()
      setPermission(result as NotificationPermission)
      return result as NotificationPermission
    } catch {
      return "denied"
    }
  }, [isSupported])

  // Show a notification
  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported || permission !== "granted") return

      try {
        const notification = new Notification(title, {
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          ...options,
        })

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000)

        // Focus window on click
        notification.onclick = () => {
          window.focus()
          notification.close()
        }
      } catch {
        // Ignore errors (e.g., service worker context issues)
      }
    },
    [isSupported, permission]
  )

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
  }
}

// Standalone function for use outside React components
export function showBrowserNotification(title: string, options?: NotificationOptions) {
  if (typeof window === "undefined" || !("Notification" in window)) return
  if (Notification.permission !== "granted") return

  try {
    const notification = new Notification(title, {
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      ...options,
    })

    setTimeout(() => notification.close(), 5000)

    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  } catch {
    // Ignore errors
  }
}
