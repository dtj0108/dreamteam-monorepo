"use client"

import { useEffect, useRef } from "react"

/**
 * Hook to track when a user has viewed a report.
 * Marks has_viewed_reports in the profile once per session.
 */
export function useTrackReportView() {
  const hasTracked = useRef(false)

  useEffect(() => {
    // Only track once per page load
    if (hasTracked.current) return
    hasTracked.current = true

    // Fire and forget - don't block the UI
    fetch("/api/account/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "has_viewed_reports" }),
    }).catch(() => {
      // Silently fail - this is non-critical
    })
  }, [])
}

