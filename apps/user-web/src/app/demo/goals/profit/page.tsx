"use client"

import { useDemoData } from "@/providers"
import { DemoDashboardLayout } from "@/components/demo/demo-dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { format } from "date-fns"
import { Target, Calendar, DollarSign, TrendingUp } from "lucide-react"

export default function DemoProfitGoalPage() {
  const { goals, overview } = useDemoData()

  const profitGoal = goals.find(g => g.type === 'profit')

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (!profitGoal) {
    return (
      <DemoDashboardLayout breadcrumbs={[{ label: "Goals", href: "/demo/goals" }, { label: "Profit" }]}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">No profit goal found</p>
        </div>
      </DemoDashboardLayout>
    )
  }

  const progress = (profitGoal.current_amount / profitGoal.target_amount) * 100
  const remaining = profitGoal.target_amount - profitGoal.current_amount
  const daysRemaining = Math.ceil((new Date(profitGoal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  const profitMargin = overview.currentMonth.income > 0 
    ? ((overview.currentMonth.profit / overview.currentMonth.income) * 100).toFixed(1)
    : '0'

  return (
    <DemoDashboardLayout breadcrumbs={[{ label: "Goals", href: "/demo/goals" }, { label: "Profit Goal" }]}>
      <div className="space-y-6">
        {/* Hero */}
        <Card className="bg-gradient-to-br from-brand-600 to-brand-700 text-white">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-white text-xl">{profitGoal.name}</CardTitle>
                <CardDescription className="text-white/70">
                  Due {format(new Date(profitGoal.target_date), 'MMMM d, yyyy')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mt-4">
              <div className="flex justify-between text-white/80 text-sm mb-2">
                <span>Progress</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="h-3 bg-white/20 [&>div]:bg-white" />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Profit</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(profitGoal.current_amount)}</div>
              <p className="text-xs text-muted-foreground">Quarter to date</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Target</CardTitle>
              <Target className="h-4 w-4 text-brand-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(profitGoal.target_amount)}</div>
              <p className="text-xs text-muted-foreground">Quarterly goal</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Profit Margin</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profitMargin}%</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Days Left</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{daysRemaining}</div>
              <p className="text-xs text-muted-foreground">Until deadline</p>
            </CardContent>
          </Card>
        </div>

        {/* Profit Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Profit Trend</CardTitle>
            <CardDescription>Monthly net profit over time</CardDescription>
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

