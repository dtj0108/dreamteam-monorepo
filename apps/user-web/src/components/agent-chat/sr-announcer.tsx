"use client"

import { useEffect, useState, useCallback } from "react"

interface SRAnnouncerProps {
  message: string
  politeness?: "polite" | "assertive"
  id?: string
}

/**
 * Screen Reader Announcer Component
 * 
 * A visually hidden component that announces messages to screen readers.
 * Uses aria-live regions to communicate status updates without visual changes.
 */
export function SRAnnouncer({ message, politeness = "polite", id }: SRAnnouncerProps) {
  const [announcement, setAnnouncement] = useState(message)

  useEffect(() => {
    // Small delay to ensure screen readers announce even if the same message is sent twice
    const timer = setTimeout(() => {
      setAnnouncement(message)
    }, 100)

    return () => clearTimeout(timer)
  }, [message])

  return (
    <div
      id={id}
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
}

interface UseSRAnnouncerReturn {
  announcement: string
  politeness: "polite" | "assertive"
  announce: (message: string, politeness?: "polite" | "assertive") => void
  announcePolite: (message: string) => void
  announceAssertive: (message: string) => void
  clearAnnouncement: () => void
}

/**
 * Hook for managing screen reader announcements
 * 
 * @returns Object with announcement state and helper functions
 */
export function useSRAnnouncer(): UseSRAnnouncerReturn {
  const [announcement, setAnnouncement] = useState("")
  const [politeness, setPoliteness] = useState<"polite" | "assertive">("polite")

  const announce = useCallback((message: string, newPoliteness: "polite" | "assertive" = "polite") => {
    setPoliteness(newPoliteness)
    setAnnouncement(message)
  }, [])

  const announcePolite = useCallback((message: string) => {
    announce(message, "polite")
  }, [announce])

  const announceAssertive = useCallback((message: string) => {
    announce(message, "assertive")
  }, [announce])

  const clearAnnouncement = useCallback(() => {
    setAnnouncement("")
  }, [])

  return {
    announcement,
    politeness,
    announce,
    announcePolite,
    announceAssertive,
    clearAnnouncement,
  }
}

export type { SRAnnouncerProps }
