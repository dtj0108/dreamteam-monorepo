"use client"

import {
  CreditCard,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { CalendarEvent, CalendarEventType } from "@/lib/types"
import { CALENDAR_EVENT_LABELS } from "@/lib/types"

interface CalendarEventListProps {
  events: CalendarEvent[]
  selectedDate?: Date
  className?: string
}

const eventIcons: Record<CalendarEventType, React.ElementType> = {
  subscription: CreditCard,
  income: ArrowUpCircle,
  expense: ArrowDownCircle,
  budget_reset: RefreshCw,
}

const eventColors: Record<CalendarEventType, string> = {
  subscription: "text-rose-500",
  income: "text-emerald-500",
  expense: "text-amber-500",
  budget_reset: "text-blue-500",
}

const eventBgColors: Record<CalendarEventType, string> = {
  subscription: "bg-rose-500/10",
  income: "bg-emerald-500/10",
  expense: "bg-amber-500/10",
  budget_reset: "bg-blue-500/10",
}

export function CalendarEventList({
  events,
  selectedDate,
  className,
}: CalendarEventListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Filter events by selected date if provided
  const filteredEvents = selectedDate
    ? events.filter(
        (e) => e.date === selectedDate.toISOString().split("T")[0]
      )
    : events

  // Group events by type for display
  const groupedEvents = filteredEvents.reduce(
    (acc, event) => {
      if (!acc[event.type]) {
        acc[event.type] = []
      }
      acc[event.type].push(event)
      return acc
    },
    {} as Record<CalendarEventType, CalendarEvent[]>
  )

  const eventOrder: CalendarEventType[] = [
    "subscription",
    "income",
    "expense",
    "budget_reset",
  ]

  if (filteredEvents.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-muted-foreground">
          {selectedDate
            ? "No events on this date"
            : "No upcoming events"}
        </p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {selectedDate && (
        <h3 className="font-semibold text-lg">
          {formatDate(selectedDate)}
        </h3>
      )}

      <div className="space-y-6">
        {eventOrder.map((type) => {
          const typeEvents = groupedEvents[type]
          if (!typeEvents || typeEvents.length === 0) return null

          const Icon = eventIcons[type]

          return (
            <div key={type} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon className={cn("h-4 w-4", eventColors[type])} />
                <span>{CALENDAR_EVENT_LABELS[type]}</span>
                <span className="text-muted-foreground">
                  ({typeEvents.length})
                </span>
              </div>

              <div className="space-y-2 pl-6">
                {typeEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EventCard({ event }: { event: CalendarEvent }) {
  const Icon = eventIcons[event.type]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg",
        eventBgColors[event.type]
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "p-1.5 rounded-md",
            eventBgColors[event.type]
          )}
        >
          <Icon className={cn("h-4 w-4", eventColors[event.type])} />
        </div>
        <div>
          <p className="font-medium text-sm">{event.title}</p>
          {event.category && (
            <p className="text-xs text-muted-foreground">
              {event.category}
            </p>
          )}
        </div>
      </div>
      {event.amount !== undefined && (
        <span
          className={cn(
            "font-semibold text-sm",
            event.type === "income" ? "text-emerald-600" : "",
            event.type === "subscription" || event.type === "expense"
              ? "text-rose-600"
              : ""
          )}
        >
          {event.type === "income" ? "+" : ""}
          {event.type === "subscription" || event.type === "expense"
            ? "-"
            : ""}
          {formatCurrency(event.amount)}
        </span>
      )}
    </div>
  )
}

// Component for showing upcoming events summary - compact inline version
export function UpcomingEventsSummary({
  events,
  daysAhead = 7,
}: {
  events: CalendarEvent[]
  daysAhead?: number
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const futureDate = new Date(today)
  futureDate.setDate(futureDate.getDate() + daysAhead)

  const upcomingEvents = events.filter((e) => {
    const eventDate = new Date(e.date)
    return eventDate >= today && eventDate <= futureDate
  })

  const billsTotal = upcomingEvents
    .filter((e) => e.type === "subscription")
    .reduce((sum, e) => sum + (e.amount || 0), 0)

  const incomeTotal = upcomingEvents
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + (e.amount || 0), 0)

  const expensesTotal = upcomingEvents
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + (e.amount || 0), 0)

  const budgetResets = upcomingEvents.filter(
    (e) => e.type === "budget_reset"
  ).length

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <CreditCard className="h-4 w-4 text-rose-500" />
          <span>Bills Due</span>
        </div>
        <p className="text-2xl font-bold">{formatCurrency(billsTotal)}</p>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
          <span>Expected Income</span>
        </div>
        <p className="text-2xl font-bold text-emerald-600">
          {formatCurrency(incomeTotal)}
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <ArrowDownCircle className="h-4 w-4 text-amber-500" />
          <span>Recurring Expenses</span>
        </div>
        <p className="text-2xl font-bold">{formatCurrency(expensesTotal)}</p>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <RefreshCw className="h-4 w-4 text-blue-500" />
          <span>Budget Resets</span>
        </div>
        <p className="text-2xl font-bold">{budgetResets}</p>
      </div>
    </div>
  )
}

