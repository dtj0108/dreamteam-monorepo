"use client"

import { useState, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckCircle, Loader2 } from "lucide-react"
import {
  GUIDED_QUESTIONS,
  parseBusinessContext,
  type BusinessContext,
  type GuidedBusinessContext,
} from "@/lib/autonomy-context"

const MAX_CUSTOM_CHARS = 500

interface AutonomySectionProps {
  agent: {
    id: string
    business_context?: unknown
  }
  onUpdate: (agent: unknown) => void
}

export function AutonomySection({ agent, onUpdate }: AutonomySectionProps) {
  const initialContext = parseBusinessContext(agent.business_context)
  const [context, setContext] = useState<BusinessContext>(initialContext)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const lastSavedRef = useRef<BusinessContext>(initialContext)

  const customCharCount = context.customContext?.length || 0
  const isOverLimit = customCharCount > MAX_CUSTOM_CHARS

  const handleSave = useCallback(async (newContext: BusinessContext) => {
    // Don't save if nothing changed
    if (JSON.stringify(newContext) === JSON.stringify(lastSavedRef.current)) return

    setSaving(true)
    setSaved(false)

    try {
      const response = await fetch(`/api/team/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessContext: newContext }),
      })

      if (response.ok) {
        const updatedAgent = await response.json()
        onUpdate(updatedAgent)
        lastSavedRef.current = newContext
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (error) {
      console.error("Failed to save business context:", error)
    } finally {
      setSaving(false)
    }
  }, [agent.id, onUpdate])

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
    // For text inputs, save on blur is handled separately
    // For selects, save immediately
    const question = GUIDED_QUESTIONS.find(q => q.key === key)
    if (question?.type === 'dropdown') {
      handleSave(newContext)
    }
  }, [updateGuidedField, handleSave])

  const handleTextBlur = useCallback((key: keyof GuidedBusinessContext) => {
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

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold">Autonomy</h2>
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
        <p className="text-sm text-muted-foreground">
          Help this agent understand your business context for more relevant, aligned responses
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
                onBlur={() => handleTextBlur(question.key)}
                placeholder={question.placeholder}
              />
            )}
          </div>
        ))}
      </div>

      {/* Custom Context */}
      <div className="space-y-2 pt-4 border-t">
        <Label htmlFor="customContext" className="text-sm font-medium">
          Additional Context
        </Label>
        <p className="text-xs text-muted-foreground">
          Add any other context that would help this agent serve you better
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
        <p className="text-sm text-destructive">
          Custom context exceeds the maximum length. Please shorten your text.
        </p>
      )}
    </div>
  )
}
