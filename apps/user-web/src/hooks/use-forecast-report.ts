"use client"

import { useState, useEffect, useCallback } from "react"
import type { ForecastReportData } from "@/app/api/sales/reports/forecast/route"

export type { ForecastReportData }

export function useForecastReport(monthsAhead: number = 6, pipelineId?: string) {
  const [data, setData] = useState<ForecastReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set("months_ahead", monthsAhead.toString())
      if (pipelineId) {
        params.set("pipeline_id", pipelineId)
      }

      const url = `/api/sales/reports/forecast?${params.toString()}`
      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch forecast report")
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [monthsAhead, pipelineId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refresh: fetchData }
}
