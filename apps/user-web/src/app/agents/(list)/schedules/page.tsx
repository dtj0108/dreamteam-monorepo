"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAgents } from "@/providers/agents-provider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CreateScheduleDialog } from "@/components/agents/create-schedule-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
} from "@tanstack/react-table"
import { Calendar, Search, X, Plus } from "lucide-react"
import { getScheduleColumns } from "./columns"
import { addDays } from "date-fns"
import type { ScheduleFilters } from "@/lib/types/agents"

// Loading skeleton for table rows
function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </TableCell>
      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-6 w-10 rounded-full" /></TableCell>
    </TableRow>
  )
}

// Next run date presets
const nextRunPresets = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "Next 7 Days", value: "7d" },
  { label: "Next 30 Days", value: "30d" },
]

function getNextRunDate(preset: string): string | undefined {
  const now = new Date()
  switch (preset) {
    case "today":
      return addDays(now, 1).toISOString()
    case "7d":
      return addDays(now, 7).toISOString()
    case "30d":
      return addDays(now, 30).toISOString()
    default:
      return undefined
  }
}

export default function SchedulesPage() {
  const router = useRouter()
  const { schedules, fetchSchedules, toggleSchedule, isLoadingSchedules, myAgents } = useAgents()
  const [sorting, setSorting] = useState<SortingState>([])

  // Filter state
  const [filters, setFilters] = useState<ScheduleFilters>({})
  const [searchValue, setSearchValue] = useState("")
  const [nextRunPreset, setNextRunPreset] = useState("all")

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchValue || undefined }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchValue])

  // Fetch when filters change
  useEffect(() => {
    fetchSchedules(filters)
  }, [filters, fetchSchedules])

  const handleToggle = useCallback(async (scheduleId: string, enabled: boolean) => {
    await toggleSchedule(scheduleId, enabled)
  }, [toggleSchedule])

  const columns = useMemo(
    () => getScheduleColumns(handleToggle),
    [handleToggle]
  )

  const table = useReactTable({
    data: schedules,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  const handleRowClick = (scheduleId: string) => {
    router.push(`/agents/schedules/${scheduleId}`)
  }

  // Check if any filters are active
  const hasActiveFilters = !!(
    filters.search ||
    filters.status ||
    filters.agentId ||
    filters.approval ||
    filters.nextRunBefore
  )

  // Clear all filters
  const clearFilters = () => {
    setSearchValue("")
    setNextRunPreset("all")
    setFilters({})
  }

  // Handler for status filter
  const handleStatusChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      status: value === "all" ? undefined : value as "enabled" | "paused"
    }))
  }

  // Handler for agent filter
  const handleAgentChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      agentId: value === "all" ? undefined : value
    }))
  }

  // Handler for approval filter
  const handleApprovalChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      approval: value === "all" ? undefined : value as "required" | "not_required"
    }))
  }

  // Handler for next run filter
  const handleNextRunChange = (value: string) => {
    setNextRunPreset(value)
    setFilters(prev => ({
      ...prev,
      nextRunBefore: getNextRunDate(value)
    }))
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Calendar className="size-6" />
              Schedules
            </h1>
            <p className="text-muted-foreground mt-1">
              View and manage agent scheduled tasks
            </p>
          </div>
          {myAgents.length > 0 && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="size-4 mr-2" />
              Create Schedule
            </Button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search schedules..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-64 pl-9"
            />
          </div>

          {/* Status Filter */}
          <Select
            value={filters.status || "all"}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="enabled">Enabled</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>

          {/* Agent Filter */}
          <Select
            value={filters.agentId || "all"}
            onValueChange={handleAgentChange}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {myAgents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Approval Filter */}
          <Select
            value={filters.approval || "all"}
            onValueChange={handleApprovalChange}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Approval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Approval</SelectItem>
              <SelectItem value="required">Required</SelectItem>
              <SelectItem value="not_required">Not Required</SelectItem>
            </SelectContent>
          </Select>

          {/* Next Run Filter */}
          <Select
            value={nextRunPreset}
            onValueChange={handleNextRunChange}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Next Run" />
            </SelectTrigger>
            <SelectContent>
              {nextRunPresets.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1 text-muted-foreground"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {isLoadingSchedules ? (
          <div className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(3)].map((_, i) => (
                    <TableRowSkeleton key={i} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : schedules.length > 0 ? (
          <div className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(row.original.id)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        No schedules found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <DataTablePagination table={table} />
          </div>
        ) : hasActiveFilters ? (
          <div className="text-center py-12">
            <Search className="size-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No schedules match your filters</h3>
            <p className="text-muted-foreground mt-1">
              Try adjusting your filters or{" "}
              <button
                onClick={clearFilters}
                className="text-sky-600 hover:underline"
              >
                clear all filters
              </button>
            </p>
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="size-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No schedules yet</h3>
            <p className="text-muted-foreground mt-1">
              {myAgents.length > 0
                ? "Create a schedule to have your agents perform tasks automatically"
                : "Scheduled tasks from your hired agents will appear here"}
            </p>
            {myAgents.length > 0 && (
              <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                <Plus className="size-4 mr-2" />
                Create Schedule
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create Schedule Dialog */}
      <CreateScheduleDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => fetchSchedules(filters)}
      />
    </div>
  )
}
