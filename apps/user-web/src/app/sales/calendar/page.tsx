"use client"

import { useState } from "react"
import { useCalendar } from "@/providers/calendar-provider"
import { CalendarView } from "@/components/calendar/calendar-view"
import { EventDialog } from "@/components/calendar/event-dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react"
import { GoogleSignInButton, MicrosoftSignInButton } from "@/components/nylas"

export default function CalendarPage() {
  const {
    grantId,
    calendars,
    selectedCalendarId,
    setSelectedCalendarId,
    loadingCalendars,
    loadingEvents,
    events,
    view,
    setView,
    startDate,
    endDate,
    setDateRange,
    error,
    clearError,
  } = useCalendar()

  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Navigation
  const navigateWeek = (direction: 'prev' | 'next') => {
    const days = view === 'month' ? 30 : view === 'week' ? 7 : 1
    const newStart = new Date(startDate)
    const newEnd = new Date(endDate)

    if (direction === 'prev') {
      newStart.setDate(newStart.getDate() - days)
      newEnd.setDate(newEnd.getDate() - days)
    } else {
      newStart.setDate(newStart.getDate() + days)
      newEnd.setDate(newEnd.getDate() + days)
    }

    setDateRange(newStart, newEnd)
  }

  const goToToday = () => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay())
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    setDateRange(start, end)
  }

  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' }
    if (view === 'month') {
      return startDate.toLocaleDateString(undefined, options)
    }
    const startMonth = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const endMonth = endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    return `${startMonth} - ${endMonth}`
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setEventDialogOpen(true)
  }

  // No connected account
  if (!grantId && !loadingCalendars) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md text-center">
          <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
          <h2 className="text-xl font-semibold mb-2">Connect Your Calendar</h2>
          <p className="text-muted-foreground mb-6">
            Connect your Google or Microsoft account to view and manage your calendar.
          </p>
          <div className="flex flex-col gap-3">
            <GoogleSignInButton onSuccess={() => window.location.reload()} />
            <MicrosoftSignInButton onSuccess={() => window.location.reload()} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Calendar selector */}
          {calendars.length > 0 && (
            <Select value={selectedCalendarId || undefined} onValueChange={setSelectedCalendarId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select calendar" />
              </SelectTrigger>
              <SelectContent>
                {calendars.map((cal) => (
                  <SelectItem key={cal.id} value={cal.id}>
                    {cal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateWeek('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <h2 className="text-lg font-semibold">{formatDateRange()}</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View selector */}
          <Select value={view} onValueChange={(v) => setView(v as 'month' | 'week' | 'day')}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => setEventDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="m-4 mb-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between flex-1">
            <span>{error}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearError}>
              <X className="h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Calendar View */}
      <div className="flex-1 overflow-auto p-4">
        {loadingEvents ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <CalendarView
            events={events}
            view={view}
            startDate={startDate}
            onDateClick={handleDateClick}
          />
        )}
      </div>

      {/* Event Dialog */}
      <EventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        initialDate={selectedDate}
      />
    </div>
  )
}
