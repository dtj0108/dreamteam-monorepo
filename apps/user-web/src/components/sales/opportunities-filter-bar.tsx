"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CalendarIcon, Users, ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear } from "date-fns"
import type { DateRange } from "react-day-picker"

export type ValueDisplayType = "actual" | "annualized" | "weighted"

export interface LeadPipeline {
  id: string
  name: string
  is_default: boolean
}

export interface WorkspaceMember {
  id: string
  profileId: string
  name: string
  displayName: string | null
  avatarUrl: string | null
  email: string
}

export interface OpportunitiesFilters {
  dateRange: DateRange | undefined
  pipelineId: string | null
  userIds: string[]
  needsAttention: boolean
  valueDisplay: ValueDisplayType
}

interface OpportunitiesFilterBarProps {
  filters: OpportunitiesFilters
  onFiltersChange: (filters: OpportunitiesFilters) => void
  pipelines: LeadPipeline[]
  members: WorkspaceMember[]
}

const datePresets = [
  { label: "All Time", value: "all", getRange: () => undefined },
  { label: "Today", value: "today", getRange: () => ({ from: new Date(), to: new Date() }) },
  { label: "Last 7 days", value: "7d", getRange: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: "Last 30 days", value: "30d", getRange: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "This Month", value: "month", getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "This Quarter", value: "quarter", getRange: () => ({ from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) }) },
  { label: "This Year", value: "year", getRange: () => ({ from: startOfYear(new Date()), to: new Date() }) },
]

export function OpportunitiesFilterBar({
  filters,
  onFiltersChange,
  pipelines,
  members,
}: OpportunitiesFilterBarProps) {
  const [datePreset, setDatePreset] = React.useState("all")

  const toggleUser = (profileId: string) => {
    const currentIds = filters.userIds || []
    const newIds = currentIds.includes(profileId)
      ? currentIds.filter((id) => id !== profileId)
      : [...currentIds, profileId]
    onFiltersChange({ ...filters, userIds: newIds })
  }

  const getUsersLabel = () => {
    const count = filters.userIds?.length || 0
    if (count === 0) return "All Users"
    if (count === 1) {
      const member = members.find((m) => m.profileId === filters.userIds[0])
      return member?.name || "1 User"
    }
    return `${count} Users`
  }

  const handleDatePresetChange = (presetValue: string) => {
    setDatePreset(presetValue)
    const preset = datePresets.find(p => p.value === presetValue)
    if (preset) {
      onFiltersChange({
        ...filters,
        dateRange: preset.getRange(),
      })
    }
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDatePreset("custom")
    onFiltersChange({
      ...filters,
      dateRange: range,
    })
  }

  const formatDateRange = () => {
    if (!filters.dateRange?.from) {
      return "All Time"
    }
    if (!filters.dateRange.to) {
      return format(filters.dateRange.from, "MMM d, yyyy")
    }
    return `${format(filters.dateRange.from, "MMM d")} - ${format(filters.dateRange.to, "MMM d, yyyy")}`
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b bg-white/50 dark:bg-slate-900/50">
      {/* Close Date Range */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span>Close date:</span>
            <span className="font-medium">{formatDateRange()}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Presets sidebar */}
            <div className="border-r p-2 space-y-1">
              {datePresets.map((preset) => (
                <Button
                  key={preset.value}
                  variant={datePreset === preset.value ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start text-sm"
                  onClick={() => handleDatePresetChange(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            {/* Calendar */}
            <div className="p-2">
              <Calendar
                mode="range"
                selected={filters.dateRange}
                onSelect={handleDateRangeChange}
                numberOfMonths={2}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Pipeline Selector */}
      <Select
        value={filters.pipelineId || "all"}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, pipelineId: value === "all" ? null : value })
        }
      >
        <SelectTrigger className="h-9 w-[180px]">
          <SelectValue placeholder="All Pipelines" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Pipelines</SelectItem>
          {pipelines.map((pipeline) => (
            <SelectItem key={pipeline.id} value={pipeline.id}>
              {pipeline.name}
              {pipeline.is_default && " (Default)"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* User Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Users className="h-4 w-4" />
            {getUsersLabel()}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="space-y-1">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">No team members</p>
            ) : (
              members.map((member) => {
                const isSelected = filters.userIds?.includes(member.profileId)
                return (
                  <div
                    key={member.profileId}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => toggleUser(member.profileId)}
                  >
                    <Checkbox checked={isSelected} />
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {member.name?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate flex-1">
                      {member.displayName || member.name}
                    </span>
                    {isSelected && <Check className="h-4 w-4 text-sky-500" />}
                  </div>
                )
              })
            )}
          </div>
          {filters.userIds?.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-muted-foreground"
              onClick={() => onFiltersChange({ ...filters, userIds: [] })}
            >
              Clear selection
            </Button>
          )}
        </PopoverContent>
      </Popover>

      {/* Needs Attention Toggle */}
      <div className="flex items-center gap-2 ml-2">
        <Switch
          id="needs-attention"
          checked={filters.needsAttention}
          onCheckedChange={(checked) =>
            onFiltersChange({ ...filters, needsAttention: checked })
          }
        />
        <Label htmlFor="needs-attention" className="text-sm cursor-pointer">
          Needs attention
        </Label>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Value Display Type */}
      <Select
        value={filters.valueDisplay}
        onValueChange={(value: ValueDisplayType) =>
          onFiltersChange({ ...filters, valueDisplay: value })
        }
      >
        <SelectTrigger className="h-9 w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="actual">Actual Value</SelectItem>
          <SelectItem value="annualized">Actual Value (Annualized)</SelectItem>
          <SelectItem value="weighted">Weighted Value</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
