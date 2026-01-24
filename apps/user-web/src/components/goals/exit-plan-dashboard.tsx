"use client"

import { useEffect, useState } from "react"
import { format, differenceInDays } from "date-fns"
import {
  Target,
  TrendingUp,
  Wallet,
  Calendar,
  Pencil,
  BarChart3,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ExitPlanForm } from "./exit-plan-form"

interface ExitPlan {
  id: string
  target_valuation: number | null
  current_valuation: number | null
  target_multiple: number | null
  target_runway: number | null
  target_exit_date: string | null
  notes: string | null
  // Calculated fields from API
  current_runway: number
  current_arr: number
  implied_valuation: number
}

interface MetricCardProps {
  title: string
  icon: React.ReactNode
  current: number | null
  target: number | null
  format: (value: number) => string
  description?: string
  status?: 'on-track' | 'behind' | 'achieved' | 'not-set'
}

function MetricCard({ title, icon, current, target, format: formatValue, description, status }: MetricCardProps) {
  const progress = target && current ? Math.min((current / target) * 100, 100) : 0
  
  const statusConfig = {
    'on-track': { color: 'bg-blue-500', badge: 'On Track', badgeClass: 'bg-blue-100 text-blue-700' },
    'behind': { color: 'bg-amber-500', badge: 'Behind', badgeClass: 'bg-amber-100 text-amber-700' },
    'achieved': { color: 'bg-emerald-500', badge: 'Achieved', badgeClass: 'bg-emerald-100 text-emerald-700' },
    'not-set': { color: 'bg-gray-300', badge: 'Not Set', badgeClass: 'bg-gray-100 text-gray-600' },
  }

  const config = status ? statusConfig[status] : statusConfig['not-set']

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <Badge variant="secondary" className={config.badgeClass}>
          {config.badge}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold">
            {current !== null ? formatValue(current) : '—'}
          </span>
          <span className="text-sm text-muted-foreground">
            / {target !== null ? formatValue(target) : 'Set target'}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

export function ExitPlanDashboard() {
  const [exitPlan, setExitPlan] = useState<ExitPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)

  const fetchExitPlan = async () => {
    try {
      const response = await fetch('/api/exit-plan')
      if (response.ok) {
        const data = await response.json()
        setExitPlan(data.exitPlan)
      }
    } catch (error) {
      console.error('Failed to fetch exit plan:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExitPlan()
  }, [])

  const handleSave = async (data: Partial<ExitPlan>) => {
    const response = await fetch('/api/exit-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to save exit plan')
    }

    await fetchExitPlan()
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`
    }
    return `$${value.toFixed(0)}`
  }

  const formatMultiple = (value: number) => `${value.toFixed(1)}x`

  const getMetricStatus = (current: number | null, target: number | null): 'on-track' | 'behind' | 'achieved' | 'not-set' => {
    if (!target) return 'not-set'
    if (!current) return 'behind'
    if (current >= target) return 'achieved'
    if (current >= target * 0.7) return 'on-track'
    return 'behind'
  }

  // Calculate overall readiness
  const calculateReadiness = (): number => {
    if (!exitPlan) return 0

    let totalWeight = 0
    let weightedProgress = 0

    if (exitPlan.target_valuation) {
      totalWeight += 40
      const progress = Math.min((exitPlan.current_valuation || 0) / exitPlan.target_valuation, 1)
      weightedProgress += progress * 40
    }

    if (exitPlan.target_runway) {
      totalWeight += 30
      const progress = Math.min(exitPlan.current_runway / exitPlan.target_runway, 1)
      weightedProgress += progress * 30
    }

    if (exitPlan.target_multiple && exitPlan.target_valuation) {
      totalWeight += 30
      const impliedVal = exitPlan.current_arr * exitPlan.target_multiple
      const progress = Math.min(impliedVal / exitPlan.target_valuation, 1)
      weightedProgress += progress * 30
    }

    return totalWeight > 0 ? (weightedProgress / totalWeight) * 100 : 0
  }

  const daysToExit = exitPlan?.target_exit_date
    ? differenceInDays(new Date(exitPlan.target_exit_date), new Date())
    : null

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    )
  }

  const hasExitPlan = exitPlan && (
    exitPlan.target_valuation ||
    exitPlan.target_runway ||
    exitPlan.target_exit_date
  )

  const readiness = calculateReadiness()

  return (
    <div className="space-y-6">
      {/* Readiness Score Card */}
      <Card className="border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-white">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Target className="h-6 w-6 text-sky-600" />
              Exit Readiness
            </CardTitle>
            <CardDescription>
              {hasExitPlan
                ? "Track your progress toward a successful exit"
                : "Set your exit targets to start tracking readiness"}
            </CardDescription>
          </div>
          <Button onClick={() => setFormOpen(true)} variant="outline">
            <Pencil className="h-4 w-4 mr-2" />
            {hasExitPlan ? 'Edit Plan' : 'Set Targets'}
          </Button>
        </CardHeader>
        <CardContent>
          {hasExitPlan ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-4xl font-bold text-sky-600">
                      {readiness.toFixed(0)}%
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {readiness >= 80 ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Ready to exit
                        </span>
                      ) : readiness >= 50 ? (
                        <span className="flex items-center gap-1 text-blue-600">
                          <TrendingUp className="h-4 w-4" />
                          Making progress
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertCircle className="h-4 w-4" />
                          Building momentum
                        </span>
                      )}
                    </span>
                  </div>
                  <Progress value={readiness} className="h-3" />
                </div>
              </div>

              {daysToExit !== null && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Target exit:</span>
                  <span className="font-medium">
                    {format(new Date(exitPlan!.target_exit_date!), 'MMMM d, yyyy')}
                  </span>
                  <Badge variant="outline" className={daysToExit > 365 ? '' : daysToExit > 180 ? 'border-amber-300' : 'border-red-300'}>
                    {daysToExit > 0 ? `${daysToExit} days` : 'Past due'}
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="h-16 w-16 mx-auto text-sky-300 mb-4" />
              <p className="text-muted-foreground mb-4">
                Define your exit strategy to track your progress
              </p>
              <Button onClick={() => setFormOpen(true)}>
                Set Exit Targets
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      {hasExitPlan && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Valuation"
            icon={<Target className="h-4 w-4 text-sky-500" />}
            current={exitPlan?.current_valuation || null}
            target={exitPlan?.target_valuation || null}
            format={formatCurrency}
            status={getMetricStatus(exitPlan?.current_valuation || null, exitPlan?.target_valuation || null)}
            description="Update manually based on funding rounds or offers"
          />

          <MetricCard
            title="Implied Value"
            icon={<BarChart3 className="h-4 w-4 text-sky-500" />}
            current={exitPlan?.implied_valuation || null}
            target={exitPlan?.target_valuation || null}
            format={formatCurrency}
            status={getMetricStatus(exitPlan?.implied_valuation || null, exitPlan?.target_valuation || null)}
            description={`ARR × ${exitPlan?.target_multiple || 5}x multiple`}
          />

          <MetricCard
            title="Cash Runway"
            icon={<Wallet className="h-4 w-4 text-sky-500" />}
            current={exitPlan?.current_runway || null}
            target={exitPlan?.target_runway || null}
            format={formatCurrency}
            status={getMetricStatus(exitPlan?.current_runway || null, exitPlan?.target_runway || null)}
            description="Total cash across all accounts"
          />

          <MetricCard
            title="Annual Revenue"
            icon={<TrendingUp className="h-4 w-4 text-sky-500" />}
            current={exitPlan?.current_arr || null}
            target={exitPlan?.target_valuation && exitPlan?.target_multiple 
              ? exitPlan.target_valuation / exitPlan.target_multiple 
              : null}
            format={formatCurrency}
            status={getMetricStatus(
              exitPlan?.current_arr || null, 
              exitPlan?.target_valuation && exitPlan?.target_multiple 
                ? exitPlan.target_valuation / exitPlan.target_multiple 
                : null
            )}
            description="Trailing 12 months income"
          />
        </div>
      )}

      {/* Notes Section */}
      {exitPlan?.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Exit Strategy Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {exitPlan.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Exit Plan Form */}
      <ExitPlanForm
        open={formOpen}
        onOpenChange={setFormOpen}
        exitPlan={exitPlan}
        onSubmit={handleSave}
      />
    </div>
  )
}

