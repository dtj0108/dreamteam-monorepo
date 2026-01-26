"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { CheckCircle, Loader2, MessageSquare, Sparkles, ListChecks } from "lucide-react"

interface StylePresets {
  verbosity: "concise" | "balanced" | "detailed"
  tone: "casual" | "balanced" | "formal"
  examples: "few" | "moderate" | "many"
}

interface StyleSectionProps {
  agent: {
    id: string
    style_presets?: StylePresets
  }
  onUpdate: (agent: unknown) => void
}

interface StyleOption {
  value: string
  label: string
  description: string
}

const verbosityOptions: StyleOption[] = [
  { value: "concise", label: "Concise", description: "Brief, to the point" },
  { value: "balanced", label: "Balanced", description: "Right amount of detail" },
  { value: "detailed", label: "Detailed", description: "Comprehensive explanations" },
]

const toneOptions: StyleOption[] = [
  { value: "casual", label: "Casual", description: "Friendly and relaxed" },
  { value: "balanced", label: "Balanced", description: "Natural and professional" },
  { value: "formal", label: "Formal", description: "Professional and polished" },
]

const examplesOptions: StyleOption[] = [
  { value: "few", label: "Few", description: "Only when essential" },
  { value: "moderate", label: "Moderate", description: "When helpful" },
  { value: "many", label: "Many", description: "Illustrate frequently" },
]

export function StyleSection({ agent, onUpdate }: StyleSectionProps) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localPresets, setLocalPresets] = useState<StylePresets>(
    agent.style_presets || {
      verbosity: "balanced",
      tone: "balanced",
      examples: "moderate",
    }
  )

  const handleChange = async (key: keyof StylePresets, value: string) => {
    const newPresets = { ...localPresets, [key]: value as StylePresets[typeof key] }

    // Optimistic update
    setLocalPresets(newPresets)
    setSaving(true)
    setSaved(false)
    setError(null)

    try {
      const response = await fetch(`/api/team/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stylePresets: newPresets }),
      })

      if (response.ok) {
        const updatedAgent = await response.json()
        onUpdate(updatedAgent)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        // Revert on error
        setLocalPresets(agent.style_presets || {
          verbosity: "balanced",
          tone: "balanced",
          examples: "moderate",
        })
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || "Failed to save")
      }
    } catch (err) {
      console.error("Failed to update style:", err)
      // Revert on error
      setLocalPresets(agent.style_presets || {
        verbosity: "balanced",
        tone: "balanced",
        examples: "moderate",
      })
      setError("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold">Style</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saved && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="size-4" />
                Saved
              </span>
            )}
            {error && (
              <span className="text-red-600">{error}</span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Customize how this agent communicates with you
        </p>
      </div>

      {/* Verbosity */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-muted-foreground" />
          <label className="font-medium">Verbosity</label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {verbosityOptions.map((option) => (
            <StyleCard
              key={option.value}
              option={option}
              isSelected={localPresets.verbosity === option.value}
              onClick={() => handleChange("verbosity", option.value)}
              disabled={saving}
            />
          ))}
        </div>
      </div>

      {/* Tone */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-muted-foreground" />
          <label className="font-medium">Tone</label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {toneOptions.map((option) => (
            <StyleCard
              key={option.value}
              option={option}
              isSelected={localPresets.tone === option.value}
              onClick={() => handleChange("tone", option.value)}
              disabled={saving}
            />
          ))}
        </div>
      </div>

      {/* Examples */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ListChecks className="size-4 text-muted-foreground" />
          <label className="font-medium">Examples</label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {examplesOptions.map((option) => (
            <StyleCard
              key={option.value}
              option={option}
              isSelected={localPresets.examples === option.value}
              onClick={() => handleChange("examples", option.value)}
              disabled={saving}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface StyleCardProps {
  option: StyleOption
  isSelected: boolean
  onClick: () => void
  disabled: boolean
}

function StyleCard({ option, isSelected, onClick, disabled }: StyleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex flex-col items-start p-3 rounded-lg border text-left transition-all",
        "hover:border-foreground/20 hover:bg-muted/50",
        isSelected
          ? "border-sky-500 bg-sky-500/5 ring-1 ring-sky-500"
          : "border-border",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {isSelected && (
        <div className="absolute top-2 right-2">
          <CheckCircle className="size-4 text-sky-500" />
        </div>
      )}
      <span className="font-medium text-sm">{option.label}</span>
      <span className="text-xs text-muted-foreground mt-0.5">{option.description}</span>
    </button>
  )
}
