'use client'

import { useState, useEffect, useCallback } from 'react'
import { BillingStatsCards } from '@/components/admin/billing/billing-stats-cards'
import { BillingEventFeed } from '@/components/admin/billing/billing-event-feed'
import { RevenueChart } from '@/components/admin/billing/revenue-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PieChart, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface BillingStats {
  mrr: number
  activeSubscriptions: number
  churnRate: number
  failedPayments: number
  totalRevenue30d: number
  trialSubscriptions: number
}

interface PlanDistribution {
  plan: string
  count: number
  revenue: number
}

interface BillingEvent {
  id: string
  event_type: string
  event_category: string
  amount_cents?: number | null
  currency?: string
  created_at: string
  workspace?: { id: string; name: string } | null
}

interface RevenueDataPoint {
  date: string
  revenue: number
  invoiceCount: number
}

interface AlertSummary {
  total: number
  byType: Record<string, number>
  bySeverity: Record<string, number>
}

export default function BillingOverviewPage() {
  const [stats, setStats] = useState<BillingStats | null>(null)
  const [planDistribution, setPlanDistribution] = useState<PlanDistribution[]>([])
  const [recentEvents, setRecentEvents] = useState<BillingEvent[]>([])
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([])
  const [revenuePeriod, setRevenuePeriod] = useState('30d')
  const [loading, setLoading] = useState(true)
  const [revenueLoading, setRevenueLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/billing/stats')
      const data = await res.json()
      setStats(data.stats)
      setPlanDistribution(data.planDistribution || [])
      setRecentEvents(data.recentEvents || [])
      setAlertSummary(data.alerts)
    } catch (error) {
      console.error('Error fetching billing stats:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRevenue = useCallback(async () => {
    setRevenueLoading(true)
    try {
      const res = await fetch(`/api/admin/billing/revenue?period=${revenuePeriod}`)
      const data = await res.json()
      setRevenueData(data.timeSeries || [])
    } catch (error) {
      console.error('Error fetching revenue data:', error)
    } finally {
      setRevenueLoading(false)
    }
  }, [revenuePeriod])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    fetchRevenue()
  }, [fetchRevenue])

  function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Billing Analytics</h1>
        <p className="text-muted-foreground">Monitor revenue, subscriptions, and billing events</p>
      </div>

      {/* Stats Cards */}
      <BillingStatsCards stats={stats} loading={loading} />

      {/* Revenue Chart + Alerts Summary */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart
            data={revenueData}
            loading={revenueLoading}
            period={revenuePeriod}
            onPeriodChange={setRevenuePeriod}
          />
        </div>

        {/* Alerts Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts
            </CardTitle>
            <Link href="/admin/billing/alerts" className="text-sm text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <div className="h-16 bg-muted animate-pulse rounded" />
                <div className="h-16 bg-muted animate-pulse rounded" />
              </div>
            ) : alertSummary && alertSummary.total > 0 ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-bold">{alertSummary.total}</p>
                  <p className="text-sm text-muted-foreground">Open Alerts</p>
                </div>

                {Object.entries(alertSummary.bySeverity).length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {alertSummary.bySeverity.critical && (
                      <Badge variant="destructive">
                        {alertSummary.bySeverity.critical} Critical
                      </Badge>
                    )}
                    {alertSummary.bySeverity.high && (
                      <Badge variant="destructive">
                        {alertSummary.bySeverity.high} High
                      </Badge>
                    )}
                    {alertSummary.bySeverity.medium && (
                      <Badge variant="secondary">
                        {alertSummary.bySeverity.medium} Medium
                      </Badge>
                    )}
                    {alertSummary.bySeverity.low && (
                      <Badge variant="outline">
                        {alertSummary.bySeverity.low} Low
                      </Badge>
                    )}
                  </div>
                )}

                {Object.entries(alertSummary.byType).length > 0 && (
                  <div className="space-y-2 mt-4">
                    {Object.entries(alertSummary.byType).map(([type, count]) => (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No active alerts</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution + Recent Events */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Plan Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            ) : planDistribution.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No subscription data available
              </p>
            ) : (
              <div className="space-y-4">
                {planDistribution.map((plan) => (
                  <div key={plan.plan} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="font-medium">{plan.plan}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{plan.count} subs</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(plan.revenue)}/mo
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Events */}
        <BillingEventFeed events={recentEvents} loading={loading} />
      </div>
    </div>
  )
}
