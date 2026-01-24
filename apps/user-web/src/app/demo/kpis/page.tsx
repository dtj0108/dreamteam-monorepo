"use client"

import { useDemoData } from "@/providers"
import { DemoDashboardLayout } from "@/components/demo/demo-dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, Users, RefreshCw, Target } from "lucide-react"

export default function DemoKPIsPage() {
  const { overview, exitPlan, subscriptions } = useDemoData()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Calculate KPIs
  const mrr = overview.currentMonth.income
  const arr = exitPlan.current_arr
  const profitMargin = overview.currentMonth.income > 0 
    ? ((overview.currentMonth.profit / overview.currentMonth.income) * 100)
    : 0
  const monthlyBurn = overview.currentMonth.expenses
  const runway = overview.totalBalance / monthlyBurn
  const monthlySubscriptionCost = subscriptions.reduce((sum, sub) => {
    return sum + (sub.billing_cycle === 'yearly' ? sub.amount / 12 : sub.amount)
  }, 0)

  // Simulated KPIs for demo
  const kpis = [
    {
      name: 'Monthly Recurring Revenue',
      value: formatCurrency(mrr),
      change: '+9.2%',
      trend: 'up',
      icon: DollarSign,
      description: 'Recurring revenue this month',
    },
    {
      name: 'Annual Recurring Revenue',
      value: formatCurrency(arr),
      change: '+42%',
      trend: 'up',
      icon: TrendingUp,
      description: 'Annualized recurring revenue',
    },
    {
      name: 'Profit Margin',
      value: `${profitMargin.toFixed(1)}%`,
      change: '+2.3%',
      trend: 'up',
      icon: Target,
      description: 'Net profit as % of revenue',
    },
    {
      name: 'Monthly Burn Rate',
      value: formatCurrency(monthlyBurn),
      change: '-5.1%',
      trend: 'down',
      icon: TrendingDown,
      description: 'Monthly operating expenses',
    },
    {
      name: 'Runway',
      value: `${runway.toFixed(1)} months`,
      change: '+0.5',
      trend: 'up',
      icon: RefreshCw,
      description: 'Months of cash remaining',
    },
    {
      name: 'SaaS Spend',
      value: formatCurrency(monthlySubscriptionCost),
      change: '+2.1%',
      trend: 'neutral',
      icon: Users,
      description: 'Monthly software costs',
    },
  ]

  // Exit-focused KPIs
  const exitKpis = [
    { name: 'Valuation', value: formatCurrency(exitPlan.current_valuation), target: formatCurrency(exitPlan.target_valuation) },
    { name: 'Revenue Multiple', value: `${exitPlan.target_multiple}x`, target: '5-7x typical' },
    { name: 'YoY Growth', value: '+42%', target: '>30% for premium' },
    { name: 'Churn Rate', value: '4.2%', target: '<5% target' },
    { name: 'LTV:CAC Ratio', value: '4.8:1', target: '>3:1 healthy' },
    { name: 'Rule of 40', value: '67%', target: '>40% premium' },
  ]

  return (
    <DemoDashboardLayout breadcrumbs={[{ label: "KPIs" }]}>
      <div className="space-y-6">
        {/* Main KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {kpis.map((kpi) => {
            const Icon = kpi.icon
            return (
              <Card key={kpi.name}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.name}</CardTitle>
                  <Icon className={`h-4 w-4 ${
                    kpi.trend === 'up' ? 'text-emerald-500' : 
                    kpi.trend === 'down' ? 'text-rose-500' : 'text-muted-foreground'
                  }`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-medium ${
                      kpi.trend === 'up' ? 'text-emerald-500' : 
                      kpi.trend === 'down' && kpi.name === 'Monthly Burn Rate' ? 'text-emerald-500' :
                      kpi.trend === 'down' ? 'text-rose-500' : 'text-muted-foreground'
                    }`}>
                      {kpi.change}
                    </span>
                    <span className="text-xs text-muted-foreground">vs last month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{kpi.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Exit-Focused KPIs */}
        <Card>
          <CardHeader>
            <CardTitle>Exit-Ready Metrics</CardTitle>
            <CardDescription>KPIs that buyers and investors care about</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {exitKpis.map((kpi) => (
                <div key={kpi.name} className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">{kpi.name}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">Target: {kpi.target}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>MRR Growth</CardTitle>
            <CardDescription>Monthly recurring revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end justify-between gap-2 px-4">
              {overview.trend.map((month, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-brand-500 rounded-t min-h-[4px]"
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

