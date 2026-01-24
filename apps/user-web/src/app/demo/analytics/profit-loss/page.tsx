"use client"

import { useDemoData } from "@/providers"
import { DemoDashboardLayout } from "@/components/demo/demo-dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react"

export default function DemoProfitLossPage() {
  const { profitLoss, overview, expensesByCategory, incomeByCategory } = useDemoData()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const totalIncome = incomeByCategory.reduce((sum, cat) => sum + cat.total, 0)
  const totalExpenses = expensesByCategory.reduce((sum, cat) => sum + cat.total, 0)
  const netProfit = totalIncome - totalExpenses
  const margin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0'

  return (
    <DemoDashboardLayout breadcrumbs={[{ label: "Analytics", href: "/demo/analytics" }, { label: "Profit & Loss" }]}>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalIncome)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">{formatCurrency(totalExpenses)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(netProfit)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Profit Margin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${Number(margin) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {margin}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* P&L Statement */}
        <Card>
          <CardHeader>
            <CardTitle>Profit & Loss Statement</CardTitle>
            <CardDescription>Financial summary for the period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Revenue Section */}
              <div>
                <h3 className="font-semibold text-lg mb-3 text-emerald-600">Revenue</h3>
                <div className="space-y-2 pl-4 border-l-2 border-emerald-200">
                  {incomeByCategory.map((category) => (
                    <div key={category.name} className="flex justify-between">
                      <span className="text-muted-foreground">{category.name}</span>
                      <span className="font-medium">{formatCurrency(category.total)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t font-semibold">
                    <span>Total Revenue</span>
                    <span className="text-emerald-600">{formatCurrency(totalIncome)}</span>
                  </div>
                </div>
              </div>

              {/* Expenses Section */}
              <div>
                <h3 className="font-semibold text-lg mb-3 text-rose-600">Expenses</h3>
                <div className="space-y-2 pl-4 border-l-2 border-rose-200">
                  {expensesByCategory.map((category) => (
                    <div key={category.name} className="flex justify-between">
                      <span className="text-muted-foreground">{category.name}</span>
                      <span className="font-medium">({formatCurrency(category.total)})</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t font-semibold">
                    <span>Total Expenses</span>
                    <span className="text-rose-600">({formatCurrency(totalExpenses)})</span>
                  </div>
                </div>
              </div>

              {/* Net Profit */}
              <div className="pt-4 border-t-2">
                <div className="flex justify-between text-xl font-bold">
                  <span>Net Profit</span>
                  <span className={netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {formatCurrency(netProfit)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trend</CardTitle>
            <CardDescription>Profit over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end justify-between gap-2 px-4">
              {overview.trend.map((month, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className={`w-full rounded-t min-h-[4px] ${month.profit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ height: `${Math.abs(month.profit / 50000) * 100}%` }}
                    title={formatCurrency(month.profit)}
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

