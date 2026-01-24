"use client"

import { ReactNode, useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { CalendarProvider } from "@/providers/calendar-provider"

export default function CalendarLayout({ children }: { children: ReactNode }) {
  const [grantId, setGrantId] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const fetchGrant = useCallback(async () => {
    try {
      const res = await fetch('/api/nylas/grants')
      if (res.ok) {
        const data = await res.json()
        if (data.grants?.length > 0) {
          setGrantId(data.grants[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch grants:', err)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchGrant()
  }, [fetchGrant])

  // Re-fetch when OAuth completes (detected via URL params)
  useEffect(() => {
    if (searchParams.get('success') === 'nylas_connected' || searchParams.get('success') === 'nylas_reconnected') {
      fetchGrant()
    }
  }, [searchParams, fetchGrant])

  return (
    <CalendarProvider initialGrantId={grantId}>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </CalendarProvider>
  )
}
