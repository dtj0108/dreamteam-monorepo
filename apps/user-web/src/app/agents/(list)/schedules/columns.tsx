"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Sparkles, AlertTriangle, Pause } from "lucide-react"
import type { AgentSchedule } from "@/lib/types/agents"

// Format cron expression to human-readable
function formatCron(cron: string): string {
  const parts = cron.split(" ")
  if (parts.length !== 5) return cron

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

  // Common patterns
  if (dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return `Daily at ${hour}:${minute.padStart(2, "0")}`
  }
  if (dayOfMonth === "*" && month === "*" && dayOfWeek === "1") {
    return `Weekly on Monday at ${hour}:${minute.padStart(2, "0")}`
  }
  if (dayOfMonth === "1" && month === "*" && dayOfWeek === "*") {
    return `Monthly on the 1st at ${hour}:${minute.padStart(2, "0")}`
  }

  return cron
}

// Format relative time
function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "—"
  const date = new Date(dateStr)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const absDiff = Math.abs(diff)

  const minutes = Math.floor(absDiff / 60000)
  const hours = Math.floor(absDiff / 3600000)
  const days = Math.floor(absDiff / 86400000)

  if (diff < 0) {
    // Past
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  } else {
    // Future
    if (minutes < 60) return `in ${minutes}m`
    if (hours < 24) return `in ${hours}h`
    return `in ${days}d`
  }
}

export function getScheduleColumns(
  onToggle: (scheduleId: string, enabled: boolean) => void
): ColumnDef<AgentSchedule>[] {
  return [
    // Name column with agent subtitle
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Schedule" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-base shrink-0">
            {row.original.agent?.avatar_url || (
              <Sparkles className="size-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{row.original.name}</div>
            <div className="text-sm text-muted-foreground truncate">
              {row.original.agent?.name || "Unknown Agent"}
            </div>
          </div>
        </div>
      ),
    },
    // Frequency column
    {
      accessorKey: "cron_expression",
      header: () => <span className="text-muted-foreground">Frequency</span>,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatCron(row.original.cron_expression)}
        </span>
      ),
      enableSorting: false,
    },
    // Status column
    {
      id: "status",
      accessorFn: (row) => row.is_enabled,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.is_enabled ? (
            <Badge variant="default" className="gap-1">
              <span className="size-1.5 rounded-full bg-current animate-pulse" />
              Enabled
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Pause className="size-3" />
              Paused
            </Badge>
          )}
          {row.original.requires_approval && (
            <Badge variant="outline" className="gap-1 text-xs">
              <AlertTriangle className="size-3" />
              Approval
            </Badge>
          )}
        </div>
      ),
    },
    // Next run column
    {
      accessorKey: "next_run_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Next Run" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatRelativeTime(row.original.next_run_at)}
        </span>
      ),
    },
    // Actions column
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => (
        <div className="flex items-center justify-end">
          <Switch
            checked={row.original.is_enabled}
            onCheckedChange={(checked) => onToggle(row.original.id, checked)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ]
}

// Export helper functions for use in expanded content
export { formatCron, formatRelativeTime }
