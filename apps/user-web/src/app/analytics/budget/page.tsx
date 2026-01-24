"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"
import { DashboardLayout } from "@/components/dashboard-layout"
import { MetricCard, ChartContainer, BarChart } from "@/components/charts"
import { DateRangePicker } from "@/components/analytics/date-range-picker"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Download, Target, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"

interface BudgetComparisonData {
  period: { startDate: string; endDate: string }
  summary: {
    totalBudgeted: number
    totalActual: number
    totalVariance: number
    variancePercent: number
    budgetCount: number
    overBudgetCount: number
    underBudgetCount: number
  }
  comparison: {
    budgetId: string
    categoryId: string
    categoryName: string
    categoryColor: string
    budgetAmount: number
    actualAmount: number
    variance: number
    variancePercent: number
    utilizationPercent: number
    status: "over" | "warning" | "under"
  }[]
}

export default function BudgetVsActualPage() {
  const [data, setData] = useState<BudgetComparisonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateRange?.from) params.set("startDate", format(dateRange.from, "yyyy-MM-dd"))
      if (dateRange?.to) params.set("endDate", format(dateRange.to, "yyyy-MM-dd"))
      
      const response = await fetch(`/api/analytics/budget-vs-actual?${params}`)
      if (!response.ok) throw new Error("Failed to fetch")
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("Failed to fetch budget comparison:", error)
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
      ["Budget vs Actual Report"],
      [`Period: ${data.period.startDate} to ${data.period.endDate}`],
      [],
      ["Summary"],
      ["Total Budgeted", data.summary.totalBudgeted.toString()],
      ["Total Actual", data.summary.totalActual.toString()],
      ["Total Variance", data.summary.totalVariance.toString()],
      [],
      ["BY CATEGORY"],
      ["Category", "Budget", "Actual", "Variance", "Variance %", "Status"],
      ...data.comparison.map(c => [
        c.categoryName,
        c.budgetAmount.toString(),
        c.actualAmount.toString(),
        c.variance.toString(),
        c.variancePercent.toFixed(1) + "%",
        c.status,
      ]),
    ]

    const csv = rows.map(row => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `budget-vs-actual-${data.period.startDate}-${data.period.endDate}.csv`
    a.click()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "over":
        return <Badge variant="destructive">Over Budget</Badge>
      case "warning":
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Near Limit</Badge>
      default:
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Under Budget</Badge>
    }
  }

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return "bg-rose-500"
    if (percent >= 80) return "bg-amber-500"
    return "bg-emerald-500"
  }

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Analytics", href: "/analytics" },
        { label: "Budget vs Actual" },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Budget vs Actual</h1>
            <p className="text-muted-foreground">
              Compare your budgets against actual spending
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
                title="Total Budgeted"
                value={data?.summary.totalBudgeted || 0}
                icon={<Target className="h-4 w-4 text-primary" />}
              />
              <MetricCard
                title="Total Spent"
                value={data?.summary.totalActual || 0}
                icon={<TrendingDown className="h-4 w-4 text-rose-600" />}
                valueClassName="text-rose-600"
              />
              <MetricCard
                title="Remaining"
                value={data?.summary.totalVariance || 0}
                icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
                valueClassName={(data?.summary.totalVariance || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}
              />
              <MetricCard
                title="Over Budget"
                value={`${data?.summary.overBudgetCount || 0} of ${data?.summary.budgetCount || 0}`}
                icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
              />
            </>
          )}
        </div>

        {/* Comparison Chart */}
        <ChartContainer
          title="Budget vs Actual by Category"
          description="Side-by-side comparison"
        >
          {loading ? (
            <Skeleton className="h-[350px]" />
          ) : data?.comparison.length ? (
            <BarChart
              data={data.comparison.map(c => ({
                name: c.categoryName,
                budget: c.budgetAmount,
                actual: c.actualAmount,
              }))}
              xKey="name"
              bars={[
                { dataKey: "budget", name: "Budget", color: "#94a3b8" },
                { dataKey: "actual", name: "Actual", color: "#3b82f6" },
              ]}
              height={350}
              showLegend
            />
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              No budgets configured. Create budgets in the Budgets section.
            </div>
          )}
        </ChartContainer>

        {/* Detailed Comparison Table */}
        <ChartContainer title="Detailed Comparison">
          {loading ? (
            <Skeleton className="h-[400px]" />
          ) : data?.comparison.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="w-[200px]">Progress</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.comparison.map((row) => (
                  <TableRow key={row.budgetId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: row.categoryColor }}
                        />
                        <span className="font-medium">{row.categoryName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.budgetAmount)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(row.actualAmount)}
                    </TableCell>
                    <TableCell className={`text-right ${row.variance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {row.variance >= 0 ? "+" : ""}{formatCurrency(row.variance)}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({row.variancePercent >= 0 ? "+" : ""}{row.variancePercent.toFixed(0)}%)
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress 
                          value={Math.min(row.utilizationPercent, 100)} 
                          className={`h-2 ${getProgressColor(row.utilizationPercent)}`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {row.utilizationPercent.toFixed(0)}% used
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(data.summary.totalBudgeted)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(data.summary.totalActual)}
                  </TableCell>
                  <TableCell className={`text-right ${data.summary.totalVariance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {data.summary.totalVariance >= 0 ? "+" : ""}{formatCurrency(data.summary.totalVariance)}
                  </TableCell>
                  <TableCell>
                    <Progress 
                      value={Math.min((data.summary.totalActual / data.summary.totalBudgeted) * 100, 100)} 
                      className="h-2"
                    />
                  </TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="font-medium mb-2">No budgets configured</p>
              <p className="text-sm">Create budgets in the Budgets section to start tracking.</p>
            </div>
          )}
        </ChartContainer>
      </div>
    </DashboardLayout>
  )
}

