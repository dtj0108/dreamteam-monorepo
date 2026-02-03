'use client'

import { useState, useEffect, useCallback } from 'react'
import { BillingEventsTable } from '@/components/admin/billing/billing-events-table'

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

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function BillingEventsPage() {
  const [events, setEvents] = useState<BillingEvent[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        ...filters,
      })

      const res = await fetch(`/api/admin/billing/events?${params}`)
      const data = await res.json()

      setEvents(data.events || [])
      if (data.pagination) {
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching billing events:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, filters])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }))
  }

  const handleFilterChange = (newFilters: Record<string, string>) => {
    setFilters(newFilters)
    setPagination((prev) => ({ ...prev, page: 1 })) // Reset to first page
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing Events</h1>
        <p className="text-muted-foreground">
          Search and explore all billing activity across workspaces
        </p>
      </div>

      <BillingEventsTable
        events={events}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onFilterChange={handleFilterChange}
      />
    </div>
  )
}
