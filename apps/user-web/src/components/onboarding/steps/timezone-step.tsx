"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { motion } from "motion/react"
import { Globe } from "lucide-react"
import { TimezoneSelect } from "@/components/team/settings/timezone-select"

interface TimezoneStepProps {
  value: string
  onChange: (timezone: string) => void
  onContinue: () => void
  onBack: () => void
}

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return "UTC"
  }
}

export function TimezoneStep({
  value,
  onChange,
  onContinue,
  onBack,
}: TimezoneStepProps) {
  const [hasAutoDetected, setHasAutoDetected] = useState(false)

  // Auto-detect browser timezone on mount if no value set
  useEffect(() => {
    if (!hasAutoDetected && !value) {
      const browserTz = getBrowserTimezone()
      onChange(browserTz)
      setHasAutoDetected(true)
    }
  }, [hasAutoDetected, value, onChange])

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-3xl mx-auto px-6 py-12"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary flex size-10 items-center justify-center rounded-full">
          <Globe className="text-primary-foreground size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Your timezone</h1>
          <p className="text-muted-foreground">
            Set the timezone for your workspace
          </p>
        </div>
      </div>

      {/* Explanation */}
      <p className="text-sm text-muted-foreground mb-6">
        This timezone will be used for all scheduled agent tasks. All team members share the same workspace timezone.
      </p>

      {/* Timezone Select */}
      <div className="space-y-2 mb-8">
        <Label htmlFor="timezone" className="text-base font-medium">
          Timezone
        </Label>
        <div className="max-w-md">
          <TimezoneSelect
            value={value || getBrowserTimezone()}
            onValueChange={onChange}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onContinue}>
          Continue
        </Button>
      </div>
    </motion.div>
  )
}
