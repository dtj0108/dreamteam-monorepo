"use client"

import { useDemoData } from "@/providers"
import { DemoDashboardLayout } from "@/components/demo/demo-dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Calendar, CreditCard, TrendingUp } from "lucide-react"

export default function DemoSubscriptionsPage() {
  const { subscriptions } = useDemoData()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const totalMonthly = subscriptions.reduce((sum, sub) => {
    if (sub.billing_cycle === 'yearly') {
      return sum + (sub.amount / 12)
    }
    return sum + sub.amount
  }, 0)

  const totalYearly = totalMonthly * 12

  // Sort by next billing date
  const sortedSubscriptions = [...subscriptions].sort(
    (a, b) => new Date(a.next_billing_date).getTime() - new Date(b.next_billing_date).getTime()
  )

  // Group by category
  const byCategory = subscriptions.reduce((acc, sub) => {
    if (!acc[sub.categoryName]) {
      acc[sub.categoryName] = { total: 0, count: 0 }
    }
    acc[sub.categoryName].total += sub.amount
    acc[sub.categoryName].count++
    return acc
  }, {} as Record<string, { total: number; count: number }>)

  return (
    <DemoDashboardLayout breadcrumbs={[{ label: "Subscriptions" }]}>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscriptions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Cost</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">{formatCurrency(totalMonthly)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Yearly Cost</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">{formatCurrency(totalYearly)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Software</div>
              <p className="text-xs text-muted-foreground">
                {byCategory['Software']?.count || 0} subscriptions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Subscriptions List */}
        <Card>
          <CardHeader>
            <CardTitle>All Subscriptions</CardTitle>
            <CardDescription>Manage your recurring payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedSubscriptions.map((subscription) => {
                const daysUntil = Math.ceil(
                  (new Date(subscription.next_billing_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                )

                return (
                  <div
                    key={subscription.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-lg">
                        {subscription.name[0]}
                      </div>
                      <div>
                        <p className="font-medium">{subscription.name}</p>
                        <p className="text-sm text-muted-foreground">{subscription.categoryName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(subscription.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {subscription.billing_cycle === 'yearly' ? '/year' : '/month'}
                        </p>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className="text-sm">
                          {format(new Date(subscription.next_billing_date), 'MMM d, yyyy')}
                        </p>
                        <p className={`text-xs ${daysUntil <= 7 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                        </p>
                      </div>
                      <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                        {subscription.status}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Where your subscription money goes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(byCategory).map(([category, data]) => (
                <div key={category} className="p-4 rounded-lg border">
                  <p className="font-medium">{category}</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(data.total)}</p>
                  <p className="text-xs text-muted-foreground">{data.count} subscription{data.count !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DemoDashboardLayout>
  )
}

