"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import type { SMSTemplate, SMSTemplateInput } from "@/types/sms-template"

interface SMSTemplatesContextType {
  templates: SMSTemplate[]
  isLoading: boolean
  error: string | null

  // CRUD operations
  fetchTemplates: () => Promise<void>
  getTemplate: (id: string) => Promise<SMSTemplate | null>
  createTemplate: (data: SMSTemplateInput) => Promise<SMSTemplate | null>
  updateTemplate: (id: string, data: Partial<SMSTemplateInput>) => Promise<SMSTemplate | null>
  deleteTemplate: (id: string) => Promise<boolean>

  // Quick actions
  toggleTemplate: (id: string, isActive: boolean) => Promise<boolean>
}

const SMSTemplatesContext = createContext<SMSTemplatesContextType | null>(null)

export function SMSTemplatesProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<SMSTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch("/api/sms-templates")
      if (!res.ok) {
        throw new Error("Failed to fetch SMS templates")
      }

      const data = await res.json()
      setTemplates(data)
    } catch (err) {
      console.error("Error fetching SMS templates:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch SMS templates")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getTemplate = useCallback(async (id: string): Promise<SMSTemplate | null> => {
    try {
      const res = await fetch(`/api/sms-templates/${id}`)
      if (!res.ok) {
        if (res.status === 404) return null
        throw new Error("Failed to fetch SMS template")
      }
      return await res.json()
    } catch (err) {
      console.error("Error fetching SMS template:", err)
      return null
    }
  }, [])

  const createTemplate = useCallback(async (data: SMSTemplateInput): Promise<SMSTemplate | null> => {
    try {
      const res = await fetch("/api/sms-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        throw new Error("Failed to create SMS template")
      }

      const newTemplate = await res.json()
      setTemplates(prev => [newTemplate, ...prev])
      return newTemplate
    } catch (err) {
      console.error("Error creating SMS template:", err)
      return null
    }
  }, [])

  const updateTemplate = useCallback(async (id: string, data: Partial<SMSTemplateInput>): Promise<SMSTemplate | null> => {
    try {
      const res = await fetch(`/api/sms-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        throw new Error("Failed to update SMS template")
      }

      const updatedTemplate = await res.json()
      setTemplates(prev => prev.map(t => t.id === id ? updatedTemplate : t))
      return updatedTemplate
    } catch (err) {
      console.error("Error updating SMS template:", err)
      return null
    }
  }, [])

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/sms-templates/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        throw new Error("Failed to delete SMS template")
      }

      setTemplates(prev => prev.filter(t => t.id !== id))
      return true
    } catch (err) {
      console.error("Error deleting SMS template:", err)
      return false
    }
  }, [])

  const toggleTemplate = useCallback(async (id: string, isActive: boolean): Promise<boolean> => {
    try {
      const res = await fetch(`/api/sms-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      })

      if (!res.ok) {
        throw new Error("Failed to toggle SMS template")
      }

      const updatedTemplate = await res.json()
      setTemplates(prev => prev.map(t => t.id === id ? updatedTemplate : t))
      return true
    } catch (err) {
      console.error("Error toggling SMS template:", err)
      return false
    }
  }, [])

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return (
    <SMSTemplatesContext.Provider
      value={{
        templates,
        isLoading,
        error,
        fetchTemplates,
        getTemplate,
        createTemplate,
        updateTemplate,
        deleteTemplate,
        toggleTemplate,
      }}
    >
      {children}
    </SMSTemplatesContext.Provider>
  )
}

export function useSMSTemplates() {
  const context = useContext(SMSTemplatesContext)
  if (!context) {
    throw new Error("useSMSTemplates must be used within an SMSTemplatesProvider")
  }
  return context
}
