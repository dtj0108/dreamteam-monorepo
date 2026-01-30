"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BarChart3Icon,
  TrendingUpIcon,
  UsersIcon,
  DollarSignIcon,
  CalendarIcon,
  DownloadIcon,
  PlusIcon
} from "lucide-react"
import { MetricCard } from "@/components/charts/metric-card"
import { useSalesReports, ReportMetrics } from "@/hooks/use-sales-reports"
import { CustomReportDialog } from "@/components/sales/reports/custom-report-dialog"

const reportCards = [
  {
    title: "Sales Pipeline",
    description: "Overview of opportunities by stage",
    icon: TrendingUpIcon,
    href: "/sales/reports/pipeline",
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    title: "Lead Sources",
    description: "Where your leads are coming from",
    icon: UsersIcon,
    href: "/sales/reports/sources",
    color: "bg-emerald-500/10 text-emerald-500",
  },
  {
    title: "Revenue Forecast",
    description: "Projected revenue based on pipeline",
    icon: DollarSignIcon,
    href: "/sales/reports/forecast",
    color: "bg-purple-500/10 text-purple-500",
  },
  {
    title: "Activity Report",
    description: "Team activities and engagement",
    icon: CalendarIcon,
    href: "/sales/reports/activity",
    color: "bg-orange-500/10 text-orange-500",
  },
]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function downloadReportAsCSV(metrics: ReportMetrics) {
  const rows = [
    ["Metric", "Value", "Change"],
    ["Total Revenue", formatCurrency(metrics.totalRevenue), `${metrics.totalRevenueChange >= 0 ? "+" : ""}${metrics.totalRevenueChange}%`],
    ["Deals Closed", metrics.dealsClosed.toString(), `${metrics.dealsClosedChange >= 0 ? "+" : ""}${metrics.dealsClosedChange}`],
    ["New Leads", metrics.newLeads.toString(), `${metrics.newLeadsChange >= 0 ? "+" : ""}${metrics.newLeadsChange}`],
    ["Win Rate", `${metrics.winRate}%`, `${metrics.winRateChange >= 0 ? "+" : ""}${metrics.winRateChange}pp`],
  ]

  const csvContent = rows.map(row => row.join(",")).join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = `sales-report-${new Date().toISOString().split("T")[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const { metrics, loading, error } = useSalesReports()
  const [customReportOpen, setCustomReportOpen] = useState(false)

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Analyze your CRM data and track performance</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => metrics && downloadReportAsCSV(metrics)}
            disabled={!metrics || loading}
          >
            <DownloadIcon className="size-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setCustomReportOpen(true)}>
            <PlusIcon className="size-4 mr-2" />
            Custom Report
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="p-6">
                <div className="h-4 bg-muted rounded w-24 mb-4" />
                <div className="h-8 bg-muted rounded w-16 mb-2" />
                <div className="h-3 bg-muted rounded w-20" />
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="mb-8 p-6">
          <p className="text-destructive">Failed to load metrics: {error}</p>
        </Card>
      ) : metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Revenue"
            value={metrics.totalRevenue}
            change={metrics.totalRevenueChange}
            changeLabel="vs last month"
            icon={<DollarSignIcon className="size-4 text-muted-foreground" />}
          />
          <MetricCard
            title="Deals Closed"
            value={metrics.dealsClosed.toString()}
            change={metrics.dealsClosedChange !== 0 ? (metrics.dealsClosedChange / Math.max(1, metrics.dealsClosed - metrics.dealsClosedChange)) * 100 : 0}
            changeLabel={`${metrics.dealsClosedChange >= 0 ? "+" : ""}${metrics.dealsClosedChange} vs last month`}
            icon={<TrendingUpIcon className="size-4 text-muted-foreground" />}
          />
          <MetricCard
            title="New Leads"
            value={metrics.newLeads.toString()}
            change={metrics.newLeadsChange !== 0 ? (metrics.newLeadsChange / Math.max(1, metrics.newLeads - metrics.newLeadsChange)) * 100 : 0}
            changeLabel={`${metrics.newLeadsChange >= 0 ? "+" : ""}${metrics.newLeadsChange} vs last month`}
            icon={<UsersIcon className="size-4 text-muted-foreground" />}
          />
          <MetricCard
            title="Win Rate"
            value={`${metrics.winRate}%`}
            change={metrics.winRateChange}
            changeLabel="pp vs last month"
            icon={<BarChart3Icon className="size-4 text-muted-foreground" />}
          />
        </div>
      ) : null}

      {/* Report Cards */}
      <h2 className="text-lg font-semibold mb-4">Available Reports</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportCards.map((report) => (
          <Link key={report.title} href={report.href}>
            <Card className="cursor-pointer hover:bg-muted/50 hover:shadow-md transition-all h-full">
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`size-12 rounded-lg flex items-center justify-center ${report.color}`}>
                  <report.icon className="size-6" />
                </div>
                <div>
                  <h3 className="font-medium">{report.title}</h3>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <CustomReportDialog
        open={customReportOpen}
        onOpenChange={setCustomReportOpen}
      />
    </div>
  )
}
