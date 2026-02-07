"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useWorkspace } from "@/providers/workspace-provider"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Target, CheckCircle, Loader2 } from "lucide-react"
import {
  GUIDED_QUESTIONS,
  parseBusinessContext,
  type BusinessContext,
  type GuidedBusinessContext,
} from "@/lib/autonomy-context"

const MAX_CUSTOM_CHARS = 500

export default function AutonomyPage() {
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  const [context, setContext] = useState<BusinessContext>({ guided: {}, customContext: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const lastSavedRef = useRef<BusinessContext>({ guided: {}, customContext: "" })

  const customCharCount = context.customContext?.length || 0
  const isOverLimit = customCharCount > MAX_CUSTOM_CHARS

  // Fetch workspace business context on mount
  useEffect(() => {
    async function fetchWorkspace() {
      if (!workspaceId) return

      try {
        const response = await fetch(`/api/team/workspace?workspaceId=${workspaceId}`)
        if (response.ok) {
          const data = await response.json()
          const parsed = parseBusinessContext(data.business_context)
          setContext(parsed)
          lastSavedRef.current = parsed
        }
      } catch (error) {
        console.error("Failed to fetch workspace:", error)
      } finally {
        setLoading(false)
      }
    }

    if (workspaceId) {
      fetchWorkspace()
    } else {
      setLoading(false)
    }
  }, [workspaceId])

  const handleSave = useCallback(async (newContext: BusinessContext) => {
    if (!workspaceId) return

    // Don't save if nothing changed
    if (JSON.stringify(newContext) === JSON.stringify(lastSavedRef.current)) return

    setSaving(true)
    setSaved(false)

    try {
      const response = await fetch("/api/team/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          businessContext: newContext
        }),
      })

      if (response.ok) {
        lastSavedRef.current = newContext
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (error) {
      console.error("Failed to save business context:", error)
    } finally {
      setSaving(false)
    }
  }, [workspaceId])

  const updateGuidedField = useCallback((key: keyof GuidedBusinessContext, value: string) => {
    const newContext = {
      ...context,
      guided: {
        ...context.guided,
        [key]: value,
      },
    }
    setContext(newContext)
    return newContext
  }, [context])

  const handleGuidedChange = useCallback((key: keyof GuidedBusinessContext, value: string) => {
    const newContext = updateGuidedField(key, value)
    // For dropdowns, save immediately
    const question = GUIDED_QUESTIONS.find(q => q.key === key)
    if (question?.type === 'dropdown') {
      handleSave(newContext)
    }
  }, [updateGuidedField, handleSave])

  const handleTextBlur = useCallback(() => {
    handleSave(context)
  }, [context, handleSave])

  const handleCustomContextChange = useCallback((value: string) => {
    setContext(prev => ({
      ...prev,
      customContext: value,
    }))
  }, [])

  const handleCustomContextBlur = useCallback(() => {
    handleSave(context)
  }, [context, handleSave])

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-2xl mx-auto">
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="space-y-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!workspaceId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Target className="size-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-2">No workspace selected</h2>
          <p className="text-muted-foreground">
            Please select a workspace to configure autonomy settings.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Target className="size-6" />
              Autonomy
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saved && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="size-4" />
                  Saved
                </span>
              )}
            </div>
          </div>
          <p className="text-muted-foreground">
            Help all your agents understand your business context for more relevant, aligned responses.
            These settings apply to every agent in your workspace.
          </p>
        </div>

        {/* Guided Questions */}
        <div className="space-y-5">
          {GUIDED_QUESTIONS.map((question) => (
            <div key={question.key} className="space-y-2">
              <Label htmlFor={question.key} className="text-sm font-medium">
                {question.label}
              </Label>
              <p className="text-xs text-muted-foreground">
                {question.description}
              </p>
              {question.type === 'dropdown' && question.options ? (
                <Select
                  value={context.guided[question.key] || ''}
                  onValueChange={(value) => handleGuidedChange(question.key, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={question.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {question.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={question.key}
                  value={context.guided[question.key] || ''}
                  onChange={(e) => handleGuidedChange(question.key, e.target.value)}
                  onBlur={handleTextBlur}
                  placeholder={question.placeholder}
                />
              )}
            </div>
          ))}
        </div>

        {/* Custom Context */}
        <div className="space-y-2 pt-6 mt-6 border-t">
          <Label htmlFor="customContext" className="text-sm font-medium">
            Additional Context
          </Label>
          <p className="text-xs text-muted-foreground">
            Add any other context that would help your agents serve you better
          </p>
          <Textarea
            id="customContext"
            value={context.customContext || ''}
            onChange={(e) => handleCustomContextChange(e.target.value)}
            onBlur={handleCustomContextBlur}
            placeholder="e.g., We prioritize customer retention over new acquisition. Our fiscal year ends in March. We have 12 employees across 2 locations."
            rows={4}
            className="resize-none"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Auto-saves when you click away</span>
            <span className={isOverLimit ? "text-destructive" : ""}>
              {customCharCount} / {MAX_CUSTOM_CHARS}
            </span>
          </div>
        </div>

        {isOverLimit && (
          <p className="text-sm text-destructive mt-4">
            Custom context exceeds the maximum length. Please shorten your text.
          </p>
        )}
      </div>
    </div>
  )
}
