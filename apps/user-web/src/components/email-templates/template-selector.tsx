"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2Icon } from "lucide-react"
import type { EmailTemplate } from "@/types/email-template"

interface TemplateSelectorProps {
  value?: string
  onSelect: (templateId: string | undefined, template: EmailTemplate | null) => void
}

export function TemplateSelector({ value, onSelect }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/email-templates?active_only=true")
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleValueChange = (newValue: string) => {
    if (newValue === "none") {
      onSelect(undefined, null)
    } else {
      const template = templates.find(t => t.id === newValue)
      onSelect(newValue, template || null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 text-sm text-muted-foreground border rounded-md">
        <Loader2Icon className="size-4 animate-spin" />
        Loading templates...
      </div>
    )
  }

  return (
    <Select value={value || "none"} onValueChange={handleValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a template (optional)" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No template - write custom</SelectItem>
        {templates.map((template) => (
          <SelectItem key={template.id} value={template.id}>
            <div className="flex flex-col">
              <span>{template.name}</span>
              <span className="text-xs text-muted-foreground">{template.subject}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
