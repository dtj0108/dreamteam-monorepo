'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'

interface BillingEvent {
  id: string
  event_type: string
  event_category: string
  amount_cents?: number | null
  currency?: string
  created_at: string
  workspace?: { id: string; name: string } | null
}

interface BillingEventFeedProps {
  events?: BillingEvent[]
  loading?: boolean
  limit?: number
}

function formatCurrency(cents: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

function getEventBadgeVariant(eventType: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (eventType.includes('failed') || eventType.includes('canceled') || eventType.includes('expired')) {
    return 'destructive'
  }
  if (eventType.includes('succeeded') || eventType.includes('created') || eventType.includes('upgraded')) {
    return 'default'
  }
  if (eventType.includes('downgraded')) {
    return 'secondary'
  }
  return 'outline'
}

function formatEventType(eventType: string): string {
  return eventType
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function BillingEventFeed({ events = [], loading, limit = 10 }: BillingEventFeedProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Billing Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div className="space-y-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const displayEvents = events.slice(0, limit)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Billing Activity
        </CardTitle>
        <Link href="/admin/billing/events" className="text-sm text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {displayEvents.length === 0 ? (
          <p className="text-muted-foreground text-sm">No recent billing activity</p>
        ) : (
          <div className="space-y-4">
            {displayEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between border-b pb-3 last:border-0"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getEventBadgeVariant(event.event_type)}>
                      {formatEventType(event.event_type)}
                    </Badge>
                    {event.amount_cents && event.amount_cents > 0 && (
                      <span className="text-sm font-medium">
                        {formatCurrency(event.amount_cents, event.currency)}
                      </span>
                    )}
                  </div>
                  {event.workspace && (
                    <Link
                      href={`/admin/billing/workspace/${event.workspace.id}`}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {event.workspace.name}
                    </Link>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
