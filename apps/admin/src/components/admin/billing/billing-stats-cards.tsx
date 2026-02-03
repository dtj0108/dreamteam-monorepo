'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Users, TrendingDown, AlertTriangle, Activity, CreditCard } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface BillingStats {
  mrr: number
  activeSubscriptions: number
  churnRate: number
  failedPayments: number
  totalRevenue30d: number
  trialSubscriptions: number
}

interface BillingStatsCardsProps {
  stats?: BillingStats | null
  loading?: boolean
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function BillingStatsCards({ stats, loading }: BillingStatsCardsProps) {
  const cards = [
    {
      title: 'MRR',
      value: stats ? formatCurrency(stats.mrr) : '-',
      icon: DollarSign,
      description: 'Monthly Recurring Revenue',
      color: 'text-green-500',
    },
    {
      title: 'Active Subscriptions',
      value: stats?.activeSubscriptions ?? '-',
      icon: Users,
      description: 'Paid subscriptions',
      color: 'text-blue-500',
    },
    {
      title: 'Revenue (30d)',
      value: stats ? formatCurrency(stats.totalRevenue30d) : '-',
      icon: Activity,
      description: 'Last 30 days',
      color: 'text-emerald-500',
    },
    {
      title: 'Churn Rate',
      value: stats ? `${stats.churnRate}%` : '-',
      icon: TrendingDown,
      description: 'Last 30 days',
      color: stats && stats.churnRate > 5 ? 'text-red-500' : 'text-amber-500',
    },
    {
      title: 'Failed Payments',
      value: stats?.failedPayments ?? '-',
      icon: AlertTriangle,
      description: 'Pending recovery',
      color: stats && stats.failedPayments > 0 ? 'text-red-500' : 'text-gray-500',
    },
    {
      title: 'In Trial',
      value: stats?.trialSubscriptions ?? '-',
      icon: CreditCard,
      description: 'Trial subscriptions',
      color: 'text-purple-500',
    },
  ]

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-20 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
