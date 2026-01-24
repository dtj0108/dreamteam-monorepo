"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useTrackReportView } from "@/hooks/use-track-report-view"
import { MetricCard, ChartContainer, AreaChart, BarChart } from "@/components/charts"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  FileText,
  PieChart,
  BarChart3,
  ArrowRight,
} from "lucide-react"

interface OverviewData {
  currentMonth: {
    income: number
    expenses: number
    profit: number
  }
  lastMonth: {
    income: number
    expenses: number
    profit: number
  }
  changes: {
    income: number
    expenses: number
    profit: number
  }
  totalBalance: number
  accountCount: number
  trend: {
    month: string
    label: string
    income: number
    expenses: number
    profit: number
  }[]
}

const reportLinks = [
  {
    title: "Profit & Loss",
    description: "Income vs expenses breakdown",
    href: "/analytics/profit-loss",
    icon: FileText,
  },
  {
    title: "Expense Analysis",
    description: "Spending by category",
    href: "/analytics/expenses",
    icon: PieChart,
  },
  {
    title: "Income Analysis",
    description: "Revenue sources and trends",
    href: "/analytics/income",
    icon: TrendingUp,
  },
  {
    title: "Cash Flow",
    description: "Money in vs money out",
    href: "/analytics/cash-flow",
    icon: BarChart3,
  },
]

export default function AnalyticsPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  // Track that user has viewed reports for onboarding
  useTrackReportView()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/analytics/overview")
        if (!response.ok) throw new Error("Failed to fetch")
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error("Failed to fetch analytics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <DashboardLayout breadcrumbs={[{ label: "Analytics" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Overview of your business financial performance
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </>
          ) : (
            <>
              <MetricCard
                title="Monthly Income"
                value={data?.currentMonth.income || 0}
                change={data?.changes.income}
                changeLabel="vs last month"
                icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
                valueClassName="text-emerald-600"
              />
              <MetricCard
                title="Monthly Expenses"
                value={data?.currentMonth.expenses || 0}
                change={data?.changes.expenses}
                changeLabel="vs last month"
                icon={<TrendingDown className="h-4 w-4 text-rose-600" />}
                trend={data?.changes.expenses && data.changes.expenses > 0 ? "down" : "up"}
                valueClassName="text-rose-600"
              />
              <MetricCard
                title="Net Profit"
                value={data?.currentMonth.profit || 0}
                change={data?.changes.profit}
                changeLabel="vs last month"
                icon={<DollarSign className="h-4 w-4 text-primary" />}
                valueClassName={data?.currentMonth.profit && data.currentMonth.profit >= 0 ? "text-emerald-600" : "text-rose-600"}
              />
              <MetricCard
                title="Total Balance"
                value={data?.totalBalance || 0}
                icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
              />
            </>
          )}
        </div>

        {/* 6-Month Trend Chart */}
        <ChartContainer
          title="Income vs Expenses Trend"
          description="Last 6 months performance"
        >
          {loading ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <AreaChart
              data={data?.trend || []}
              xKey="label"
              areas={[
                { dataKey: "income", name: "Income", color: "#10b981" },
                { dataKey: "expenses", name: "Expenses", color: "#ef4444" },
              ]}
              height={300}
            />
          )}
        </ChartContainer>

        {/* Net Profit Trend */}
        <ChartContainer
          title="Net Profit by Month"
          description="Monthly profit/loss"
        >
          {loading ? (
            <Skeleton className="h-[250px]" />
          ) : (
            <BarChart
              data={(data?.trend || []).map(t => ({
                ...t,
                profit: t.profit,
                color: t.profit >= 0 ? "#10b981" : "#ef4444",
              }))}
              xKey="label"
              bars={[{ dataKey: "profit", name: "Net Profit", color: "#3b82f6" }]}
              height={250}
              useDataColors
            />
          )}
        </ChartContainer>

        {/* Quick Links to Reports */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Reports</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {reportLinks.map((report) => (
              <Link key={report.href} href={report.href}>
                <div className="rounded-lg border p-4 hover:bg-muted/50 transition-colors h-full">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-md bg-primary/10">
                      <report.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-medium">{report.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {report.description}
                  </p>
                  <div className="flex items-center text-sm text-primary">
                    View report <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

