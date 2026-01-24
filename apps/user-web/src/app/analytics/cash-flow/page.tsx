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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Download, ArrowDownLeft, ArrowUpRight, Activity, TrendingUp } from "lucide-react"

interface CashFlowData {
  period: { startDate: string; endDate: string; groupBy: string }
  summary: {
    totalInflow: number
    totalOutflow: number
    netCashFlow: number
    avgMonthlyInflow: number
    avgMonthlyOutflow: number
  }
  trend: {
    period: string
    label: string
    inflow: number
    outflow: number
    netFlow: number
    runningBalance: number
  }[]
}

export default function CashFlowPage() {
  const [data, setData] = useState<CashFlowData | null>(null)
  const [loading, setLoading] = useState(true)
  const [groupBy, setGroupBy] = useState<string>("month")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  // Track that user has viewed reports for onboarding
  useTrackReportView()

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateRange?.from) params.set("startDate", format(dateRange.from, "yyyy-MM-dd"))
      if (dateRange?.to) params.set("endDate", format(dateRange.to, "yyyy-MM-dd"))
      params.set("groupBy", groupBy)
      
      const response = await fetch(`/api/analytics/cash-flow?${params}`)
      if (!response.ok) throw new Error("Failed to fetch")
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("Failed to fetch cash flow:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [dateRange, groupBy])

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
      ["Cash Flow Report"],
      [`Period: ${data.period.startDate} to ${data.period.endDate}`],
      [`Grouped by: ${data.period.groupBy}`],
      [],
      ["Summary"],
      ["Total Inflow", data.summary.totalInflow.toString()],
      ["Total Outflow", data.summary.totalOutflow.toString()],
      ["Net Cash Flow", data.summary.netCashFlow.toString()],
      [],
      ["CASH FLOW BY PERIOD"],
      ["Period", "Inflow", "Outflow", "Net Flow", "Running Balance"],
      ...data.trend.map(t => [
        t.label,
        t.inflow.toString(),
        t.outflow.toString(),
        t.netFlow.toString(),
        t.runningBalance.toString(),
      ]),
    ]

    const csv = rows.map(row => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `cash-flow-${data.period.startDate}-${data.period.endDate}.csv`
    a.click()
  }

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Analytics", href: "/analytics" },
        { label: "Cash Flow" },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cash Flow</h1>
            <p className="text-muted-foreground">
              Track money flowing in and out of your business
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
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
                title="Total Inflow"
                value={data?.summary.totalInflow || 0}
                icon={<ArrowDownLeft className="h-4 w-4 text-emerald-600" />}
                valueClassName="text-emerald-600"
              />
              <MetricCard
                title="Total Outflow"
                value={data?.summary.totalOutflow || 0}
                icon={<ArrowUpRight className="h-4 w-4 text-rose-600" />}
                valueClassName="text-rose-600"
              />
              <MetricCard
                title="Net Cash Flow"
                value={data?.summary.netCashFlow || 0}
                icon={<Activity className="h-4 w-4 text-primary" />}
                valueClassName={(data?.summary.netCashFlow || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}
              />
              <MetricCard
                title="Avg Monthly Net"
                value={(data?.summary.avgMonthlyInflow || 0) - (data?.summary.avgMonthlyOutflow || 0)}
                icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
              />
            </>
          )}
        </div>

        {/* Cash Flow Chart */}
        <ChartContainer
          title="Cash Flow Over Time"
          description="Inflow vs outflow by period"
        >
          {loading ? (
            <Skeleton className="h-[350px]" />
          ) : (
            <BarChart
              data={(data?.trend || []).map(t => ({
                ...t,
                inflow: t.inflow,
                outflow: -t.outflow, // Show outflow as negative for comparison
              }))}
              xKey="label"
              bars={[
                { dataKey: "inflow", name: "Inflow", color: "#10b981" },
                { dataKey: "outflow", name: "Outflow", color: "#ef4444" },
              ]}
              height={350}
              showLegend
            />
          )}
        </ChartContainer>

        {/* Net Flow & Running Balance */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartContainer title="Net Cash Flow by Period">
            {loading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <BarChart
                data={(data?.trend || []).map(t => ({
                  ...t,
                  color: t.netFlow >= 0 ? "#10b981" : "#ef4444",
                }))}
                xKey="label"
                bars={[{ dataKey: "netFlow", name: "Net Flow", color: "#3b82f6" }]}
                height={300}
                useDataColors
              />
            )}
          </ChartContainer>

          <ChartContainer title="Cumulative Cash Position">
            {loading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <AreaChart
                data={data?.trend || []}
                xKey="label"
                areas={[{ 
                  dataKey: "runningBalance", 
                  name: "Running Balance", 
                  color: "#3b82f6",
                  fillOpacity: 0.3,
                }]}
                height={300}
              />
            )}
          </ChartContainer>
        </div>

        {/* Detailed Table */}
        <ChartContainer title="Cash Flow Details">
          {loading ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Inflow</TableHead>
                  <TableHead className="text-right">Outflow</TableHead>
                  <TableHead className="text-right">Net Flow</TableHead>
                  <TableHead className="text-right">Running Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.trend.map((row) => (
                  <TableRow key={row.period}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right text-emerald-600">
                      +{formatCurrency(row.inflow)}
                    </TableCell>
                    <TableCell className="text-right text-rose-600">
                      -{formatCurrency(row.outflow)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${row.netFlow >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {row.netFlow >= 0 ? "+" : ""}{formatCurrency(row.netFlow)}
                    </TableCell>
                    <TableCell className={`text-right ${row.runningBalance >= 0 ? "" : "text-rose-600"}`}>
                      {formatCurrency(row.runningBalance)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right text-emerald-600">
                    +{formatCurrency(data?.summary.totalInflow || 0)}
                  </TableCell>
                  <TableCell className="text-right text-rose-600">
                    -{formatCurrency(data?.summary.totalOutflow || 0)}
                  </TableCell>
                  <TableCell className={`text-right ${(data?.summary.netCashFlow || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {(data?.summary.netCashFlow || 0) >= 0 ? "+" : ""}{formatCurrency(data?.summary.netCashFlow || 0)}
                  </TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </ChartContainer>
      </div>
    </DashboardLayout>
  )
}

