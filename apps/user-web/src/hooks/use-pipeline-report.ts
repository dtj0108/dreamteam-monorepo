"use client"

import { useState, useEffect, useCallback } from "react"
import { DateRange } from "react-day-picker"
import type { PipelineReportData } from "@/app/api/sales/reports/pipeline/route"

export type { PipelineReportData }

export function usePipelineReport(dateRange?: DateRange, pipelineId?: string) {
  const [data, setData] = useState<PipelineReportData | null>(null)
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
      if (pipelineId) {
        params.set("pipeline_id", pipelineId)
      }

      const url = `/api/sales/reports/pipeline${params.toString() ? `?${params.toString()}` : ""}`
      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch pipeline report")
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [dateRange?.from?.toISOString(), dateRange?.to?.toISOString(), pipelineId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refresh: fetchData }
}
