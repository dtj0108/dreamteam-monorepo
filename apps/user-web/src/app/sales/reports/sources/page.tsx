"use client"

import { useState } from "react"
import { DateRange } from "react-day-picker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ReportFilterBar } from "@/components/sales/reports/report-filter-bar"
import { MetricCard } from "@/components/charts/metric-card"
import { BarChart } from "@/components/charts/bar-chart"
import { PieChart } from "@/components/charts/pie-chart"
import { useSourcesReport } from "@/hooks/use-sources-report"
import { UsersIcon, StarIcon, PercentIcon, TrendingUpIcon } from "lucide-react"

const sourceColors = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#64748b", // slate
]

function downloadSourcesReportCSV(data: any) {
  const rows = [
    ["Metric", "Value"],
    ["Total Leads", data.summary.totalLeads],
    ["Top Source", data.summary.topSource],
    ["Conversion Rate", `${data.summary.conversionRate}%`],
    [],
    ["Source", "Lead Count", "Converted", "Conversion Rate"],
    ...data.bySource.map((s: any) => [
      s.source,
      s.leadCount,
      s.convertedCount,
      `${s.conversionRate}%`,
    ]),
  ]

  const csvContent = rows.map(row => row.join(",")).join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = `sources-report-${new Date().toISOString().split("T")[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function SourcesReportPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const { data, loading, error } = useSourcesReport(dateRange)

  return (
    <div className="p-6">
      <ReportFilterBar
        title="Lead Sources Report"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={() => data && downloadSourcesReportCSV(data)}
        exportDisabled={!data || loading}
      />

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Total Leads"
              value={data.summary.totalLeads.toString()}
              icon={<UsersIcon className="size-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Top Source"
              value={data.summary.topSource}
              icon={<StarIcon className="size-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Conversion Rate"
              value={`${data.summary.conversionRate}%`}
              icon={<PercentIcon className="size-4 text-muted-foreground" />}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leads by Source</CardTitle>
              </CardHeader>
              <CardContent>
                {data.bySource.length > 0 ? (
                  <BarChart
                    data={data.bySource.map((s, i) => ({
                      name: s.source,
                      leads: s.leadCount,
                      converted: s.convertedCount,
                      color: sourceColors[i % sourceColors.length],
                    }))}
                    xKey="name"
                    bars={[
                      { dataKey: "leads", name: "Total Leads", color: "#3b82f6" },
                      { dataKey: "converted", name: "Converted", color: "#22c55e" },
                    ]}
                    height={300}
                    showLegend
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    No leads found
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Source Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {data.bySource.length > 0 ? (
                  <PieChart
                    data={data.bySource.map((s, i) => ({
                      name: s.source,
                      value: s.leadCount,
                      color: sourceColors[i % sourceColors.length],
                    }))}
                    height={300}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    No leads to display
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
