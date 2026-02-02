"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion } from "motion/react"
import { Building, Loader2 } from "lucide-react"

interface CompanyStepProps {
  companyName: string
  onCompanyNameChange: (name: string) => void
  onSubmit: () => void
  onBack: () => void
  canSubmit: boolean
  isSubmitting: boolean
  error: string | null
}

export function CompanyStep({
  companyName,
  onCompanyNameChange,
  onSubmit,
  onBack,
  canSubmit,
  isSubmitting,
  error,
}: CompanyStepProps) {
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
          <Building className="text-primary-foreground size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Almost done!</h1>
          <p className="text-muted-foreground">
            Just one more thing to personalize your experience
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Company Name */}
      <div className="space-y-2 mb-8">
        <Label htmlFor="company-name" className="text-base font-medium">
          Company name
        </Label>
        <Input
          id="company-name"
          placeholder="Acme Inc."
          value={companyName}
          onChange={(e) => onCompanyNameChange(e.target.value)}
          className="h-12 text-base"
          autoFocus
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button onClick={onSubmit} disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Finishing...
            </>
          ) : (
            "Finish"
          )}
        </Button>
      </div>
    </motion.div>
  )
}
