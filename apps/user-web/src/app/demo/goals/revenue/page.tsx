"use client"

import { useDemoData } from "@/providers"
import { DemoDashboardLayout } from "@/components/demo/demo-dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { format } from "date-fns"
import { TrendingUp, Target, Calendar, DollarSign } from "lucide-react"

export default function DemoRevenueGoalPage() {
  const { goals, overview } = useDemoData()

  const revenueGoal = goals.find(g => g.type === 'revenue')

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (!revenueGoal) {
    return (
      <DemoDashboardLayout breadcrumbs={[{ label: "Goals", href: "/demo/goals" }, { label: "Revenue" }]}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">No revenue goal found</p>
        </div>
      </DemoDashboardLayout>
    )
  }

  const progress = (revenueGoal.current_amount / revenueGoal.target_amount) * 100
  const remaining = revenueGoal.target_amount - revenueGoal.current_amount
  const daysRemaining = Math.ceil((new Date(revenueGoal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  return (
    <DemoDashboardLayout breadcrumbs={[{ label: "Goals", href: "/demo/goals" }, { label: "Revenue Goal" }]}>
      <div className="space-y-6">
        {/* Hero */}
        <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-white text-xl">{revenueGoal.name}</CardTitle>
                <CardDescription className="text-white/70">
                  Due {format(new Date(revenueGoal.target_date), 'MMMM d, yyyy')}
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Current</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(revenueGoal.current_amount)}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Target</CardTitle>
              <Target className="h-4 w-4 text-brand-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(revenueGoal.target_amount)}</div>
              <p className="text-xs text-muted-foreground">Monthly goal</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{formatCurrency(remaining)}</div>
              <p className="text-xs text-muted-foreground">To reach goal</p>
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

        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over time</CardDescription>
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

