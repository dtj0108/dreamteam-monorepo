"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useTrackReportView } from "@/hooks/use-track-report-view"
import { MetricCard, ChartContainer, BarChart, AreaChart } from "@/components/charts"
import { DateRangePicker } from "@/components/analytics/date-range-picker"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Download, TrendingUp, Receipt, Layers, CalendarDays } from "lucide-react"

interface IncomeData {
  period: { startDate: string; endDate: string }
  summary: {
    totalIncome: number
    transactionCount: number
    sourceCount: number
    avgDaily: number
    avgMonthly: number
  }
  byCategory: { id: string; name: string; amount: number; color: string; count: number }[]
  topSources: { id: string; name: string; amount: number; color: string; count: number }[]
  monthlyTrend: { month: string; label: string; amount: number }[]
}

export default function IncomePage() {
  const [data, setData] = useState<IncomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  // Track that user has viewed reports for onboarding
  useTrackReportView()

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateRange?.from) params.set("startDate", format(dateRange.from, "yyyy-MM-dd"))
      if (dateRange?.to) params.set("endDate", format(dateRange.to, "yyyy-MM-dd"))
      
      const response = await fetch(`/api/analytics/income?${params}`)
      if (!response.ok) throw new Error("Failed to fetch")
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("Failed to fetch income:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [dateRange])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const exportToCSV = () => {
    if (!data) return

    const rows = [
      ["Income Report"],
      [`Period: ${data.period.startDate} to ${data.period.endDate}`],
      [],
      ["Summary"],
      ["Total Income", data.summary.totalIncome.toString()],
      ["Transaction Count", data.summary.transactionCount.toString()],
      ["Avg Daily", data.summary.avgDaily.toFixed(2)],
      ["Avg Monthly", data.summary.avgMonthly.toFixed(2)],
      [],
      ["BY SOURCE"],
      ["Source", "Amount", "Transactions", "% of Total"],
      ...data.byCategory.map(c => [
        c.name,
        c.amount.toString(),
        c.count.toString(),
        ((c.amount / data.summary.totalIncome) * 100).toFixed(1) + "%",
      ]),
      [],
      ["MONTHLY TREND"],
      ["Month", "Amount"],
      ...data.monthlyTrend.map(m => [m.label, m.amount.toString()]),
    ]

    const csv = rows.map(row => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `income-${data.period.startDate}-${data.period.endDate}.csv`
    a.click()
  }

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Analytics", href: "/analytics" },
        { label: "Income Analysis" },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Income Analysis</h1>
            <p className="text-muted-foreground">
              Detailed breakdown of your revenue sources
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
            <Button variant="outline" onClick={exportToCSV} disabled={!data}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)
          ) : (
            <>
              <MetricCard
                title="Total Income"
                value={data?.summary.totalIncome || 0}
                icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
                valueClassName="text-emerald-600"
              />
              <MetricCard
                title="Transactions"
                value={data?.summary.transactionCount || 0}
                icon={<Receipt className="h-4 w-4 text-muted-foreground" />}
              />
              <MetricCard
                title="Revenue Sources"
                value={data?.summary.sourceCount || 0}
                icon={<Layers className="h-4 w-4 text-muted-foreground" />}
              />
              <MetricCard
                title="Avg Monthly"
                value={data?.summary.avgMonthly || 0}
                icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
              />
            </>
          )}
        </div>

        {/* Monthly Trend */}
        <ChartContainer
          title="Monthly Income Trend"
          description="Revenue over time"
        >
          {loading ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <AreaChart
              data={data?.monthlyTrend || []}
              xKey="label"
              areas={[{ dataKey: "amount", name: "Income", color: "#10b981", fillOpacity: 0.4 }]}
              height={300}
            />
          )}
        </ChartContainer>

        {/* Source Breakdown */}
        <ChartContainer title="Top Revenue Sources">
          {loading ? (
            <Skeleton className="h-[350px]" />
          ) : data?.topSources.length ? (
            <BarChart
              data={data.topSources.slice(0, 10)}
              xKey="name"
              bars={[{ dataKey: "amount", name: "Amount", color: "#10b981" }]}
              height={350}
              layout="vertical"
              useDataColors
            />
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              No income data for this period
            </div>
          )}
        </ChartContainer>

        {/* Full Source Table */}
        <ChartContainer title="All Revenue Sources">
          {loading ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                  <TableHead className="text-right">Avg per Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.byCategory.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(cat.amount)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {cat.count}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {data.summary.totalIncome > 0
                        ? ((cat.amount / data.summary.totalIncome) * 100).toFixed(1)
                        : 0}%
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(cat.count > 0 ? cat.amount / cat.count : 0)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right text-emerald-600">
                    {formatCurrency(data?.summary.totalIncome || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {data?.summary.transactionCount || 0}
                  </TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(
                      (data?.summary.transactionCount || 0) > 0
                        ? (data?.summary.totalIncome || 0) / (data?.summary.transactionCount || 1)
                        : 0
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </ChartContainer>
      </div>
    </DashboardLayout>
  )
}

