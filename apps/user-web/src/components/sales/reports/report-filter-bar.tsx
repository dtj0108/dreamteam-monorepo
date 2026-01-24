"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/analytics/date-range-picker"
import { ArrowLeftIcon, DownloadIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

interface ReportFilterBarProps {
  title: string
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
  onExport: () => void
  exportDisabled?: boolean
  backHref?: string
}

export function ReportFilterBar({
  title,
  dateRange,
  onDateRangeChange,
  onExport,
  exportDisabled = false,
  backHref = "/sales/reports",
}: ReportFilterBarProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Link href={backHref}>
          <Button variant="ghost" size="icon">
            <ArrowLeftIcon className="size-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
        />
        <Button variant="outline" onClick={onExport} disabled={exportDisabled}>
          <DownloadIcon className="size-4 mr-2" />
          Export
        </Button>
      </div>
    </div>
  )
}
