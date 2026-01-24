"use client"

import { useState, useEffect, useCallback } from "react"
import { DateRange } from "react-day-picker"
import type { SourcesReportData } from "@/app/api/sales/reports/sources/route"

export type { SourcesReportData }

export function useSourcesReport(dateRange?: DateRange) {
  const [data, setData] = useState<SourcesReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (dateRange?.from) {
        params.set("start_date", dateRange.from.toISOString())
      }
      if (dateRange?.to) {
        params.set("end_date", dateRange.to.toISOString())
      }

      const url = `/api/sales/reports/sources${params.toString() ? `?${params.toString()}` : ""}`
      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch sources report")
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [dateRange?.from?.toISOString(), dateRange?.to?.toISOString()])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refresh: fetchData }
}
