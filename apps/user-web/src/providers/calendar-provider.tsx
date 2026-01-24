"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"

export interface CalendarInfo {
  id: string
  name: string
  description: string | null
  isPrimary: boolean
  readOnly: boolean
  timezone: string | null
}

export interface CalendarEvent {
  id: string
  calendarId: string
  title: string | null
  description: string | null
  location: string | null
  when: {
    startTime: number
    endTime: number
    startTimezone?: string
    endTimezone?: string
  }
  status: 'confirmed' | 'tentative' | 'cancelled'
  busy: boolean
  participants: Array<{
    email: string
    name?: string
    status: 'yes' | 'no' | 'maybe' | 'noreply'
  }>
  conferencing?: {
    provider: string
    details: {
      url?: string
      meetingCode?: string
      password?: string
    }
  }
}

interface CalendarContextValue {
  // Grant
  grantId: string | null
  setGrantId: (id: string) => void

  // Calendars
  calendars: CalendarInfo[]
  selectedCalendarId: string | null
  setSelectedCalendarId: (id: string) => void
  loadingCalendars: boolean

  // Events
  events: CalendarEvent[]
  loadingEvents: boolean
  fetchEvents: (startTime: number, endTime: number) => Promise<void>

  // Date range
  startDate: Date
  endDate: Date
  setDateRange: (start: Date, end: Date) => void

  // View
  view: 'month' | 'week' | 'day'
  setView: (view: 'month' | 'week' | 'day') => void

  // Actions
  createEvent: (event: CreateEventInput) => Promise<boolean>

  // Error
  error: string | null
  clearError: () => void
}

interface CreateEventInput {
  title: string
  description?: string
  location?: string
  startTime: Date
  endTime: Date
  participants?: Array<{ email: string; name?: string }>
}

const CalendarContext = createContext<CalendarContextValue | null>(null)

export function useCalendar() {
  const context = useContext(CalendarContext)
  if (!context) {
    throw new Error("useCalendar must be used within a CalendarProvider")
  }
  return context
}

export function CalendarProvider({
  children,
  initialGrantId
}: {
  children: ReactNode
  initialGrantId?: string | null
}) {
  // State
  const [grantId, setGrantId] = useState<string | null>(initialGrantId || null)
  const [calendars, setCalendars] = useState<CalendarInfo[]>([])
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loadingCalendars, setLoadingCalendars] = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'month' | 'week' | 'day'>('week')

  // Date range - default to current week
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)

  const [startDate, setStartDate] = useState(startOfWeek)
  const [endDate, setEndDate] = useState(endOfWeek)

  const clearError = useCallback(() => setError(null), [])

  const setDateRange = useCallback((start: Date, end: Date) => {
    setStartDate(start)
    setEndDate(end)
  }, [])

  // Fetch calendars
  const fetchCalendars = useCallback(async () => {
    if (!grantId) {
      setCalendars([])
      return
    }

    setLoadingCalendars(true)
    setError(null)

    try {
      const res = await fetch(`/api/nylas/calendars?grantId=${grantId}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to load calendars')
        return
      }

      const data = await res.json()
      setCalendars(data.calendars || [])

      // Auto-select primary calendar
      const primary = data.calendars?.find((c: CalendarInfo) => c.isPrimary)
      if (primary && !selectedCalendarId) {
        setSelectedCalendarId(primary.id)
      }
    } catch (err) {
      console.error('Failed to fetch calendars:', err)
      setError('Failed to connect to server')
    } finally {
      setLoadingCalendars(false)
    }
  }, [grantId, selectedCalendarId])

  // Fetch events
  const fetchEvents = useCallback(async (start: number, end: number) => {
    if (!grantId || !selectedCalendarId) {
      setEvents([])
      return
    }

    setLoadingEvents(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        grantId,
        calendarId: selectedCalendarId,
        startTime: start.toString(),
        endTime: end.toString(),
        limit: '100',
      })

      const res = await fetch(`/api/nylas/events?${params}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to load events')
        return
      }

      const data = await res.json()
      setEvents(data.events || [])
    } catch (err) {
      console.error('Failed to fetch events:', err)
      setError('Failed to connect to server')
    } finally {
      setLoadingEvents(false)
    }
  }, [grantId, selectedCalendarId])

  // Create event
  const createEventHandler = useCallback(async (input: CreateEventInput): Promise<boolean> => {
    if (!grantId || !selectedCalendarId) {
      setError('No calendar selected')
      return false
    }

    try {
      const res = await fetch('/api/nylas/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grantId,
          calendarId: selectedCalendarId,
          title: input.title,
          description: input.description,
          location: input.location,
          when: {
            startTime: Math.floor(input.startTime.getTime() / 1000),
            endTime: Math.floor(input.endTime.getTime() / 1000),
          },
          participants: input.participants,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to create event')
        return false
      }

      // Refresh events
      await fetchEvents(
        Math.floor(startDate.getTime() / 1000),
        Math.floor(endDate.getTime() / 1000)
      )

      return true
    } catch (err) {
      console.error('Failed to create event:', err)
      setError('Failed to create event')
      return false
    }
  }, [grantId, selectedCalendarId, fetchEvents, startDate, endDate])

  // Load calendars when grant changes
  useEffect(() => {
    if (grantId) {
      fetchCalendars()
    }
  }, [grantId, fetchCalendars])

  // Load events when calendar or date range changes
  useEffect(() => {
    if (selectedCalendarId) {
      fetchEvents(
        Math.floor(startDate.getTime() / 1000),
        Math.floor(endDate.getTime() / 1000)
      )
    }
  }, [selectedCalendarId, startDate, endDate, fetchEvents])

  return (
    <CalendarContext.Provider
      value={{
        grantId,
        setGrantId,
        calendars,
        selectedCalendarId,
        setSelectedCalendarId,
        loadingCalendars,
        events,
        loadingEvents,
        fetchEvents,
        startDate,
        endDate,
        setDateRange,
        view,
        setView,
        createEvent: createEventHandler,
        error,
        clearError,
      }}
    >
      {children}
    </CalendarContext.Provider>
  )
}
