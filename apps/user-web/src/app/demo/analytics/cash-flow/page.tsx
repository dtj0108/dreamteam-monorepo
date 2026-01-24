"use client"

import { useDemoData } from "@/providers"
import { DemoDashboardLayout } from "@/components/demo/demo-dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownIcon, ArrowUpIcon, TrendingUp } from "lucide-react"

export default function DemoCashFlowPage() {
  const { cashFlow, overview } = useDemoData()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <DemoDashboardLayout breadcrumbs={[{ label: "Analytics", href: "/demo/analytics" }, { label: "Cash Flow" }]}>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Inflow</CardTitle>
              <ArrowUpIcon className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(cashFlow.summary.totalInflow)}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Outflow</CardTitle>
              <ArrowDownIcon className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">{formatCurrency(cashFlow.summary.totalOutflow)}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Cash Flow</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${cashFlow.summary.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(cashFlow.summary.netCashFlow)}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Monthly Net</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(cashFlow.summary.averageMonthlyInflow - cashFlow.summary.averageMonthlyOutflow)}
              </div>
              <p className="text-xs text-muted-foreground">Per month</p>
            </CardContent>
          </Card>
        </div>

        {/* Cash Flow Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Cash Flow Over Time</CardTitle>
            <CardDescription>Monthly inflows vs outflows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-4 px-4">
              {cashFlow.trend.map((month, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex gap-1 items-end justify-center h-52">
                    <div 
                      className="w-6 bg-emerald-500 rounded-t"
                      style={{ height: `${(month.income / 100000) * 100}%` }}
                      title={`Inflow: ${formatCurrency(month.income)}`}
                    />
                    <div 
                      className="w-6 bg-rose-500 rounded-t"
                      style={{ height: `${(month.expenses / 100000) * 100}%` }}
                      title={`Outflow: ${formatCurrency(month.expenses)}`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{month.label}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-emerald-500 rounded" />
                <span className="text-sm text-muted-foreground">Cash Inflow</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-rose-500 rounded" />
                <span className="text-sm text-muted-foreground">Cash Outflow</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Breakdown</CardTitle>
            <CardDescription>Detailed cash flow by month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cashFlow.trend.map((month, i) => {
                const netFlow = month.income - month.expenses
                return (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="font-medium">{month.label}</div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Inflow</p>
                        <p className="font-medium text-emerald-600">{formatCurrency(month.income)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Outflow</p>
                        <p className="font-medium text-rose-600">{formatCurrency(month.expenses)}</p>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className="text-xs text-muted-foreground">Net</p>
                        <p className={`font-bold ${netFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatCurrency(netFlow)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DemoDashboardLayout>
  )
}

