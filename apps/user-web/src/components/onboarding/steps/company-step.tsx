"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { motion } from "motion/react"
import { Building2, Loader2 } from "lucide-react"
import type { IndustryType, TeamSize } from "@/hooks/use-onboarding-wizard"

const industries = [
  {
    id: "saas" as IndustryType,
    emoji: "💻",
    title: "SaaS",
    description: "Software and technology",
  },
  {
    id: "retail" as IndustryType,
    emoji: "🛍️",
    title: "Retail",
    description: "E-commerce and stores",
  },
  {
    id: "service" as IndustryType,
    emoji: "🔧",
    title: "Service",
    description: "Professional services",
  },
  {
    id: "general" as IndustryType,
    emoji: "🏢",
    title: "General",
    description: "Other industries",
  },
]

const teamSizes = [
  {
    id: "solo" as TeamSize,
    emoji: "👤",
    title: "Just me",
    description: "Solo founder or freelancer",
  },
  {
    id: "small" as TeamSize,
    emoji: "👥",
    title: "Small",
    description: "2-10 people",
  },
  {
    id: "medium" as TeamSize,
    emoji: "🏢",
    title: "Medium",
    description: "11-50 people",
  },
  {
    id: "large" as TeamSize,
    emoji: "🏛️",
    title: "Large",
    description: "50+ people",
  },
]

interface CompanyStepProps {
  companyName: string
  onCompanyNameChange: (name: string) => void
  selectedIndustry: IndustryType | null
  onIndustrySelect: (industry: IndustryType) => void
  selectedTeamSize: TeamSize | null
  onTeamSizeSelect: (size: TeamSize) => void
  onSubmit: () => void
  onBack: () => void
  canSubmit: boolean
  isSubmitting: boolean
  error: string | null
}

export function CompanyStep({
  companyName,
  onCompanyNameChange,
  selectedIndustry,
  onIndustrySelect,
  selectedTeamSize,
  onTeamSizeSelect,
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
          <Building2 className="text-primary-foreground size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tell us about your company</h1>
          <p className="text-muted-foreground">
            This helps us tailor DreamTeam to your needs.
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
        />
      </div>

      {/* Industry Type */}
      <div className="space-y-3 mb-8">
        <Label className="text-base font-medium">Industry</Label>
        <RadioGroup
          value={selectedIndustry || ""}
          onValueChange={(value) => onIndustrySelect(value as IndustryType)}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {industries.map((industry) => (
            <div key={industry.id} className="relative">
              <RadioGroupItem
                value={industry.id}
                id={`industry-${industry.id}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`industry-${industry.id}`}
                className="peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:border-primary hover:border-primary/50 flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-4 py-3 transition-all text-center"
              >
                <span className="text-2xl">{industry.emoji}</span>
                <span className="font-semibold">{industry.title}</span>
                <span className="text-xs text-muted-foreground">
                  {industry.description}
                </span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Team Size */}
      <div className="space-y-3 mb-8">
        <Label className="text-base font-medium">Team size</Label>
        <RadioGroup
          value={selectedTeamSize || ""}
          onValueChange={(value) => onTeamSizeSelect(value as TeamSize)}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {teamSizes.map((size) => (
            <div key={size.id} className="relative">
              <RadioGroupItem
                value={size.id}
                id={`size-${size.id}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`size-${size.id}`}
                className="peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:border-primary hover:border-primary/50 flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-4 py-3 transition-all text-center"
              >
                <span className="text-2xl">{size.emoji}</span>
                <span className="font-semibold">{size.title}</span>
                <span className="text-xs text-muted-foreground">
                  {size.description}
                </span>
              </Label>
            </div>
          ))}
        </RadioGroup>
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
