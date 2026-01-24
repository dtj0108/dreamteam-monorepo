"use client"

import { useState } from "react"
import { DateRange } from "react-day-picker"
import { subDays } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ReportFilterBar } from "@/components/sales/reports/report-filter-bar"
import { MetricCard } from "@/components/charts/metric-card"
import { BarChart } from "@/components/charts/bar-chart"
import { PieChart } from "@/components/charts/pie-chart"
import { AreaChart } from "@/components/charts/area-chart"
import { useActivityReport } from "@/hooks/use-activity-report"
import { ActivityIcon, CheckCircleIcon, PercentIcon, CalendarIcon } from "lucide-react"

const typeColors: Record<string, string> = {
  call: "#3b82f6",
  email: "#22c55e",
  meeting: "#f59e0b",
  note: "#8b5cf6",
  task: "#ec4899",
}

const typeLabels: Record<string, string> = {
  call: "Calls",
  email: "Emails",
  meeting: "Meetings",
  note: "Notes",
  task: "Tasks",
}

function downloadActivityReportCSV(data: any) {
  const rows = [
    ["Metric", "Value"],
    ["Total Activities", data.summary.totalActivities],
    ["Completed", data.summary.completedCount],
    ["Completion Rate", `${data.summary.completionRate}%`],
    ["Avg Per Day", data.summary.avgPerDay],
    [],
    ["Type", "Count", "Completed"],
    ...data.byType.map((t: any) => [typeLabels[t.type] || t.type, t.count, t.completedCount]),
    [],
    ["Date", "Count"],
    ...data.byDay.map((d: any) => [d.date, d.count]),
  ]

  const csvContent = rows.map(row => row.join(",")).join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = `activity-report-${new Date().toISOString().split("T")[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function ActivityReportPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const { data, loading, error } = useActivityReport(dateRange)

  return (
    <div className="p-6">
      <ReportFilterBar
        title="Activity Report"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={() => data && downloadActivityReportCSV(data)}
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
          <Card className="animate-pulse">
            <div className="p-6">
              <div className="h-4 bg-muted rounded w-32 mb-4" />
              <div className="h-48 bg-muted rounded" />
            </div>
          </Card>
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
              title="Total Activities"
              value={data.summary.totalActivities.toString()}
              icon={<ActivityIcon className="size-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Completed"
              value={data.summary.completedCount.toString()}
              icon={<CheckCircleIcon className="size-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Completion Rate"
              value={`${data.summary.completionRate}%`}
              icon={<PercentIcon className="size-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Avg Per Day"
              value={data.summary.avgPerDay.toString()}
              icon={<CalendarIcon className="size-4 text-muted-foreground" />}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activities by Type</CardTitle>
              </CardHeader>
              <CardContent>
                {data.byType.some(t => t.count > 0) ? (
                  <BarChart
                    data={data.byType.map(t => ({
                      name: typeLabels[t.type] || t.type,
                      total: t.count,
                      completed: t.completedCount,
                      color: typeColors[t.type] || "#64748b",
                    }))}
                    xKey="name"
                    bars={[
                      { dataKey: "total", name: "Total", color: "#94a3b8" },
                      { dataKey: "completed", name: "Completed", color: "#22c55e" },
                    ]}
                    height={300}
                    showLegend
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    No activities found
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {data.byType.some(t => t.count > 0) ? (
                  <PieChart
                    data={data.byType
                      .filter(t => t.count > 0)
                      .map(t => ({
                        name: typeLabels[t.type] || t.type,
                        value: t.count,
                        color: typeColors[t.type] || "#64748b",
                      }))}
                    height={300}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    No activities to display
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {data.byDay.some(d => d.count > 0) ? (
                <AreaChart
                  data={data.byDay.map(d => ({
                    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    count: d.count,
                  }))}
                  xKey="date"
                  areas={[{ dataKey: "count", name: "Activities", color: "#3b82f6" }]}
                  height={250}
                  showLegend={false}
                />
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  No activity trend data
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
