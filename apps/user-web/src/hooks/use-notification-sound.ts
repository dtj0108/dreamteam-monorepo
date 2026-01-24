"use client"

import { useCallback, useRef } from "react"

/**
 * Hook to play notification sounds
 * Reuses the same Audio element to avoid creating multiple instances
 */
export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const playSound = useCallback((soundType: "message" | "mention" = "message") => {
    // Create audio element on first use (client-side only)
    if (typeof window === "undefined") return

    try {
      // Use the same audio element to avoid creating multiple instances
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }

      const audio = audioRef.current
      audio.src = soundType === "mention"
        ? "/sounds/mention.ogg"
        : "/sounds/message.ogg"
      audio.volume = 0.5

      // Reset and play
      audio.currentTime = 0
      audio.play().catch(() => {
        // Ignore autoplay errors - browser may block until user interaction
      })
    } catch {
      // Ignore errors (e.g., SSR, missing file)
    }
  }, [])

  return { playSound }
}

// Standalone function for use outside React components
let standaloneAudio: HTMLAudioElement | null = null

export function playNotificationSound(soundType: "message" | "mention" = "message") {
  if (typeof window === "undefined") return

  try {
    if (!standaloneAudio) {
      standaloneAudio = new Audio()
    }

    standaloneAudio.src = soundType === "mention"
      ? "/sounds/mention.ogg"
      : "/sounds/message.ogg"
    standaloneAudio.volume = 0.5
    standaloneAudio.currentTime = 0
    standaloneAudio.play().catch(() => {})
  } catch {
    // Ignore errors
  }
}
