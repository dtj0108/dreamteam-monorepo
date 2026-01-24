"use client"

import * as React from "react"
import {
  DayPicker,
  getDefaultClassNames,
} from "react-day-picker"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import type { CalendarEvent, CalendarEventType } from "@/lib/types"
import { CALENDAR_EVENT_COLORS } from "@/lib/types"

interface FinancialCalendarProps {
  events: CalendarEvent[]
  selectedDate?: Date
  onDateSelect?: (date: Date | undefined) => void
  month?: Date
  onMonthChange?: (month: Date) => void
  className?: string
}

export function FinancialCalendar({
  events,
  selectedDate,
  onDateSelect,
  month,
  onMonthChange,
  className,
}: FinancialCalendarProps) {
  const defaultClassNames = getDefaultClassNames()

  // Group events by date
  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      const dateKey = event.date
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey)!.push(event)
    }
    return map
  }, [events])

  // Get unique event types for a date (for dot colors)
  const getEventTypesForDate = (date: Date): CalendarEventType[] => {
    const dateKey = date.toISOString().split('T')[0]
    const dateEvents = eventsByDate.get(dateKey) || []
    const types = new Set<CalendarEventType>()
    for (const event of dateEvents) {
      types.add(event.type)
    }
    return Array.from(types)
  }

  return (
    <DayPicker
      mode="single"
      numberOfMonths={2}
      selected={selectedDate}
      onSelect={onDateSelect}
      month={month}
      onMonthChange={onMonthChange}
      showOutsideDays
      className={cn(
        "bg-background",
        className
      )}
      classNames={{
        root: cn("w-full", defaultClassNames.root),
        months: cn("flex gap-8", defaultClassNames.months),
        month: cn("flex-1", defaultClassNames.month),
        month_caption: cn(
          "flex justify-center items-center h-10 mb-2",
          defaultClassNames.month_caption
        ),
        caption_label: cn(
          "text-sm font-semibold",
          defaultClassNames.caption_label
        ),
        nav: cn(
          "hidden",
          defaultClassNames.nav
        ),
        button_previous: cn(
          "hidden",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          "hidden",
          defaultClassNames.button_next
        ),
        weekdays: cn("flex w-full", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground text-xs font-medium w-full text-center py-2",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full", defaultClassNames.week),
        day: cn(
          "relative w-full p-0.5",
          defaultClassNames.day
        ),
        today: cn(
          "[&>button]:bg-accent [&>button]:text-accent-foreground",
          defaultClassNames.today
        ),
        selected: cn(
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
          defaultClassNames.selected
        ),
        outside: cn(
          "text-muted-foreground/50",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled
        ),
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon className="h-4 w-4" />
          }
          return <ChevronRightIcon className="h-4 w-4" />
        },
        DayButton: ({ day, modifiers, ...props }) => {
          const eventTypes = getEventTypesForDate(day.date)
          const hasEvents = eventTypes.length > 0

          return (
            <Button
              variant="ghost"
              className={cn(
                "h-12 w-full flex flex-col items-center justify-center gap-0.5 rounded-md hover:bg-muted",
                modifiers.selected && "bg-primary text-primary-foreground hover:bg-primary",
                modifiers.today && !modifiers.selected && "bg-accent text-accent-foreground",
                modifiers.outside && "text-muted-foreground/50"
              )}
              {...props}
            >
              <span className="text-sm font-medium">{day.date.getDate()}</span>
              {hasEvents && (
                <div className="flex gap-0.5 justify-center">
                  {eventTypes.slice(0, 4).map((type) => (
                    <span
                      key={type}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: CALENDAR_EVENT_COLORS[type] }}
                    />
                  ))}
                </div>
              )}
            </Button>
          )
        },
      }}
    />
  )
}

// Legend component for event types
export function CalendarLegend() {
  const items: { type: CalendarEventType; label: string }[] = [
    { type: 'subscription', label: 'Bills' },
    { type: 'income', label: 'Income' },
    { type: 'expense', label: 'Expenses' },
    { type: 'budget_reset', label: 'Budget Reset' },
  ]

  return (
    <div className="flex flex-wrap gap-4 text-sm">
      {items.map(({ type, label }) => (
        <div key={type} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: CALENDAR_EVENT_COLORS[type] }}
          />
          <span className="text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  )
}

