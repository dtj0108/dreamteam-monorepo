"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useTrackReportView } from "@/hooks/use-track-report-view"
import { MetricCard, ChartContainer, BarChart } from "@/components/charts"
import { DateRangePicker } from "@/components/analytics/date-range-picker"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Download, DollarSign, TrendingUp, TrendingDown, Percent } from "lucide-react"

interface ProfitLossData {
  period: { startDate: string; endDate: string }
  summary: {
    totalIncome: number
    totalExpenses: number
    netProfit: number
    profitMargin: number
  }
  incomeByCategory: { name: string; amount: number; color: string }[]
  expensesByCategory: { name: string; amount: number; color: string }[]
  comparison: {
    income: { previous: number; change: number; percentChange: number }
    expenses: { previous: number; change: number; percentChange: number }
    netProfit: { previous: number; change: number; percentChange: number }
  } | null
}

export default function ProfitLossPage() {
  const [data, setData] = useState<ProfitLossData | null>(null)
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
      params.set("compare", "true")
      
      const response = await fetch(`/api/analytics/profit-loss?${params}`)
      if (!response.ok) throw new Error("Failed to fetch")
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("Failed to fetch P&L:", error)
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
      ["Profit & Loss Statement"],
      [`Period: ${data.period.startDate} to ${data.period.endDate}`],
      [],
      ["INCOME"],
      ["Category", "Amount"],
      ...data.incomeByCategory.map(c => [c.name, c.amount.toString()]),
      ["Total Income", data.summary.totalIncome.toString()],
      [],
      ["EXPENSES"],
      ["Category", "Amount"],
      ...data.expensesByCategory.map(c => [c.name, c.amount.toString()]),
      ["Total Expenses", data.summary.totalExpenses.toString()],
      [],
      ["NET PROFIT", data.summary.netProfit.toString()],
      ["Profit Margin", `${data.summary.profitMargin.toFixed(1)}%`],
    ]

    const csv = rows.map(row => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `profit-loss-${data.period.startDate}-${data.period.endDate}.csv`
    a.click()
  }

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Analytics", href: "/analytics" },
        { label: "Profit & Loss" },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Profit & Loss</h1>
            <p className="text-muted-foreground">
              Income statement for your business
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
                change={data?.comparison?.income.percentChange}
                changeLabel="vs previous period"
                icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
                valueClassName="text-emerald-600"
              />
              <MetricCard
                title="Total Expenses"
                value={data?.summary.totalExpenses || 0}
                change={data?.comparison?.expenses.percentChange}
                changeLabel="vs previous period"
                icon={<TrendingDown className="h-4 w-4 text-rose-600" />}
                trend={data?.comparison?.expenses.percentChange && data.comparison.expenses.percentChange > 0 ? "down" : "up"}
                valueClassName="text-rose-600"
              />
              <MetricCard
                title="Net Profit"
                value={data?.summary.netProfit || 0}
                change={data?.comparison?.netProfit.percentChange}
                changeLabel="vs previous period"
                icon={<DollarSign className="h-4 w-4 text-primary" />}
                valueClassName={(data?.summary.netProfit || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}
              />
              <MetricCard
                title="Profit Margin"
                value={`${(data?.summary.profitMargin || 0).toFixed(1)}%`}
                icon={<Percent className="h-4 w-4 text-muted-foreground" />}
              />
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartContainer title="Income by Category">
            {loading ? (
              <Skeleton className="h-[300px]" />
            ) : data?.incomeByCategory.length ? (
              <BarChart
                data={data.incomeByCategory.slice(0, 8)}
                xKey="name"
                bars={[{ dataKey: "amount", name: "Amount", color: "#10b981" }]}
                height={300}
                layout="vertical"
                useDataColors
              />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No income data for this period
              </div>
            )}
          </ChartContainer>

          <ChartContainer title="Expenses by Category">
            {loading ? (
              <Skeleton className="h-[300px]" />
            ) : data?.expensesByCategory.length ? (
              <BarChart
                data={data.expensesByCategory.slice(0, 8)}
                xKey="name"
                bars={[{ dataKey: "amount", name: "Amount", color: "#ef4444" }]}
                height={300}
                layout="vertical"
                useDataColors
              />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No expense data for this period
              </div>
            )}
          </ChartContainer>
        </div>

        {/* Detailed Tables */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Income Table */}
          <ChartContainer title="Income Breakdown">
            {loading ? (
              <Skeleton className="h-[200px]" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.incomeByCategory.map((cat) => (
                    <TableRow key={cat.name}>
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
                        {data.summary.totalIncome > 0
                          ? ((cat.amount / data.summary.totalIncome) * 100).toFixed(1)
                          : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total Income</TableCell>
                    <TableCell className="text-right text-emerald-600">
                      {formatCurrency(data?.summary.totalIncome || 0)}
                    </TableCell>
                    <TableCell className="text-right">100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </ChartContainer>

          {/* Expenses Table */}
          <ChartContainer title="Expenses Breakdown">
            {loading ? (
              <Skeleton className="h-[200px]" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.expensesByCategory.map((cat) => (
                    <TableRow key={cat.name}>
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
                        {data.summary.totalExpenses > 0
                          ? ((cat.amount / data.summary.totalExpenses) * 100).toFixed(1)
                          : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total Expenses</TableCell>
                    <TableCell className="text-right text-rose-600">
                      {formatCurrency(data?.summary.totalExpenses || 0)}
                    </TableCell>
                    <TableCell className="text-right">100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </ChartContainer>
        </div>

        {/* Net Profit Summary */}
        <div className="rounded-lg border p-6 bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Net Profit / (Loss)</h3>
              <p className="text-sm text-muted-foreground">
                Total Income - Total Expenses
              </p>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${(data?.summary.netProfit || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {formatCurrency(data?.summary.netProfit || 0)}
              </div>
              {data?.comparison?.netProfit && (
                <Badge variant={data.comparison.netProfit.change >= 0 ? "default" : "destructive"}>
                  {data.comparison.netProfit.change >= 0 ? "+" : ""}
                  {formatCurrency(data.comparison.netProfit.change)} vs previous
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

