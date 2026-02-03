'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BillingTimeline } from '@/components/admin/billing/billing-timeline'
import {
  Building2,
  CreditCard,
  Calendar,
  ExternalLink,
  User,
  Receipt,
  AlertTriangle,
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface WorkspaceOwner {
  id: string
  email: string
  name?: string | null
}

interface WorkspaceInfo {
  id: string
  name: string
  created_at: string
  owner: WorkspaceOwner
}

interface WorkspaceBilling {
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  stripe_agent_subscription_id?: string | null
  plan: string
  plan_status?: string | null
  plan_period_end?: string | null
  agent_tier: string
  agent_status?: string | null
  agent_period_end?: string | null
  payment_method_brand?: string | null
  payment_method_last4?: string | null
  payment_method_exp_month?: number | null
  payment_method_exp_year?: number | null
}

interface BillingEvent {
  id: string
  event_type: string
  event_category: string
  event_data: Record<string, unknown>
  amount_cents?: number | null
  currency?: string
  created_at: string
}

interface StripeSubscription {
  id: string
  status: string
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
  items: {
    id: string
    price_id: string
    product: string
    unit_amount: number
    interval: string
  }[]
}

interface StripePaymentMethod {
  id: string
  brand: string
  last4: string
  exp_month: number
  exp_year: number
}

interface StripeInvoice {
  id: string
  number?: string | null
  amount_due: number
  amount_paid: number
  currency: string
  status: string
  created: number
  paid_at?: number | null
  invoice_url?: string | null
  invoice_pdf?: string | null
}

interface BillingAlert {
  id: string
  alert_type: string
  severity: string
  title: string
  status: string
  created_at: string
}

interface PageParams {
  id: string
}

export default function WorkspaceBillingPage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { id: workspaceId } = use(params)

  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null)
  const [billing, setBilling] = useState<WorkspaceBilling | null>(null)
  const [events, setEvents] = useState<BillingEvent[]>([])
  const [alerts, setAlerts] = useState<BillingAlert[]>([])
  const [stripeData, setStripeData] = useState<{
    subscriptions: StripeSubscription[]
    paymentMethods: StripePaymentMethod[]
    invoices: StripeInvoice[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/billing/workspace/${workspaceId}`)
      const data = await res.json()

      if (data.error) {
        console.error('Error:', data.error)
        return
      }

      setWorkspace(data.workspace)
      setBilling(data.billing)
      setEvents(data.events || [])
      setAlerts(data.alerts || [])
      setStripeData(data.stripe)
    } catch (error) {
      console.error('Error fetching workspace billing:', error)
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function formatCurrency(cents: number, currency: string = 'usd'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100)
  }

  function getStatusColor(status?: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
      case 'active':
      case 'trialing':
        return 'default'
      case 'past_due':
      case 'unpaid':
        return 'destructive'
      case 'canceled':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Workspace Not Found</h2>
        <p className="text-muted-foreground">The workspace could not be found.</p>
        <Link href="/admin/billing">
          <Button className="mt-4">Back to Billing</Button>
        </Link>
      </div>
    )
  }

  const stripeCustomerUrl = billing?.stripe_customer_id
    ? `https://dashboard.stripe.com/customers/${billing.stripe_customer_id}`
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{workspace.name}</h1>
          <p className="text-muted-foreground">
            Billing details for workspace
          </p>
        </div>
        {stripeCustomerUrl && (
          <Button variant="outline" asChild>
            <a href={stripeCustomerUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              View in Stripe
            </a>
          </Button>
        )}
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card className="border-destructive">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.alert_type}</p>
                  </div>
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Workspace Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Workspace Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Owner</p>
                <p className="font-medium">
                  {workspace.owner?.name || workspace.owner?.email || 'Unknown'}
                </p>
                {workspace.owner?.name && (
                  <p className="text-sm text-muted-foreground">{workspace.owner.email}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {format(new Date(workspace.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>

            {billing?.stripe_customer_id && (
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Stripe Customer</p>
                  <p className="font-mono text-sm">{billing.stripe_customer_id}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Workspace Plan</span>
              <div className="text-right">
                <p className="font-medium capitalize">{billing?.plan || 'Free'}</p>
                {billing?.plan_status && (
                  <Badge variant={getStatusColor(billing.plan_status)}>
                    {billing.plan_status}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Agent Tier</span>
              <div className="text-right">
                <p className="font-medium capitalize">{billing?.agent_tier || 'None'}</p>
                {billing?.agent_status && (
                  <Badge variant={getStatusColor(billing.agent_status)}>
                    {billing.agent_status}
                  </Badge>
                )}
              </div>
            </div>

            {billing?.agent_period_end && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Next Billing</span>
                <p className="font-medium">
                  {format(new Date(billing.agent_period_end), 'MMM d, yyyy')}
                </p>
              </div>
            )}

            {billing?.payment_method_last4 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment Method</span>
                <p className="font-medium capitalize">
                  {billing.payment_method_brand} ****{billing.payment_method_last4}
                  <span className="text-muted-foreground ml-2">
                    {billing.payment_method_exp_month}/{billing.payment_method_exp_year}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stripe Subscriptions */}
      {stripeData && stripeData.subscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stripeData.subscriptions.map((sub) => (
                <div key={sub.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm">{sub.id}</span>
                    <Badge variant={getStatusColor(sub.status)}>{sub.status}</Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    {sub.items.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span>{item.product}</span>
                        <span>
                          {formatCurrency(item.unit_amount || 0)}/{item.interval}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Period: {format(new Date(sub.current_period_start * 1000), 'MMM d')} -{' '}
                    {format(new Date(sub.current_period_end * 1000), 'MMM d, yyyy')}
                    {sub.cancel_at_period_end && (
                      <Badge variant="secondary" className="ml-2">
                        Cancels at period end
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Invoices */}
      {stripeData && stripeData.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Recent Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stripeData.invoices.slice(0, 10).map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{invoice.number || invoice.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(invoice.created * 1000), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(invoice.amount_paid, invoice.currency)}
                      </p>
                      <Badge
                        variant={
                          invoice.status === 'paid'
                            ? 'default'
                            : invoice.status === 'open'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                    {invoice.invoice_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={invoice.invoice_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Timeline */}
      <BillingTimeline events={events} loading={false} />
    </div>
  )
}
