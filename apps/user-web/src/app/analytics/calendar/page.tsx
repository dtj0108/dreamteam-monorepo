"use client"

import { useEffect, useState, useMemo } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  FinancialCalendar,
  CalendarLegend,
  CalendarEventList,
  UpcomingEventsSummary,
} from "@/components/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CalendarDays, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CalendarEvent, CalendarEventType } from "@/lib/types"

export default function FinancialCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [month, setMonth] = useState<Date>(new Date())

  // Filters for event types
  const [filters, setFilters] = useState<Record<CalendarEventType, boolean>>({
    subscription: true,
    income: true,
    expense: true,
    budget_reset: true,
  })

  // Calculate date range for current month view (with buffer for navigation)
  const { startDate, endDate } = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth() - 1, 1)
    const end = new Date(month.getFullYear(), month.getMonth() + 2, 0)
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    }
  }, [month])

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true)
      try {
        const response = await fetch(
          `/api/analytics/calendar?startDate=${startDate}&endDate=${endDate}`
        )
        if (!response.ok) throw new Error("Failed to fetch events")
        const data = await response.json()
        setEvents(data)
      } catch (error) {
        console.error("Failed to fetch calendar events:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [startDate, endDate])

  // Filter events based on toggle states
  const filteredEvents = useMemo(() => {
    return events.filter((event) => filters[event.type])
  }, [events, filters])

  // Events for the selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return []
    const dateKey = selectedDate.toISOString().split("T")[0]
    return filteredEvents.filter((e) => e.date === dateKey)
  }, [filteredEvents, selectedDate])

  const toggleFilter = (type: CalendarEventType) => {
    setFilters((prev) => ({ ...prev, [type]: !prev[type] }))
  }

  const goToPreviousMonth = () => {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setMonth(new Date())
    setSelectedDate(new Date())
  }

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Analytics", href: "/analytics" },
        { label: "Financial Calendar" },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CalendarDays className="h-6 w-6" />
              Financial Calendar
            </h1>
            <p className="text-muted-foreground">
              View upcoming bills, expected income, and recurring transactions
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <UpcomingEventsSummary events={events} daysAhead={7} />
        )}

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Calendar - 2 months side by side */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToPreviousMonth}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToNextMonth}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <CalendarLegend />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[320px]" />
              ) : (
                <FinancialCalendar
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  month={month}
                  onMonthChange={setMonth}
                />
              )}
            </CardContent>
          </Card>

          {/* Sidebar - Filters & Events in one card */}
          <Card className="flex flex-col">
            {/* Filters Section */}
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter Events
              </CardTitle>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="filter-subscription"
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Bills
                  </Label>
                  <Switch
                    id="filter-subscription"
                    checked={filters.subscription}
                    onCheckedChange={() => toggleFilter("subscription")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="filter-income"
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Income
                  </Label>
                  <Switch
                    id="filter-income"
                    checked={filters.income}
                    onCheckedChange={() => toggleFilter("income")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="filter-expense"
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Expenses
                  </Label>
                  <Switch
                    id="filter-expense"
                    checked={filters.expense}
                    onCheckedChange={() => toggleFilter("expense")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="filter-budget"
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Resets
                  </Label>
                  <Switch
                    id="filter-budget"
                    checked={filters.budget_reset}
                    onCheckedChange={() => toggleFilter("budget_reset")}
                  />
                </div>
              </div>
            </CardHeader>

            {/* Events Section - fills remaining space */}
            <CardContent className="flex-1 pt-4">
              <h3 className="text-base font-semibold mb-3">
                {selectedDate
                  ? `Events on ${selectedDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}`
                  : "Select a Date"}
              </h3>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : selectedDate ? (
                <CalendarEventList
                  events={selectedDateEvents}
                  selectedDate={selectedDate}
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Click on a date to see its events
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
