"use client"

import { ReactNode, useEffect, useState } from "react"
import { CalendarProvider } from "@/providers/calendar-provider"

export default function CalendarLayout({ children }: { children: ReactNode }) {
  const [grantId, setGrantId] = useState<string | null>(null)

  // Fetch the first connected account to use for calendar
  useEffect(() => {
    async function fetchGrant() {
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
    }
    fetchGrant()
  }, [])

  return (
    <CalendarProvider initialGrantId={grantId}>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </CalendarProvider>
  )
}
