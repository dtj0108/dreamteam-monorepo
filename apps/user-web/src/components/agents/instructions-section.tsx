"use client"

import { useState, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, Loader2 } from "lucide-react"

const MAX_CHARS = 1000

interface InstructionsSectionProps {
  agent: {
    id: string
    custom_instructions?: string | null
  }
  onUpdate: (agent: unknown) => void
}

export function InstructionsSection({ agent, onUpdate }: InstructionsSectionProps) {
  const [value, setValue] = useState(agent.custom_instructions || "")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const lastSavedRef = useRef(agent.custom_instructions || "")

  const charCount = value.length
  const isOverLimit = charCount > MAX_CHARS

  const handleSave = async () => {
    // Don't save if nothing changed
    if (value === lastSavedRef.current) return

    setSaving(true)
    setSaved(false)

    try {
      const response = await fetch(`/api/team/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customInstructions: value }),
      })

      if (response.ok) {
        const updatedAgent = await response.json()
        onUpdate(updatedAgent)
        lastSavedRef.current = value
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (error) {
      console.error("Failed to save instructions:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold">Custom Instructions</h2>
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
          Add specific rules or context that the agent should always follow
        </p>
      </div>

      <div className="space-y-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          placeholder={`Examples:
- Always respond in bullet points
- Focus on my subscription spending first
- Round all numbers to whole dollars
- When suggesting budgets, keep them conservative`}
          rows={8}
          className="resize-none"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Auto-saves when you click away</span>
          <span className={isOverLimit ? "text-destructive" : ""}>
            {charCount} / {MAX_CHARS}
          </span>
        </div>
      </div>

      {isOverLimit && (
        <p className="text-sm text-destructive">
          Instructions exceed the maximum length. Please shorten your text.
        </p>
      )}
    </div>
  )
}
