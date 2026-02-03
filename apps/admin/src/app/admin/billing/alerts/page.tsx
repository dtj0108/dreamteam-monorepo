'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertsTable } from '@/components/admin/billing/alerts-table'

interface BillingAlert {
  id: string
  alert_type: string
  severity: string
  title: string
  description?: string | null
  status: string
  created_at: string
  acknowledged_at?: string | null
  resolved_at?: string | null
  workspace?: { id: string; name: string } | null
  acknowledged_by_user?: { id: string; email: string; name: string | null } | null
  resolved_by_user?: { id: string; email: string; name: string | null } | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface Summary {
  new: number
  acknowledged: number
  resolved: number
  dismissed: number
}

export default function BillingAlertsPage() {
  const [alerts, setAlerts] = useState<BillingAlert[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })
  const [summary, setSummary] = useState<Summary | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'open' })
  const [loading, setLoading] = useState(true)

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        ...filters,
      })

      const res = await fetch(`/api/admin/billing/alerts?${params}`)
      const data = await res.json()

      setAlerts(data.alerts || [])
      if (data.pagination) {
        setPagination(data.pagination)
      }
      if (data.summary) {
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Error fetching billing alerts:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, filters])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }))
  }

  const handleFilterChange = (newFilters: Record<string, string>) => {
    setFilters(newFilters)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleAction = async (
    alertId: string,
    action: 'acknowledge' | 'resolve' | 'dismiss'
  ) => {
    try {
      const res = await fetch(`/api/admin/billing/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (!res.ok) {
        throw new Error('Failed to update alert')
      }

      // Refresh the list
      await fetchAlerts()
    } catch (error) {
      console.error('Error updating alert:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing Alerts</h1>
        <p className="text-muted-foreground">
          Monitor and manage billing alerts requiring attention
        </p>
      </div>

      <AlertsTable
        alerts={alerts}
        loading={loading}
        pagination={pagination}
        summary={summary || undefined}
        onPageChange={handlePageChange}
        onFilterChange={handleFilterChange}
        onAction={handleAction}
      />
    </div>
  )
}
