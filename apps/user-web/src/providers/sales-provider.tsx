"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react"

// Types
export type DealStatus = "open" | "won" | "lost"
export type ActivityType = "call" | "email" | "meeting" | "note" | "task"

export interface PipelineStage {
  id: string
  pipeline_id: string
  name: string
  color: string | null
  position: number
  win_probability: number
  created_at: string
}

export interface Pipeline {
  id: string
  profile_id: string
  name: string
  description: string | null
  is_default: boolean
  created_at: string
  updated_at: string
  stages?: PipelineStage[]
}

export interface Contact {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  company: string | null
  job_title: string | null
  avatar_url: string | null
}

export interface Deal {
  id: string
  profile_id: string
  contact_id: string | null
  pipeline_id: string | null
  stage_id: string | null
  name: string
  value: number | null
  currency: string
  expected_close_date: string | null
  actual_close_date: string | null
  status: DealStatus
  probability: number | null
  notes: string | null
  created_at: string
  updated_at: string
  contact?: Contact | null
  stage?: PipelineStage | null
}

export interface Activity {
  id: string
  profile_id: string
  contact_id: string | null
  deal_id: string | null
  type: ActivityType
  subject: string | null
  description: string | null
  due_date: string | null
  completed_at: string | null
  is_completed: boolean
  created_at: string
  updated_at: string
  contact?: Contact | null
  deal?: Deal | null
}

interface SalesContextType {
  // Data
  pipelines: Pipeline[]
  deals: Deal[]
  activities: Activity[]
  currentPipeline: Pipeline | null
  loading: boolean
  error: string | null

  // Pipeline operations
  fetchPipelines: () => Promise<void>
  createPipeline: (data: { name: string; description?: string; is_default?: boolean; stages?: { name: string; color?: string; win_probability?: number }[] }) => Promise<Pipeline | null>
  updatePipelineStages: (pipelineId: string, stages: PipelineStage[]) => Promise<void>
  setCurrentPipeline: (pipeline: Pipeline | null) => void

  // Deal operations
  fetchDeals: (pipelineId?: string) => Promise<void>
  createDeal: (data: Partial<Deal>) => Promise<Deal | null>
  updateDeal: (id: string, data: Partial<Deal>) => Promise<void>
  moveDealToStage: (dealId: string, stageId: string) => Promise<void>
  deleteDeal: (id: string) => Promise<void>

  // Activity operations
  fetchActivities: (filters?: { dealId?: string; contactId?: string }) => Promise<void>
  createActivity: (data: Partial<Activity>) => Promise<Activity | null>
  updateActivity: (id: string, data: Partial<Activity>) => Promise<void>
  deleteActivity: (id: string) => Promise<void>
  completeActivity: (id: string) => Promise<void>
}

const SalesContext = createContext<SalesContextType | undefined>(undefined)

export function useSales() {
  const context = useContext(SalesContext)
  if (!context) {
    throw new Error("useSales must be used within a SalesProvider")
  }
  return context
}

export function SalesProvider({ children }: { children: ReactNode }) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [currentPipeline, setCurrentPipeline] = useState<Pipeline | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use ref to track current pipeline ID without causing re-renders
  const currentPipelineIdRef = useRef<string | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    currentPipelineIdRef.current = currentPipeline?.id ?? null
  }, [currentPipeline])

  // ============================================
  // Pipeline Operations
  // ============================================

  const fetchPipelines = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/pipelines")
      if (!response.ok) throw new Error("Failed to fetch pipelines")
      const data = await response.json()
      setPipelines(data.pipelines || [])

      // Always refresh currentPipeline with latest data (including stages)
      if (data.pipelines?.length > 0) {
        const currentId = currentPipelineIdRef.current
        const targetPipeline = currentId
          ? data.pipelines.find((p: Pipeline) => p.id === currentId)
          : data.pipelines.find((p: Pipeline) => p.is_default) || data.pipelines[0]
        setCurrentPipeline(targetPipeline || data.pipelines[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch pipelines")
    } finally {
      setLoading(false)
    }
  }, [])

  const createPipeline = useCallback(async (data: { name: string; description?: string; is_default?: boolean; stages?: { name: string; color?: string; win_probability?: number }[] }) => {
    try {
      const response = await fetch("/api/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to create pipeline")
      const result = await response.json()
      setPipelines(prev => [...prev, result.pipeline])
      return result.pipeline
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create pipeline")
      return null
    }
  }, [])

  const updatePipelineStages = useCallback(async (pipelineId: string, stages: PipelineStage[]) => {
    try {
      const response = await fetch(`/api/pipelines/${pipelineId}/stages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stages }),
      })
      if (!response.ok) throw new Error("Failed to update stages")
      const result = await response.json()
      setPipelines(prev => prev.map(p =>
        p.id === pipelineId ? { ...p, stages: result.stages } : p
      ))
      if (currentPipeline?.id === pipelineId) {
        setCurrentPipeline(prev => prev ? { ...prev, stages: result.stages } : null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update stages")
    }
  }, [currentPipeline?.id])

  // ============================================
  // Deal Operations
  // ============================================

  const fetchDeals = useCallback(async (pipelineId?: string) => {
    try {
      const url = pipelineId ? `/api/deals?pipeline_id=${pipelineId}` : "/api/deals"
      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch deals")
      const data = await response.json()
      setDeals(data.deals || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch deals")
    }
  }, [])

  const createDeal = useCallback(async (data: Partial<Deal>) => {
    try {
      const response = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to create deal")
      const result = await response.json()
      setDeals(prev => [...prev, result.deal])
      return result.deal
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create deal")
      return null
    }
  }, [])

  const updateDeal = useCallback(async (id: string, data: Partial<Deal>) => {
    // Optimistic update
    let previousDeals: Deal[] = []
    setDeals(prev => {
      previousDeals = prev
      return prev.map(d => d.id === id ? { ...d, ...data } : d)
    })

    try {
      const response = await fetch(`/api/deals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to update deal")
      const result = await response.json()
      setDeals(prev => prev.map(d => d.id === id ? { ...d, ...result.deal } : d))
    } catch (err) {
      // Rollback on failure
      setDeals(previousDeals)
      setError(err instanceof Error ? err.message : "Failed to update deal")
    }
  }, [])

  const moveDealToStage = useCallback(async (dealId: string, stageId: string) => {
    // Optimistic update
    let previousDeals: Deal[] = []
    setDeals(prev => {
      previousDeals = prev
      return prev.map(d => d.id === dealId ? { ...d, stage_id: stageId } : d)
    })

    try {
      const response = await fetch(`/api/deals/${dealId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_id: stageId }),
      })
      if (!response.ok) throw new Error("Failed to move deal")
      const result = await response.json()
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, ...result.deal } : d))
    } catch (err) {
      // Rollback on failure
      setDeals(previousDeals)
      setError(err instanceof Error ? err.message : "Failed to move deal")
    }
  }, [])

  const deleteDeal = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/deals/${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete deal")
      setDeals(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete deal")
    }
  }, [])

  // ============================================
  // Activity Operations
  // ============================================

  const fetchActivities = useCallback(async (filters?: { dealId?: string; contactId?: string }) => {
    try {
      const params = new URLSearchParams()
      if (filters?.dealId) params.set("deal_id", filters.dealId)
      if (filters?.contactId) params.set("contact_id", filters.contactId)
      const url = `/api/activities${params.toString() ? `?${params}` : ""}`

      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch activities")
      const data = await response.json()
      setActivities(data.activities || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch activities")
    }
  }, [])

  const createActivity = useCallback(async (data: Partial<Activity>) => {
    try {
      const response = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to create activity")
      const result = await response.json()
      setActivities(prev => [result.activity, ...prev])
      return result.activity
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create activity")
      return null
    }
  }, [])

  const updateActivity = useCallback(async (id: string, data: Partial<Activity>) => {
    try {
      const response = await fetch(`/api/activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to update activity")
      const result = await response.json()
      setActivities(prev => prev.map(a => a.id === id ? { ...a, ...result.activity } : a))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update activity")
    }
  }, [])

  const deleteActivity = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/activities/${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete activity")
      setActivities(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete activity")
    }
  }, [])

  const completeActivity = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: true, completed_at: new Date().toISOString() }),
      })
      if (!response.ok) throw new Error("Failed to complete activity")
      const result = await response.json()
      setActivities(prev => prev.map(a => a.id === id ? { ...a, ...result.activity } : a))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete activity")
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchPipelines()
  }, [fetchPipelines])

  return (
    <SalesContext.Provider
      value={{
        pipelines,
        deals,
        activities,
        currentPipeline,
        loading,
        error,
        fetchPipelines,
        createPipeline,
        updatePipelineStages,
        setCurrentPipeline,
        fetchDeals,
        createDeal,
        updateDeal,
        moveDealToStage,
        deleteDeal,
        fetchActivities,
        createActivity,
        updateActivity,
        deleteActivity,
        completeActivity,
      }}
    >
      {children}
    </SalesContext.Provider>
  )
}
