"use client"

import { useState, useEffect, useCallback } from "react"
import type { WorkflowExecution } from "@/types/workflow"

const PAGE_SIZE = 20

interface UseWorkflowRunsReturn {
  runs: WorkflowExecution[]
  total: number
  isLoading: boolean
  error: string | null
  page: number
  setPage: (page: number) => void
  refresh: () => Promise<void>
  hasNextPage: boolean
  hasPrevPage: boolean
}

export function useWorkflowRuns(workflowId: string): UseWorkflowRunsReturn {
  const [runs, setRuns] = useState<WorkflowExecution[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  const fetchRuns = useCallback(async (offset = 0) => {
    if (!workflowId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/workflows/${workflowId}/executions?limit=${PAGE_SIZE}&offset=${offset}`
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch runs (${response.status})`)
      }

      const data = await response.json()
      setRuns(data.executions || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error("Error fetching workflow runs:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch runs")
      setRuns([])
    } finally {
      setIsLoading(false)
    }
  }, [workflowId])

  // Fetch runs when page changes
  useEffect(() => {
    fetchRuns(page * PAGE_SIZE)
  }, [page, fetchRuns])

  const refresh = useCallback(async () => {
    await fetchRuns(page * PAGE_SIZE)
  }, [page, fetchRuns])

  const hasNextPage = (page + 1) * PAGE_SIZE < total
  const hasPrevPage = page > 0

  return {
    runs,
    total,
    isLoading,
    error,
    page,
    setPage,
    refresh,
    hasNextPage,
    hasPrevPage,
  }
}
