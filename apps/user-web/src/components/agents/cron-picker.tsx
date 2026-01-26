"use client"

import { useState, useEffect, useMemo } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getNextRunTimes, buildCronExpression, isValidCron, describeCron } from "@/lib/cron-utils"
import { Clock, Calendar, AlertCircle } from "lucide-react"

type ScheduleType = "daily" | "weekly" | "monthly" | "custom"

interface CronPickerProps {
  value: string
  onChange: (value: string) => void
  timezone?: string
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
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
  dayOfWeek: number
  dayOfMonth: number
} {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) {
    return { type: "daily", hour: 9, dayOfWeek: 1, dayOfMonth: 1 }
  }

  const [, hourPart, dayPart, , weekdayPart] = parts
  const hour = hourPart === "*" ? 9 : parseInt(hourPart, 10)

  // Daily: * * * * * with specific hour
  if (dayPart === "*" && weekdayPart === "*") {
    return { type: "daily", hour, dayOfWeek: 1, dayOfMonth: 1 }
  }

  // Weekly: specific weekday
  if (dayPart === "*" && weekdayPart !== "*") {
    return { type: "weekly", hour, dayOfWeek: parseInt(weekdayPart, 10), dayOfMonth: 1 }
  }

  // Monthly: specific day of month
  if (dayPart !== "*" && weekdayPart === "*") {
    return { type: "monthly", hour, dayOfWeek: 1, dayOfMonth: parseInt(dayPart, 10) }
  }

  return { type: "custom", hour, dayOfWeek: 1, dayOfMonth: 1 }
}

export function CronPicker({ value, onChange, timezone = "UTC" }: CronPickerProps) {
  const parsedState = useMemo(() => parseCronToState(value), [value])

  const [scheduleType, setScheduleType] = useState<ScheduleType>(parsedState.type)
  const [hour, setHour] = useState(parsedState.hour)
  const [dayOfWeek, setDayOfWeek] = useState(parsedState.dayOfWeek)
  const [dayOfMonth, setDayOfMonth] = useState(parsedState.dayOfMonth)
  const [customCron, setCustomCron] = useState(parsedState.type === "custom" ? value : "")

  // Update cron when settings change
  useEffect(() => {
    let newCron: string
    if (scheduleType === "custom") {
      newCron = customCron
    } else {
      newCron = buildCronExpression({
        type: scheduleType,
        hour,
        minute: 0,
        dayOfWeek,
        dayOfMonth,
      })
    }
    if (newCron !== value) {
      onChange(newCron)
    }
  }, [scheduleType, hour, dayOfWeek, dayOfMonth, customCron, onChange, value])

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

  return (
    <div className="space-y-4">
      {/* Schedule Type */}
      <div className="space-y-2">
        <Label>Frequency</Label>
        <Select
          value={scheduleType}
          onValueChange={(v) => setScheduleType(v as ScheduleType)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="custom">Custom (cron)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conditional fields based on schedule type */}
      {scheduleType !== "custom" && (
        <div className="grid grid-cols-2 gap-4">
          {/* Time picker */}
          <div className="space-y-2">
            <Label>Time</Label>
            <Select
              value={String(hour)}
              onValueChange={(v) => setHour(parseInt(v, 10))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
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

          {/* Day of week (for weekly) */}
          {scheduleType === "weekly" && (
            <div className="space-y-2">
              <Label>Day</Label>
              <Select
                value={String(dayOfWeek)}
                onValueChange={(v) => setDayOfWeek(parseInt(v, 10))}
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
                onValueChange={(v) => setDayOfMonth(parseInt(v, 10))}
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
        </div>
      )}

      {/* Custom cron input */}
      {scheduleType === "custom" && (
        <div className="space-y-2">
          <Label>Cron Expression</Label>
          <Input
            value={customCron}
            onChange={(e) => setCustomCron(e.target.value)}
            placeholder="0 9 * * *"
            className={!isValid && customCron ? "border-destructive" : ""}
          />
          <p className="text-xs text-muted-foreground">
            Format: minute hour day-of-month month day-of-week
          </p>
        </div>
      )}

      {/* Description */}
      <div className="flex items-center gap-2 text-sm">
        <Clock className="size-4 text-muted-foreground" />
        <span className={isValid ? "text-muted-foreground" : "text-destructive"}>
          {description}
        </span>
      </div>

      {/* Next runs preview */}
      {nextRuns.length > 0 && (
        <div className="rounded-md bg-muted p-3 space-y-2">
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

      {!isValid && value && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" />
          Invalid cron expression
        </div>
      )}
    </div>
  )
}
