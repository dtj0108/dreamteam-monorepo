"use client"

import { useState, useEffect, useCallback } from "react"

export interface ReportMetrics {
  totalRevenue: number
  totalRevenueChange: number
  dealsClosed: number
  dealsClosedChange: number
  newLeads: number
  newLeadsChange: number
  winRate: number
  winRateChange: number
}

export function useSalesReports() {
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/sales/reports")

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to fetch report metrics")
      }

      const data = await response.json()
      setMetrics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  return { metrics, loading, error, refresh: fetchMetrics }
}
