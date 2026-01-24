"use client"

import { useState } from "react"
import { DateRange } from "react-day-picker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ReportFilterBar } from "@/components/sales/reports/report-filter-bar"
import { MetricCard } from "@/components/charts/metric-card"
import { BarChart } from "@/components/charts/bar-chart"
import { PieChart } from "@/components/charts/pie-chart"
import { usePipelineReport } from "@/hooks/use-pipeline-report"
import { DollarSignIcon, HashIcon, TrendingUpIcon, TargetIcon } from "lucide-react"

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function downloadPipelineReportCSV(data: any) {
  const rows = [
    ["Metric", "Value"],
    ["Total Deals", data.summary.totalDeals],
    ["Total Value", formatCurrency(data.summary.totalValue)],
    ["Weighted Value", formatCurrency(data.summary.weightedValue)],
    ["Average Deal Size", formatCurrency(data.summary.avgDealSize)],
    [],
    ["Stage", "Deal Count", "Total Value"],
    ...data.byStage.map((s: any) => [s.stageName, s.dealCount, formatCurrency(s.totalValue)]),
    [],
    ["Status", "Count", "Value"],
    ...data.byStatus.map((s: any) => [s.status, s.count, formatCurrency(s.value)]),
  ]

  const csvContent = rows.map(row => row.join(",")).join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = `pipeline-report-${new Date().toISOString().split("T")[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function PipelineReportPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const { data, loading, error } = usePipelineReport(dateRange)

  const statusColors: Record<string, string> = {
    open: "#3b82f6",
    won: "#22c55e",
    lost: "#ef4444",
  }

  const statusLabels: Record<string, string> = {
    open: "Open",
    won: "Won",
    lost: "Lost",
  }

  return (
    <div className="p-6">
      <ReportFilterBar
        title="Sales Pipeline Report"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={() => data && downloadPipelineReportCSV(data)}
        exportDisabled={!data || loading}
      />

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="p-6">
                  <div className="h-4 bg-muted rounded w-24 mb-4" />
                  <div className="h-8 bg-muted rounded w-16" />
                </div>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="animate-pulse">
              <div className="p-6">
                <div className="h-4 bg-muted rounded w-32 mb-4" />
                <div className="h-64 bg-muted rounded" />
              </div>
            </Card>
            <Card className="animate-pulse">
              <div className="p-6">
                <div className="h-4 bg-muted rounded w-32 mb-4" />
                <div className="h-64 bg-muted rounded" />
              </div>
            </Card>
          </div>
        </div>
      ) : error ? (
        <Card className="p-6">
          <p className="text-destructive">Failed to load report: {error}</p>
        </Card>
      ) : data ? (
        <div className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Value"
              value={data.summary.totalValue}
              icon={<DollarSignIcon className="size-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Deal Count"
              value={data.summary.totalDeals.toString()}
              icon={<HashIcon className="size-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Weighted Value"
              value={data.summary.weightedValue}
              icon={<TrendingUpIcon className="size-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Avg Deal Size"
              value={data.summary.avgDealSize}
              icon={<TargetIcon className="size-4 text-muted-foreground" />}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Value by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                {data.byStage.length > 0 ? (
                  <BarChart
                    data={data.byStage.map(s => ({
                      name: s.stageName,
                      value: s.totalValue,
                      color: s.stageColor,
                    }))}
                    xKey="name"
                    bars={[{ dataKey: "value", name: "Value", color: "#3b82f6" }]}
                    layout="vertical"
                    height={Math.max(200, data.byStage.length * 50)}
                    useDataColors
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    No deals in pipeline
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {data.byStatus.some(s => s.count > 0) ? (
                  <PieChart
                    data={data.byStatus
                      .filter(s => s.count > 0)
                      .map(s => ({
                        name: statusLabels[s.status] || s.status,
                        value: s.value,
                        color: statusColors[s.status] || "#64748b",
                      }))}
                    height={300}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    No deals to display
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}
