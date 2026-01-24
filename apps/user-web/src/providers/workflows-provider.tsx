"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import type { Workflow, WorkflowInput, WorkflowAction } from "@/types/workflow"

interface WorkflowsContextType {
  workflows: Workflow[]
  isLoading: boolean
  error: string | null

  // CRUD operations
  fetchWorkflows: () => Promise<void>
  getWorkflow: (id: string) => Promise<Workflow | null>
  createWorkflow: (data: WorkflowInput) => Promise<Workflow | null>
  updateWorkflow: (id: string, data: Partial<WorkflowInput>) => Promise<Workflow | null>
  deleteWorkflow: (id: string) => Promise<boolean>

  // Quick actions
  toggleWorkflow: (id: string, isActive: boolean) => Promise<boolean>
  saveWorkflowActions: (id: string, actions: WorkflowAction[]) => Promise<boolean>
}

const WorkflowsContext = createContext<WorkflowsContextType | null>(null)

export function WorkflowsProvider({ children }: { children: ReactNode }) {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkflows = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch("/api/workflows")
      if (!res.ok) {
        throw new Error("Failed to fetch workflows")
      }

      const data = await res.json()
      setWorkflows(data)
    } catch (err) {
      console.error("Error fetching workflows:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch workflows")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getWorkflow = useCallback(async (id: string): Promise<Workflow | null> => {
    try {
      const res = await fetch(`/api/workflows/${id}`)
      if (!res.ok) {
        if (res.status === 404) return null
        throw new Error("Failed to fetch workflow")
      }
      return await res.json()
    } catch (err) {
      console.error("Error fetching workflow:", err)
      return null
    }
  }, [])

  const createWorkflow = useCallback(async (data: WorkflowInput): Promise<Workflow | null> => {
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        throw new Error("Failed to create workflow")
      }

      const newWorkflow = await res.json()
      setWorkflows(prev => [newWorkflow, ...prev])
      return newWorkflow
    } catch (err) {
      console.error("Error creating workflow:", err)
      return null
    }
  }, [])

  const updateWorkflow = useCallback(async (id: string, data: Partial<WorkflowInput>): Promise<Workflow | null> => {
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        throw new Error("Failed to update workflow")
      }

      const updatedWorkflow = await res.json()
      setWorkflows(prev => prev.map(w => w.id === id ? updatedWorkflow : w))
      return updatedWorkflow
    } catch (err) {
      console.error("Error updating workflow:", err)
      return null
    }
  }, [])

  const deleteWorkflow = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        throw new Error("Failed to delete workflow")
      }

      setWorkflows(prev => prev.filter(w => w.id !== id))
      return true
    } catch (err) {
      console.error("Error deleting workflow:", err)
      return false
    }
  }, [])

  const toggleWorkflow = useCallback(async (id: string, isActive: boolean): Promise<boolean> => {
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      })

      if (!res.ok) {
        throw new Error("Failed to toggle workflow")
      }

      const updatedWorkflow = await res.json()
      setWorkflows(prev => prev.map(w => w.id === id ? updatedWorkflow : w))
      return true
    } catch (err) {
      console.error("Error toggling workflow:", err)
      return false
    }
  }, [])

  const saveWorkflowActions = useCallback(async (id: string, actions: WorkflowAction[]): Promise<boolean> => {
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions }),
      })

      if (!res.ok) {
        throw new Error("Failed to save workflow actions")
      }

      const updatedWorkflow = await res.json()
      setWorkflows(prev => prev.map(w => w.id === id ? updatedWorkflow : w))
      return true
    } catch (err) {
      console.error("Error saving workflow actions:", err)
      return false
    }
  }, [])

  // Fetch workflows on mount
  useEffect(() => {
    fetchWorkflows()
  }, [fetchWorkflows])

  return (
    <WorkflowsContext.Provider
      value={{
        workflows,
        isLoading,
        error,
        fetchWorkflows,
        getWorkflow,
        createWorkflow,
        updateWorkflow,
        deleteWorkflow,
        toggleWorkflow,
        saveWorkflowActions,
      }}
    >
      {children}
    </WorkflowsContext.Provider>
  )
}

export function useWorkflows() {
  const context = useContext(WorkflowsContext)
  if (!context) {
    throw new Error("useWorkflows must be used within a WorkflowsProvider")
  }
  return context
}
