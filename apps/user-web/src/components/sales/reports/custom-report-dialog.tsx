"use client"

import { useState, useEffect, useCallback } from "react"
import { DateRange } from "react-day-picker"
import { subDays } from "date-fns"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DateRangePicker } from "@/components/analytics/date-range-picker"
import { BarChart } from "@/components/charts/bar-chart"
import { PieChart } from "@/components/charts/pie-chart"
import { AreaChart } from "@/components/charts/area-chart"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { BarChart3Icon, DownloadIcon, LoaderIcon } from "lucide-react"

interface CustomReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Entity = "deals" | "leads" | "activities"
type Metric = "count" | "sum" | "average"
type ChartType = "bar" | "pie" | "area"

interface GroupByOption {
  value: string
  label: string
}

const entityOptions: { value: Entity; label: string }[] = [
  { value: "deals", label: "Deals" },
  { value: "leads", label: "Leads" },
  { value: "activities", label: "Activities" },
]

const metricOptions: { value: Metric; label: string }[] = [
  { value: "count", label: "Count" },
  { value: "sum", label: "Sum (Value)" },
  { value: "average", label: "Average (Value)" },
]

const chartTypeOptions: { value: ChartType; label: string }[] = [
  { value: "bar", label: "Bar Chart" },
  { value: "pie", label: "Pie Chart" },
  { value: "area", label: "Area Chart" },
]

const groupByOptions: Record<Entity, GroupByOption[]> = {
  deals: [
    { value: "status", label: "Status" },
    { value: "stage", label: "Stage" },
    { value: "month", label: "Month" },
  ],
  leads: [
    { value: "source", label: "Source" },
    { value: "status", label: "Status" },
    { value: "month", label: "Month" },
  ],
  activities: [
    { value: "type", label: "Type" },
    { value: "completed", label: "Completed" },
    { value: "day", label: "Day" },
  ],
}

const chartColors = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#64748b",
]

interface ReportData {
  labels: string[]
  values: number[]
}

export function CustomReportDialog({ open, onOpenChange }: CustomReportDialogProps) {
  const [entity, setEntity] = useState<Entity>("deals")
  const [metric, setMetric] = useState<Metric>("count")
  const [groupBy, setGroupBy] = useState<string>("status")
  const [chartType, setChartType] = useState<ChartType>("bar")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset groupBy when entity changes
  useEffect(() => {
    const options = groupByOptions[entity]
    if (options.length > 0 && !options.find(o => o.value === groupBy)) {
      setGroupBy(options[0].value)
    }
  }, [entity])

  const fetchReportData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        entity,
        metric,
        group_by: groupBy,
      })
      if (dateRange?.from) {
        params.set("start_date", dateRange.from.toISOString())
      }
      if (dateRange?.to) {
        params.set("end_date", dateRange.to.toISOString())
      }

      const response = await fetch(`/api/sales/reports/custom?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate report")
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [entity, metric, groupBy, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()])

  // Fetch data when parameters change
  useEffect(() => {
    if (open) {
      fetchReportData()
    }
  }, [open, fetchReportData])

  const downloadCSV = () => {
    if (!data) return

    const rows = [
      ["Label", "Value"],
      ...data.labels.map((label, i) => [label, data.values[i].toString()]),
    ]

    const csvContent = rows.map(row => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = `custom-report-${entity}-${groupBy}-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64 text-destructive">
          {error}
        </div>
      )
    }

    if (!data || data.labels.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center py-12">
          <BarChart3Icon className="size-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No data available</p>
          <p className="text-sm text-muted-foreground/70">Try adjusting your filters or date range</p>
        </div>
      )
    }

    const chartData = data.labels.map((label, i) => ({
      name: label,
      value: data.values[i],
      color: chartColors[i % chartColors.length],
    }))

    switch (chartType) {
      case "pie":
        return (
          <PieChart
            data={chartData}
            height={320}
          />
        )
      case "area":
        return (
          <AreaChart
            data={chartData}
            xKey="name"
            areas={[{ dataKey: "value", name: "Value", color: "#3b82f6" }]}
            height={320}
            showLegend={false}
          />
        )
      case "bar":
      default:
        return (
          <BarChart
            data={chartData}
            xKey="name"
            bars={[{ dataKey: "value", name: "Value", color: "#3b82f6" }]}
            height={320}
            useDataColors
          />
        )
    }
  }

  const hasData = data && data.labels.length > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:!max-w-2xl w-full flex flex-col px-8">
        <SheetHeader>
          <SheetTitle>Custom Report Builder</SheetTitle>
          <SheetDescription>
            Configure your report parameters and preview the results
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 mt-6 space-y-6 overflow-y-auto">
          {/* Configuration Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Configuration</span>
              <Separator className="flex-1" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Entity</Label>
                <Select value={entity} onValueChange={(v) => setEntity(v as Entity)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {entityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Data source to analyze</p>
              </div>

              <div className="space-y-1.5">
                <Label>Metric</Label>
                <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {metricOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Calculation to apply</p>
              </div>

              <div className="space-y-1.5">
                <Label>Group By</Label>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groupByOptions[entity].map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">How to segment data</p>
              </div>

              <div className="space-y-1.5">
                <Label>Chart Type</Label>
                <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chartTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Visualization style</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Date Range</Label>
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </div>
          </div>

          {/* Preview Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview</span>
              <Separator className="flex-1" />
            </div>

            <Card className={`p-4 min-h-[320px] ${!hasData && !loading ? 'border-2 border-dashed' : ''}`}>
              {renderChart()}
            </Card>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 mt-4 border-t flex justify-end">
          <Button
            onClick={downloadCSV}
            disabled={!data || loading}
          >
            <DownloadIcon className="size-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
