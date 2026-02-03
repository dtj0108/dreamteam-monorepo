'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format, formatDistanceToNow } from 'date-fns'
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  Activity,
  Receipt,
  Gift,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface BillingEvent {
  id: string
  event_type: string
  event_category: string
  event_data: Record<string, unknown>
  amount_cents?: number | null
  currency?: string
  created_at: string
}

interface BillingTimelineProps {
  events: BillingEvent[]
  loading?: boolean
}

function formatCurrency(cents: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

function getEventIcon(eventType: string) {
  if (eventType.includes('subscription.created')) return CreditCard
  if (eventType.includes('succeeded') || eventType.includes('converted')) return CheckCircle2
  if (eventType.includes('failed') || eventType.includes('expired') || eventType.includes('canceled')) return XCircle
  if (eventType.includes('upgraded')) return ArrowUpCircle
  if (eventType.includes('downgraded')) return ArrowDownCircle
  if (eventType.includes('trial')) return Clock
  if (eventType.includes('invoice') || eventType.includes('payment')) return Receipt
  if (eventType.includes('addon')) return Gift
  return Activity
}

function getEventColor(eventType: string): string {
  if (eventType.includes('succeeded') || eventType.includes('converted') || eventType.includes('upgraded')) {
    return 'bg-green-500'
  }
  if (eventType.includes('failed') || eventType.includes('expired') || eventType.includes('canceled')) {
    return 'bg-red-500'
  }
  if (eventType.includes('trial') || eventType.includes('downgraded')) {
    return 'bg-amber-500'
  }
  return 'bg-blue-500'
}

function formatEventType(eventType: string): string {
  return eventType
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function BillingTimeline({ events, loading }: BillingTimelineProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-16 w-0.5 my-2" />
                </div>
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No billing events yet
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {events.map((event, index) => {
            const Icon = getEventIcon(event.event_type)
            const isLast = index === events.length - 1

            return (
              <div key={event.id} className="flex gap-4 pb-8 last:pb-0">
                {/* Timeline line and icon */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${getEventColor(
                      event.event_type
                    )}`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  {!isLast && (
                    <div className="w-0.5 flex-1 bg-border mt-2" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{formatEventType(event.event_type)}</p>
                    {event.amount_cents && event.amount_cents > 0 && (
                      <Badge variant="outline">
                        {formatCurrency(event.amount_cents, event.currency)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(event.created_at), 'MMM d, yyyy h:mm a')}
                    {' · '}
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </p>

                  {/* Event details */}
                  {Object.keys(event.event_data).length > 0 && (
                    <div className="mt-2 p-2 rounded-md bg-muted text-sm">
                      {Object.entries(event.event_data).slice(0, 3).map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-muted-foreground">{key}:</span>
                          <span className="font-mono">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
