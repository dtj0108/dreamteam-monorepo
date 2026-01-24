"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { CalendarEvent } from "@/providers/calendar-provider"

interface CalendarViewProps {
  events: CalendarEvent[]
  view: 'month' | 'week' | 'day'
  startDate: Date
  onDateClick?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
}

export function CalendarView({
  events,
  view,
  startDate,
  onDateClick,
  onEventClick,
}: CalendarViewProps) {
  if (view === 'week') {
    return (
      <WeekView
        events={events}
        startDate={startDate}
        onDateClick={onDateClick}
        onEventClick={onEventClick}
      />
    )
  }

  if (view === 'day') {
    return (
      <DayView
        events={events}
        date={startDate}
        onTimeClick={onDateClick}
        onEventClick={onEventClick}
      />
    )
  }

  return (
    <MonthView
      events={events}
      startDate={startDate}
      onDateClick={onDateClick}
      onEventClick={onEventClick}
    />
  )
}

// Week View Component
function WeekView({
  events,
  startDate,
  onDateClick,
  onEventClick,
}: {
  events: CalendarEvent[]
  startDate: Date
  onDateClick?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
}) {
  const days = useMemo(() => {
    const result = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      result.push(date)
    }
    return result
  }, [startDate])

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const today = new Date()

  const getEventsForDay = (date: Date) => {
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    return events.filter((event) => {
      const eventStart = new Date(event.when.startTime * 1000)
      return eventStart >= dayStart && eventStart <= dayEnd
    })
  }

  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with day names */}
      <div className="flex border-b">
        <div className="w-16 shrink-0" />
        {days.map((day, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 text-center py-2 border-l",
              isToday(day) && "bg-primary/5"
            )}
          >
            <div className="text-sm text-muted-foreground">
              {day.toLocaleDateString(undefined, { weekday: 'short' })}
            </div>
            <div
              className={cn(
                "text-2xl font-semibold",
                isToday(day) && "text-primary"
              )}
            >
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-h-[1440px]">
          {/* Time labels */}
          <div className="w-16 shrink-0">
            {hours.map((hour) => (
              <div key={hour} className="h-[60px] text-right pr-2 text-xs text-muted-foreground">
                {hour === 0 ? '' : `${hour}:00`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIndex) => {
            const dayEvents = getEventsForDay(day)

            return (
              <div
                key={dayIndex}
                className={cn(
                  "flex-1 border-l relative",
                  isToday(day) && "bg-primary/5"
                )}
              >
                {/* Hour grid lines */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-[60px] border-b border-dashed cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      const clickDate = new Date(day)
                      clickDate.setHours(hour, 0, 0, 0)
                      onDateClick?.(clickDate)
                    }}
                  />
                ))}

                {/* Events */}
                {dayEvents.map((event) => {
                  const startDate = new Date(event.when.startTime * 1000)
                  const endDate = new Date(event.when.endTime * 1000)
                  const startMinutes = startDate.getHours() * 60 + startDate.getMinutes()
                  const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60)

                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "absolute left-1 right-1 rounded px-2 py-1 text-xs overflow-hidden cursor-pointer",
                        event.status === 'cancelled'
                          ? "bg-muted text-muted-foreground line-through"
                          : "bg-primary text-primary-foreground"
                      )}
                      style={{
                        top: `${startMinutes}px`,
                        height: `${Math.max(duration, 30)}px`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick?.(event)
                      }}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="truncate opacity-80">
                        {startDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Day View Component
function DayView({
  events,
  date,
  onTimeClick,
  onEventClick,
}: {
  events: CalendarEvent[]
  date: Date
  onTimeClick?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i)

  const dayEvents = events.filter((event) => {
    const eventStart = new Date(event.when.startTime * 1000)
    return (
      eventStart.getDate() === date.getDate() &&
      eventStart.getMonth() === date.getMonth() &&
      eventStart.getFullYear() === date.getFullYear()
    )
  })

  return (
    <div className="flex h-full">
      {/* Time labels */}
      <div className="w-16 shrink-0">
        {hours.map((hour) => (
          <div key={hour} className="h-[60px] text-right pr-2 text-xs text-muted-foreground">
            {hour === 0 ? '' : `${hour}:00`}
          </div>
        ))}
      </div>

      {/* Day column */}
      <div className="flex-1 border-l relative min-h-[1440px]">
        {/* Hour grid lines */}
        {hours.map((hour) => (
          <div
            key={hour}
            className="h-[60px] border-b border-dashed cursor-pointer hover:bg-muted/50"
            onClick={() => {
              const clickDate = new Date(date)
              clickDate.setHours(hour, 0, 0, 0)
              onTimeClick?.(clickDate)
            }}
          />
        ))}

        {/* Events */}
        {dayEvents.map((event) => {
          const startDate = new Date(event.when.startTime * 1000)
          const endDate = new Date(event.when.endTime * 1000)
          const startMinutes = startDate.getHours() * 60 + startDate.getMinutes()
          const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60)

          return (
            <div
              key={event.id}
              className={cn(
                "absolute left-1 right-1 rounded px-2 py-1 text-sm overflow-hidden cursor-pointer",
                event.status === 'cancelled'
                  ? "bg-muted text-muted-foreground line-through"
                  : "bg-primary text-primary-foreground"
              )}
              style={{
                top: `${startMinutes}px`,
                height: `${Math.max(duration, 30)}px`,
              }}
              onClick={(e) => {
                e.stopPropagation()
                onEventClick?.(event)
              }}
            >
              <div className="font-medium">{event.title}</div>
              <div className="opacity-80">
                {startDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} -
                {endDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </div>
              {event.location && <div className="opacity-60 truncate">{event.location}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Month View Component
function MonthView({
  events,
  startDate,
  onDateClick,
  onEventClick,
}: {
  events: CalendarEvent[]
  startDate: Date
  onDateClick?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
}) {
  const today = new Date()

  // Get first day of month and calculate grid
  const firstOfMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  const startDay = firstOfMonth.getDay() // 0 = Sunday
  const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate()

  // Create grid of days (6 weeks max)
  const days: (Date | null)[] = []

  // Add empty slots for days before first of month
  for (let i = 0; i < startDay; i++) {
    days.push(null)
  }

  // Add days of month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(startDate.getFullYear(), startDate.getMonth(), i))
  }

  // Pad to complete weeks
  while (days.length % 7 !== 0) {
    days.push(null)
  }

  const getEventsForDay = (date: Date) => {
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    return events.filter((event) => {
      const eventStart = new Date(event.when.startTime * 1000)
      return eventStart >= dayStart && eventStart <= dayEnd
    })
  }

  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="h-full flex flex-col">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {weekdays.map((day) => (
          <div key={day} className="text-center py-2 text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {days.map((day, i) => (
          <div
            key={i}
            className={cn(
              "border-b border-r p-1 min-h-[100px] cursor-pointer hover:bg-muted/50",
              !day && "bg-muted/20",
              day && isToday(day) && "bg-primary/5"
            )}
            onClick={() => day && onDateClick?.(day)}
          >
            {day && (
              <>
                <div
                  className={cn(
                    "text-sm font-medium mb-1",
                    isToday(day) && "text-primary"
                  )}
                >
                  {day.getDate()}
                </div>
                <div className="space-y-0.5">
                  {getEventsForDay(day).slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "text-xs px-1 py-0.5 rounded truncate cursor-pointer",
                        event.status === 'cancelled'
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/20 text-primary"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick?.(event)
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {getEventsForDay(day).length > 3 && (
                    <div className="text-xs text-muted-foreground px-1">
                      +{getEventsForDay(day).length - 3} more
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
