"use client"

import Link from "next/link"
import { useDemoData } from "@/providers"
import { DemoDashboardLayout } from "@/components/demo/demo-dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { Target, TrendingUp, PiggyBank, ArrowRight, Rocket } from "lucide-react"

export default function DemoGoalsPage() {
  const { goals, exitPlan } = useDemoData()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getGoalIcon = (type: string) => {
    switch (type) {
      case 'revenue':
        return TrendingUp
      case 'profit':
        return Target
      case 'savings':
        return PiggyBank
      default:
        return Target
    }
  }

  const getGoalColor = (type: string) => {
    switch (type) {
      case 'revenue':
        return 'bg-emerald-100 text-emerald-600'
      case 'profit':
        return 'bg-brand-100 text-brand-600'
      case 'savings':
        return 'bg-amber-100 text-amber-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const exitProgress = (exitPlan.current_valuation / exitPlan.target_valuation) * 100
  const completedMilestones = exitPlan.milestones.filter(m => m.completed).length

  return (
    <DemoDashboardLayout breadcrumbs={[{ label: "Goals" }]}>
      <div className="space-y-6">
        {/* Exit Plan Summary */}
        <Card className="border-brand-200 bg-gradient-to-r from-brand-50 to-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-brand-600 flex items-center justify-center text-white">
                  <Rocket className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl">Exit Plan</CardTitle>
                  <CardDescription>Target: {formatCurrency(exitPlan.target_valuation)} by {format(new Date(exitPlan.target_date), 'MMMM yyyy')}</CardDescription>
                </div>
              </div>
              <Link href="/demo/goals/exit">
                <Button>
                  View Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Current Valuation</p>
                <p className="text-2xl font-bold text-brand-600">{formatCurrency(exitPlan.current_valuation)}</p>
                <p className="text-xs text-muted-foreground">Based on {exitPlan.target_multiple}x ARR multiple</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progress to Goal</p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={exitProgress} className="flex-1" />
                  <span className="text-sm font-medium">{exitProgress.toFixed(0)}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(exitPlan.target_valuation - exitPlan.current_valuation)} remaining
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Milestones</p>
                <p className="text-2xl font-bold">{completedMilestones} / {exitPlan.milestones.length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goals Grid */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Active Goals</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {goals.map((goal) => {
              const Icon = getGoalIcon(goal.type)
              const colorClass = getGoalColor(goal.type)
              const progress = (goal.current_amount / goal.target_amount) * 100

              return (
                <Link key={goal.id} href={`/demo/goals/${goal.type}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{goal.name}</CardTitle>
                          <CardDescription>
                            Due {format(new Date(goal.target_date), 'MMM d, yyyy')}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} />
                      </div>
                      <div className="flex justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Current</p>
                          <p className="font-semibold">{formatCurrency(goal.current_amount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Target</p>
                          <p className="font-semibold">{formatCurrency(goal.target_amount)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </DemoDashboardLayout>
  )
}

