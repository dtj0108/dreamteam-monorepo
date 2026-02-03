'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { Search, ChevronLeft, ChevronRight, Activity } from 'lucide-react'
import Link from 'next/link'

interface BillingEvent {
  id: string
  event_type: string
  event_category: string
  event_data: Record<string, unknown>
  amount_cents?: number | null
  currency?: string
  stripe_event_id?: string | null
  stripe_object_id?: string | null
  source: string
  created_at: string
  workspace?: { id: string; name: string } | null
}

interface BillingEventsTableProps {
  events: BillingEvent[]
  loading?: boolean
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  onPageChange?: (page: number) => void
  onFilterChange?: (filters: Record<string, string>) => void
}

const eventCategories = [
  { value: 'all', label: 'All Categories' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'payment', label: 'Payment' },
  { value: 'tier', label: 'Tier' },
  { value: 'addon', label: 'Add-on' },
  { value: 'trial', label: 'Trial' },
]

const eventSources = [
  { value: 'all', label: 'All Sources' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'api', label: 'API' },
  { value: 'admin', label: 'Admin' },
  { value: 'system', label: 'System' },
]

function formatCurrency(cents: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
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

export function BillingEventsTable({
  events,
  loading,
  pagination,
  onPageChange,
  onFilterChange,
}: BillingEventsTableProps) {
  const [selectedEvent, setSelectedEvent] = useState<BillingEvent | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [source, setSource] = useState('all')

  const handleFilterChange = () => {
    const filters: Record<string, string> = {}
    if (search) filters.search = search
    if (category !== 'all') filters.event_category = category
    if (source !== 'all') filters.source = source
    onFilterChange?.(filters)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workspace..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFilterChange()}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={(v) => { setCategory(v); handleFilterChange() }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {eventCategories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={(v) => { setSource(v); handleFilterChange() }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            {eventSources.map((src) => (
              <SelectItem key={src.value} value={src.value}>
                {src.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleFilterChange}>
          Apply Filters
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Workspace</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Source</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  <Activity className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No billing events found</p>
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(event.created_at), 'MMM d, yyyy HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    {event.workspace ? (
                      <Link
                        href={`/admin/billing/workspace/${event.workspace.id}`}
                        className="hover:underline"
                      >
                        {event.workspace.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getEventBadgeVariant(event.event_type)}>
                      {formatEventType(event.event_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {event.amount_cents && event.amount_cents > 0 ? (
                      formatCurrency(event.amount_cents, event.currency)
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{event.source}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEvent(event)}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} events
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange?.(pagination.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>Event Details</SheetTitle>
            <SheetDescription>
              {selectedEvent && formatEventType(selectedEvent.event_type)}
            </SheetDescription>
          </SheetHeader>
          {selectedEvent && (
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Event ID</label>
                <p className="font-mono text-sm">{selectedEvent.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created At</label>
                <p>{format(new Date(selectedEvent.created_at), 'PPpp')}</p>
              </div>
              {selectedEvent.stripe_event_id && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Stripe Event ID</label>
                  <p className="font-mono text-sm">{selectedEvent.stripe_event_id}</p>
                </div>
              )}
              {selectedEvent.stripe_object_id && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Stripe Object ID</label>
                  <p className="font-mono text-sm">{selectedEvent.stripe_object_id}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Event Data</label>
                <pre className="mt-2 p-3 rounded-md bg-muted text-sm overflow-auto max-h-[300px]">
                  {JSON.stringify(selectedEvent.event_data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
