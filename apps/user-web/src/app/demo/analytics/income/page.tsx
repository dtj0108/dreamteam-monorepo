"use client"

import { useDemoData } from "@/providers"
import { DemoDashboardLayout } from "@/components/demo/demo-dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

export default function DemoIncomePage() {
  const { overview, incomeByCategory, transactions } = useDemoData()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const incomeTransactions = transactions.filter(tx => tx.amount > 0)
  const totalIncome = incomeByCategory.reduce((sum, cat) => sum + cat.total, 0)

  return (
    <DemoDashboardLayout breadcrumbs={[{ label: "Analytics", href: "/demo/analytics" }, { label: "Income" }]}>
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalIncome)}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(overview.currentMonth.income)}</div>
              <p className="text-xs text-muted-foreground">Current period</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{incomeTransactions.length}</div>
              <p className="text-xs text-muted-foreground">Income entries</p>
            </CardContent>
          </Card>
        </div>

        {/* Income by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Income by Source</CardTitle>
            <CardDescription>Breakdown of revenue streams</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {incomeByCategory.map((category) => {
                const percentage = (category.total / totalIncome) * 100
                return (
                  <div key={category.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{formatCurrency(category.total)}</span>
                        <span className="text-muted-foreground ml-2">({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="h-3 rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${percentage}%`, backgroundColor: category.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Income Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Income Trend</CardTitle>
            <CardDescription>Monthly income over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end justify-between gap-2 px-4">
              {overview.trend.map((month, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-emerald-500 rounded-t min-h-[4px]"
                    style={{ height: `${(month.income / 100000) * 100}%` }}
                    title={formatCurrency(month.income)}
                  />
                  <span className="text-xs text-muted-foreground">{month.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DemoDashboardLayout>
  )
}

