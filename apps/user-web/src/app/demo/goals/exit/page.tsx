"use client"

import { useDemoData } from "@/providers"
import { DemoDashboardLayout } from "@/components/demo/demo-dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { CheckCircle2, Circle, Target, TrendingUp, DollarSign, Calendar } from "lucide-react"

export default function DemoExitPlanPage() {
  const { exitPlan, overview } = useDemoData()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const exitProgress = (exitPlan.current_valuation / exitPlan.target_valuation) * 100
  const completedMilestones = exitPlan.milestones.filter(m => m.completed).length
  const monthlyRecurringRevenue = overview.currentMonth.income
  const annualRecurringRevenue = exitPlan.current_arr
  const profitMargin = overview.currentMonth.income > 0 
    ? ((overview.currentMonth.profit / overview.currentMonth.income) * 100).toFixed(1)
    : '0'

  return (
    <DemoDashboardLayout breadcrumbs={[{ label: "Goals", href: "/demo/goals" }, { label: "Exit Plan" }]}>
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="md:col-span-2 bg-gradient-to-br from-brand-600 to-brand-700 text-white">
            <CardHeader>
              <CardTitle className="text-white/80 text-sm font-normal">Target Valuation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{formatCurrency(exitPlan.target_valuation)}</div>
              <p className="text-white/70 mt-1">
                {exitPlan.target_multiple}x ARR multiple • Due {format(new Date(exitPlan.target_date), 'MMMM yyyy')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Valuation</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(exitPlan.current_valuation)}</div>
              <p className="text-xs text-muted-foreground">{exitProgress.toFixed(1)}% of target</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Gap to Close</CardTitle>
              <Target className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {formatCurrency(exitPlan.target_valuation - exitPlan.current_valuation)}
              </div>
              <p className="text-xs text-muted-foreground">Remaining to goal</p>
            </CardContent>
          </Card>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Recurring Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(monthlyRecurringRevenue)}</div>
              <p className="text-xs text-emerald-500">↑ Growing month over month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Annual Recurring Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(annualRecurringRevenue)}</div>
              <p className="text-xs text-muted-foreground">MRR × 12</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Profit Margin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profitMargin}%</div>
              <p className="text-xs text-emerald-500">Healthy margin</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Multiple</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{exitPlan.target_multiple}x</div>
              <p className="text-xs text-muted-foreground">Industry standard</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress & Milestones */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Valuation Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Valuation Progress</CardTitle>
              <CardDescription>Track your journey to {formatCurrency(exitPlan.target_valuation)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Current: {formatCurrency(exitPlan.current_valuation)}</span>
                  <span>Target: {formatCurrency(exitPlan.target_valuation)}</span>
                </div>
                <Progress value={exitProgress} className="h-4" />
                <p className="text-center text-sm text-muted-foreground mt-2">
                  {exitProgress.toFixed(1)}% complete
                </p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Exit Readiness Score</h4>
                <div className="space-y-3">
                  {[
                    { label: 'Revenue Growth', score: 85, color: 'bg-emerald-500' },
                    { label: 'Profit Margin', score: 72, color: 'bg-brand-500' },
                    { label: 'Customer Retention', score: 90, color: 'bg-emerald-500' },
                    { label: 'Clean Financials', score: 95, color: 'bg-emerald-500' },
                    { label: 'Runway', score: 78, color: 'bg-amber-500' },
                  ].map((metric) => (
                    <div key={metric.label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{metric.label}</span>
                        <span className="font-medium">{metric.score}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary">
                        <div 
                          className={`h-full rounded-full ${metric.color}`}
                          style={{ width: `${metric.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Milestones */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Milestones</CardTitle>
                  <CardDescription>{completedMilestones} of {exitPlan.milestones.length} completed</CardDescription>
                </div>
                <Badge variant="outline">{completedMilestones}/{exitPlan.milestones.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {exitPlan.milestones.map((milestone) => {
                  const isPast = new Date(milestone.target_date) < new Date()
                  return (
                    <div 
                      key={milestone.id} 
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        milestone.completed ? 'bg-emerald-50 border-emerald-200' : 
                        isPast ? 'bg-rose-50 border-rose-200' : ''
                      }`}
                    >
                      {milestone.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                      ) : (
                        <Circle className={`h-5 w-5 mt-0.5 ${isPast ? 'text-rose-400' : 'text-muted-foreground'}`} />
                      )}
                      <div className="flex-1">
                        <p className={`font-medium ${milestone.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {milestone.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className={`text-xs ${
                            milestone.completed ? 'text-emerald-600' : 
                            isPast ? 'text-rose-600' : 'text-muted-foreground'
                          }`}>
                            {milestone.completed ? 'Completed' : isPast ? 'Overdue' : format(new Date(milestone.target_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DemoDashboardLayout>
  )
}

