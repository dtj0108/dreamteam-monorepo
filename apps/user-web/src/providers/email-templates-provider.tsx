"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import type { EmailTemplate, EmailTemplateInput } from "@/types/email-template"

interface EmailTemplatesContextType {
  templates: EmailTemplate[]
  isLoading: boolean
  error: string | null

  // CRUD operations
  fetchTemplates: () => Promise<void>
  getTemplate: (id: string) => Promise<EmailTemplate | null>
  createTemplate: (data: EmailTemplateInput) => Promise<EmailTemplate | null>
  updateTemplate: (id: string, data: Partial<EmailTemplateInput>) => Promise<EmailTemplate | null>
  deleteTemplate: (id: string) => Promise<boolean>

  // Quick actions
  toggleTemplate: (id: string, isActive: boolean) => Promise<boolean>
}

const EmailTemplatesContext = createContext<EmailTemplatesContextType | null>(null)

export function EmailTemplatesProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch("/api/email-templates")
      if (!res.ok) {
        throw new Error("Failed to fetch email templates")
      }

      const data = await res.json()
      setTemplates(data)
    } catch (err) {
      console.error("Error fetching email templates:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch email templates")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getTemplate = useCallback(async (id: string): Promise<EmailTemplate | null> => {
    try {
      const res = await fetch(`/api/email-templates/${id}`)
      if (!res.ok) {
        if (res.status === 404) return null
        throw new Error("Failed to fetch email template")
      }
      return await res.json()
    } catch (err) {
      console.error("Error fetching email template:", err)
      return null
    }
  }, [])

  const createTemplate = useCallback(async (data: EmailTemplateInput): Promise<EmailTemplate | null> => {
    try {
      const res = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        throw new Error("Failed to create email template")
      }

      const newTemplate = await res.json()
      setTemplates(prev => [newTemplate, ...prev])
      return newTemplate
    } catch (err) {
      console.error("Error creating email template:", err)
      return null
    }
  }, [])

  const updateTemplate = useCallback(async (id: string, data: Partial<EmailTemplateInput>): Promise<EmailTemplate | null> => {
    try {
      const res = await fetch(`/api/email-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        throw new Error("Failed to update email template")
      }

      const updatedTemplate = await res.json()
      setTemplates(prev => prev.map(t => t.id === id ? updatedTemplate : t))
      return updatedTemplate
    } catch (err) {
      console.error("Error updating email template:", err)
      return null
    }
  }, [])

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/email-templates/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        throw new Error("Failed to delete email template")
      }

      setTemplates(prev => prev.filter(t => t.id !== id))
      return true
    } catch (err) {
      console.error("Error deleting email template:", err)
      return false
    }
  }, [])

  const toggleTemplate = useCallback(async (id: string, isActive: boolean): Promise<boolean> => {
    try {
      const res = await fetch(`/api/email-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      })

      if (!res.ok) {
        throw new Error("Failed to toggle email template")
      }

      const updatedTemplate = await res.json()
      setTemplates(prev => prev.map(t => t.id === id ? updatedTemplate : t))
      return true
    } catch (err) {
      console.error("Error toggling email template:", err)
      return false
    }
  }, [])

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return (
    <EmailTemplatesContext.Provider
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
    </EmailTemplatesContext.Provider>
  )
}

export function useEmailTemplates() {
  const context = useContext(EmailTemplatesContext)
  if (!context) {
    throw new Error("useEmailTemplates must be used within an EmailTemplatesProvider")
  }
  return context
}
