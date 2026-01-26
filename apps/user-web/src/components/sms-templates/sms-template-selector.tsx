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
import type { SMSTemplate } from "@/types/sms-template"

interface SMSTemplateSelectorProps {
  value?: string
  onSelect: (templateId: string | undefined, template: SMSTemplate | null) => void
}

export function SMSTemplateSelector({ value, onSelect }: SMSTemplateSelectorProps) {
  const [templates, setTemplates] = useState<SMSTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/sms-templates?active_only=true")
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error("Failed to fetch SMS templates:", error)
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

  // Truncate body preview to reasonable length
  const truncateBody = (body: string, maxLength = 50): string => {
    if (body.length <= maxLength) return body
    return body.substring(0, maxLength).trim() + "..."
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
              <span className="text-xs text-muted-foreground">
                {truncateBody(template.body)}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
