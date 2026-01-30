"use client"

import { useMemo } from "react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@dreamteam/ui/select"
import { Globe } from "lucide-react"

interface TimezoneSelectProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
}

interface TimezoneInfo {
  id: string
  label: string
  offset: string
}

interface TimezoneGroup {
  region: string
  timezones: TimezoneInfo[]
}

function getTimezoneOffset(tz: string): string {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    })
    const parts = formatter.formatToParts(now)
    const offsetPart = parts.find((p) => p.type === "timeZoneName")
    return offsetPart?.value || ""
  } catch {
    return ""
  }
}

function getTimezoneLabel(tz: string): string {
  // Convert "America/New_York" to "New York"
  const parts = tz.split("/")
  const city = parts[parts.length - 1].replace(/_/g, " ")
  return city
}

function getRegion(tz: string): string {
  const parts = tz.split("/")
  if (parts.length < 2) return "Other"

  const region = parts[0]
  switch (region) {
    case "America":
      return "Americas"
    case "Europe":
      return "Europe"
    case "Asia":
      return "Asia"
    case "Africa":
      return "Africa"
    case "Australia":
    case "Pacific":
      return "Pacific"
    case "Atlantic":
    case "Indian":
      return "Atlantic & Indian Ocean"
    default:
      return "Other"
  }
}

function useTimezones(): TimezoneGroup[] {
  return useMemo(() => {
    // Get browser-native timezone list
    const timezones = Intl.supportedValuesOf("timeZone")

    // Group by region
    const grouped = new Map<string, TimezoneInfo[]>()

    for (const tz of timezones) {
      const region = getRegion(tz)
      const offset = getTimezoneOffset(tz)
      const label = getTimezoneLabel(tz)

      if (!grouped.has(region)) {
        grouped.set(region, [])
      }

      grouped.get(region)!.push({
        id: tz,
        label,
        offset,
      })
    }

    // Sort timezones within each group by offset then by label
    for (const timezones of grouped.values()) {
      timezones.sort((a, b) => {
        // Sort by offset first
        const offsetA = a.offset.replace("GMT", "")
        const offsetB = b.offset.replace("GMT", "")
        if (offsetA !== offsetB) {
          return offsetA.localeCompare(offsetB)
        }
        // Then by label
        return a.label.localeCompare(b.label)
      })
    }

    // Define region order
    const regionOrder = [
      "Americas",
      "Europe",
      "Asia",
      "Pacific",
      "Africa",
      "Atlantic & Indian Ocean",
      "Other",
    ]

    // Convert to array in order
    return regionOrder
      .filter((region) => grouped.has(region))
      .map((region) => ({
        region,
        timezones: grouped.get(region)!,
      }))
  }, [])
}

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return "UTC"
  }
}

export function TimezoneSelect({
  value,
  onValueChange,
  disabled = false,
}: TimezoneSelectProps) {
  const timezoneGroups = useTimezones()
  const browserTimezone = useMemo(() => getBrowserTimezone(), [])

  // Get display label for current value
  const currentOffset = getTimezoneOffset(value)
  const currentLabel = value === "UTC" ? "UTC" : getTimezoneLabel(value)

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
        <SelectValue>
          {currentLabel} ({currentOffset})
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {/* Quick options */}
        <SelectGroup>
          <SelectLabel>Quick Select</SelectLabel>
          <SelectItem value="UTC">UTC (GMT+00:00)</SelectItem>
          {browserTimezone !== "UTC" && (
            <SelectItem value={browserTimezone}>
              {getTimezoneLabel(browserTimezone)} ({getTimezoneOffset(browserTimezone)}) - Browser
            </SelectItem>
          )}
        </SelectGroup>

        {/* Grouped timezones */}
        {timezoneGroups.map((group) => (
          <SelectGroup key={group.region}>
            <SelectLabel>{group.region}</SelectLabel>
            {group.timezones.map((tz) => (
              <SelectItem key={tz.id} value={tz.id}>
                {tz.label} ({tz.offset})
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
