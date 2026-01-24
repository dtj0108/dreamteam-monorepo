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
import { Download, TrendingDown, Receipt, Layers, CalendarDays } from "lucide-react"

interface ExpenseData {
  period: { startDate: string; endDate: string }
  summary: {
    totalExpenses: number
    transactionCount: number
    categoryCount: number
    avgDaily: number
    avgMonthly: number
  }
  byCategory: { id: string; name: string; amount: number; color: string; count: number }[]
  topCategories: { id: string; name: string; amount: number; color: string; count: number }[]
  monthlyTrend: { month: string; label: string; amount: number }[]
}

export default function ExpensesPage() {
  const [data, setData] = useState<ExpenseData | null>(null)
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
      
      const response = await fetch(`/api/analytics/expenses?${params}`)
      if (!response.ok) throw new Error("Failed to fetch")
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("Failed to fetch expenses:", error)
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
      ["Expense Report"],
      [`Period: ${data.period.startDate} to ${data.period.endDate}`],
      [],
      ["Summary"],
      ["Total Expenses", data.summary.totalExpenses.toString()],
      ["Transaction Count", data.summary.transactionCount.toString()],
      ["Avg Daily", data.summary.avgDaily.toFixed(2)],
      ["Avg Monthly", data.summary.avgMonthly.toFixed(2)],
      [],
      ["BY CATEGORY"],
      ["Category", "Amount", "Transactions", "% of Total"],
      ...data.byCategory.map(c => [
        c.name,
        c.amount.toString(),
        c.count.toString(),
        ((c.amount / data.summary.totalExpenses) * 100).toFixed(1) + "%",
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
    a.download = `expenses-${data.period.startDate}-${data.period.endDate}.csv`
    a.click()
  }

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Analytics", href: "/analytics" },
        { label: "Expense Analysis" },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Expense Analysis</h1>
            <p className="text-muted-foreground">
              Detailed breakdown of your business expenses
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
                title="Total Expenses"
                value={data?.summary.totalExpenses || 0}
                icon={<TrendingDown className="h-4 w-4 text-rose-600" />}
                valueClassName="text-rose-600"
              />
              <MetricCard
                title="Transactions"
                value={data?.summary.transactionCount || 0}
                icon={<Receipt className="h-4 w-4 text-muted-foreground" />}
              />
              <MetricCard
                title="Categories Used"
                value={data?.summary.categoryCount || 0}
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
          title="Monthly Expense Trend"
          description="Expenses over time"
        >
          {loading ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <AreaChart
              data={data?.monthlyTrend || []}
              xKey="label"
              areas={[{ dataKey: "amount", name: "Expenses", color: "#ef4444", fillOpacity: 0.4 }]}
              height={300}
            />
          )}
        </ChartContainer>

        {/* Category Breakdown */}
        <ChartContainer title="Top Expense Categories">
          {loading ? (
            <Skeleton className="h-[350px]" />
          ) : data?.topCategories.length ? (
            <BarChart
              data={data.topCategories.slice(0, 10)}
              xKey="name"
              bars={[{ dataKey: "amount", name: "Amount", color: "#ef4444" }]}
              height={350}
              layout="vertical"
              useDataColors
            />
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              No expense data for this period
            </div>
          )}
        </ChartContainer>

        {/* Full Category Table */}
        <ChartContainer title="All Expense Categories">
          {loading ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
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
                      {data.summary.totalExpenses > 0
                        ? ((cat.amount / data.summary.totalExpenses) * 100).toFixed(1)
                        : 0}%
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(cat.count > 0 ? cat.amount / cat.count : 0)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right text-rose-600">
                    {formatCurrency(data?.summary.totalExpenses || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {data?.summary.transactionCount || 0}
                  </TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(
                      (data?.summary.transactionCount || 0) > 0
                        ? (data?.summary.totalExpenses || 0) / (data?.summary.transactionCount || 1)
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

