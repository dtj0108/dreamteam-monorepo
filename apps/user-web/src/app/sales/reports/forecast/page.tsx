"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ReportFilterBar } from "@/components/sales/reports/report-filter-bar"
import { MetricCard } from "@/components/charts/metric-card"
import { BarChart } from "@/components/charts/bar-chart"
import { AreaChart } from "@/components/charts/area-chart"
import { useForecastReport } from "@/hooks/use-forecast-report"
import { DollarSignIcon, TrendingUpIcon, CalendarIcon, BarChart3Icon } from "lucide-react"

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const bandColors: Record<string, string> = {
  "0-25%": "#ef4444",
  "26-50%": "#f59e0b",
  "51-75%": "#3b82f6",
  "76-100%": "#22c55e",
}

function downloadForecastReportCSV(data: any) {
  const rows = [
    ["Metric", "Value"],
    ["Total Pipeline Value", formatCurrency(data.summary.totalPipelineValue)],
    ["Weighted Forecast", formatCurrency(data.summary.weightedForecast)],
    ["Expected This Month", formatCurrency(data.summary.expectedThisMonth)],
    ["Expected This Quarter", formatCurrency(data.summary.expectedThisQuarter)],
    [],
    ["Month", "Expected Value", "Weighted Value", "Deal Count"],
    ...data.byMonth.map((m: any) => [
      m.month,
      formatCurrency(m.expectedValue),
      formatCurrency(m.weightedValue),
      m.dealCount,
    ]),
    [],
    ["Probability Band", "Deal Count", "Total Value"],
    ...data.byProbabilityBand.map((b: any) => [b.band, b.dealCount, formatCurrency(b.totalValue)]),
  ]

  const csvContent = rows.map(row => row.join(",")).join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = `forecast-report-${new Date().toISOString().split("T")[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function ForecastReportPage() {
  const { data, loading, error } = useForecastReport(6)

  // Placeholder for date range change - forecast doesn't use date range picker
  const handleDateRangeChange = () => {}

  return (
    <div className="p-6">
      <ReportFilterBar
        title="Revenue Forecast"
        dateRange={undefined}
        onDateRangeChange={handleDateRangeChange}
        onExport={() => data && downloadForecastReportCSV(data)}
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
          <Card className="animate-pulse">
            <div className="p-6">
              <div className="h-4 bg-muted rounded w-32 mb-4" />
              <div className="h-64 bg-muted rounded" />
            </div>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="animate-pulse">
              <div className="p-6">
                <div className="h-4 bg-muted rounded w-32 mb-4" />
                <div className="h-48 bg-muted rounded" />
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
              title="Pipeline Value"
              value={data.summary.totalPipelineValue}
              icon={<DollarSignIcon className="size-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Weighted Forecast"
              value={data.summary.weightedForecast}
              icon={<TrendingUpIcon className="size-4 text-muted-foreground" />}
            />
            <MetricCard
              title="This Month"
              value={data.summary.expectedThisMonth}
              icon={<CalendarIcon className="size-4 text-muted-foreground" />}
            />
            <MetricCard
              title="This Quarter"
              value={data.summary.expectedThisQuarter}
              icon={<BarChart3Icon className="size-4 text-muted-foreground" />}
            />
          </div>

          {/* Forecast Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Forecast by Month</CardTitle>
            </CardHeader>
            <CardContent>
              {data.byMonth.some(m => m.expectedValue > 0 || m.weightedValue > 0) ? (
                <AreaChart
                  data={data.byMonth}
                  xKey="month"
                  areas={[
                    { dataKey: "expectedValue", name: "Expected Value", color: "#94a3b8", fillOpacity: 0.2 },
                    { dataKey: "weightedValue", name: "Weighted Value", color: "#3b82f6", fillOpacity: 0.4 },
                  ]}
                  height={300}
                  showLegend
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  No forecast data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Probability Bands */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Value by Probability Band</CardTitle>
            </CardHeader>
            <CardContent>
              {data.byProbabilityBand.some(b => b.dealCount > 0) ? (
                <BarChart
                  data={data.byProbabilityBand.map(b => ({
                    name: b.band,
                    value: b.totalValue,
                    color: bandColors[b.band] || "#64748b",
                  }))}
                  xKey="name"
                  bars={[{ dataKey: "value", name: "Value", color: "#3b82f6" }]}
                  height={250}
                  useDataColors
                />
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  No deals to display
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
