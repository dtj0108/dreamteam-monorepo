"use client"

import { useState, useEffect, useMemo } from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getNextRunTimes, buildCronExpression, isValidCron, describeCron } from "@/lib/cron-utils"
import { Clock, Calendar, AlertCircle } from "lucide-react"

type ScheduleType = "daily" | "weekly" | "monthly"

interface CronPickerProps {
  value: string
  onChange: (value: string) => void
  timezone?: string
  layout?: "stacked" | "split"
  sideContent?: React.ReactNode
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 15, 30, 45]
const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]
const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => i + 1)

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12:00 AM"
  if (hour === 12) return "12:00 PM"
  if (hour < 12) return `${hour}:00 AM`
  return `${hour - 12}:00 PM`
}

function parseCronToState(cron: string): {
  type: ScheduleType
  hour: number
  minute: number
  dayOfWeek: number
  dayOfMonth: number
  isCustom: boolean
} {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) {
    return { type: "daily", hour: 9, minute: 0, dayOfWeek: 1, dayOfMonth: 1, isCustom: true }
  }

  const [minutePart, hourPart, dayPart, , weekdayPart] = parts
  const parsedHour = parseInt(hourPart, 10)
  const parsedMinute = parseInt(minutePart, 10)
  const hour = Number.isNaN(parsedHour) ? 9 : parsedHour
  const minute = MINUTES.includes(parsedMinute) ? parsedMinute : 0
  let isCustom = false

  if (Number.isNaN(parsedHour) || Number.isNaN(parsedMinute) || !MINUTES.includes(parsedMinute)) {
    isCustom = true
  }

  // Daily: * * * * * with specific hour
  if (dayPart === "*" && weekdayPart === "*") {
    return { type: "daily", hour, minute, dayOfWeek: 1, dayOfMonth: 1, isCustom }
  }

  // Weekly: specific weekday
  if (dayPart === "*" && weekdayPart !== "*") {
    const parsedWeekday = parseInt(weekdayPart, 10)
    if (Number.isNaN(parsedWeekday)) {
      isCustom = true
      return { type: "weekly", hour, minute, dayOfWeek: 1, dayOfMonth: 1, isCustom }
    }
    return { type: "weekly", hour, minute, dayOfWeek: parsedWeekday, dayOfMonth: 1, isCustom }
  }

  // Monthly: specific day of month
  if (dayPart !== "*" && weekdayPart === "*") {
    const parsedDay = parseInt(dayPart, 10)
    if (Number.isNaN(parsedDay)) {
      isCustom = true
      return { type: "monthly", hour, minute, dayOfWeek: 1, dayOfMonth: 1, isCustom }
    }
    return { type: "monthly", hour, minute, dayOfWeek: 1, dayOfMonth: parsedDay, isCustom }
  }

  return { type: "daily", hour, minute, dayOfWeek: 1, dayOfMonth: 1, isCustom: true }
}

export function CronPicker({
  value,
  onChange,
  timezone = "UTC",
  layout = "stacked",
  sideContent,
}: CronPickerProps) {
  const parsedState = useMemo(() => parseCronToState(value), [value])

  const [scheduleType, setScheduleType] = useState<ScheduleType>(parsedState.type)
  const [hour, setHour] = useState(parsedState.hour)
  const [minute, setMinute] = useState(parsedState.minute)
  const [dayOfWeek, setDayOfWeek] = useState(parsedState.dayOfWeek)
  const [dayOfMonth, setDayOfMonth] = useState(parsedState.dayOfMonth)
  const [isCustomSchedule, setIsCustomSchedule] = useState(parsedState.isCustom)
  const [hasUserEdited, setHasUserEdited] = useState(false)

  useEffect(() => {
    setScheduleType(parsedState.type)
    setHour(parsedState.hour)
    setMinute(parsedState.minute)
    setDayOfWeek(parsedState.dayOfWeek)
    setDayOfMonth(parsedState.dayOfMonth)
    setIsCustomSchedule(parsedState.isCustom)
    setHasUserEdited(false)
  }, [parsedState])

  // Update cron when settings change
  useEffect(() => {
    if (isCustomSchedule && !hasUserEdited) {
      return
    }
    const newCron = buildCronExpression({
      type: scheduleType,
      hour,
      minute,
      dayOfWeek,
      dayOfMonth,
    })
    if (newCron !== value) {
      onChange(newCron)
    }
  }, [scheduleType, hour, minute, dayOfWeek, dayOfMonth, onChange, value, isCustomSchedule, hasUserEdited])

  // Get next run times for preview
  const nextRuns = useMemo(() => {
    if (!isValidCron(value)) return []
    try {
      return getNextRunTimes(value, 3, timezone)
    } catch {
      return []
    }
  }, [value, timezone])

  const isValid = isValidCron(value)
  const description = isValid ? describeCron(value) : "Invalid expression"

  const mainContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Schedule Type */}
        <div className="space-y-2">
          <Label>Frequency</Label>
          <Select
            value={scheduleType}
            onValueChange={(v) => {
              setScheduleType(v as ScheduleType)
              setHasUserEdited(true)
              setIsCustomSchedule(false)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Hour picker */}
        <div className="space-y-2">
          <Label>Hour</Label>
          <Select
            value={String(hour)}
            onValueChange={(v) => {
              setHour(parseInt(v, 10))
              setHasUserEdited(true)
              setIsCustomSchedule(false)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select hour" />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {formatHourLabel(h)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Minute picker */}
        <div className="space-y-2">
          <Label>Minute</Label>
          <Select
            value={String(minute)}
            onValueChange={(v) => {
              setMinute(parseInt(v, 10))
              setHasUserEdited(true)
              setIsCustomSchedule(false)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select minute" />
            </SelectTrigger>
            <SelectContent>
              {MINUTES.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m.toString().padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Day of week (for weekly) */}
      {scheduleType === "weekly" && (
        <div className="space-y-2">
          <Label>Day</Label>
          <Select
            value={String(dayOfWeek)}
            onValueChange={(v) => {
              setDayOfWeek(parseInt(v, 10))
              setHasUserEdited(true)
              setIsCustomSchedule(false)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map((d) => (
                <SelectItem key={d.value} value={String(d.value)}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Day of month (for monthly) */}
      {scheduleType === "monthly" && (
        <div className="space-y-2">
          <Label>Day of Month</Label>
          <Select
            value={String(dayOfMonth)}
            onValueChange={(v) => {
              setDayOfMonth(parseInt(v, 10))
              setHasUserEdited(true)
              setIsCustomSchedule(false)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_MONTH.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isCustomSchedule && !hasUserEdited && (
        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          This schedule uses a custom frequency. Choose a new schedule to replace it.
        </div>
      )}

      {/* Description */}
      <div className="flex items-center gap-2 text-sm">
        <Clock className="size-4 text-muted-foreground" />
        <span className={isValid ? "text-muted-foreground" : "text-destructive"}>
          {description}
        </span>
      </div>

      {!isValid && value && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" />
          Invalid cron expression
        </div>
      )}
    </div>
  )

  const sidePanel = (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
      {nextRuns.length > 0 && (
        <div className="rounded-xl bg-muted/50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="size-4" />
            Next runs
          </div>
          <div className="space-y-1">
            {nextRuns.map((date, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                {date.toLocaleString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {sideContent && <div>{sideContent}</div>}
    </div>
  )

  if (layout === "split") {
    return (
      <div className="space-y-4">
        {mainContent}
        {sidePanel}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {mainContent}
      {sidePanel}
    </div>
  )
}
