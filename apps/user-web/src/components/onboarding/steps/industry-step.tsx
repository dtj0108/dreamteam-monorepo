"use client"

import { Building2 } from "lucide-react"
import { CardQuestionStep, type CardOption } from "./card-question-step"
import type { IndustryType } from "@/hooks/use-onboarding-wizard"

const industryOptions: CardOption[] = [
  {
    id: "saas",
    emoji: "💻",
    title: "SaaS / Software",
    description: "Tech products and platforms",
  },
  {
    id: "ecommerce",
    emoji: "🛍️",
    title: "E-commerce / Retail",
    description: "Online and physical stores",
  },
  {
    id: "services",
    emoji: "💼",
    title: "Professional Services",
    description: "Consulting and expertise",
  },
  {
    id: "healthcare",
    emoji: "🏥",
    title: "Healthcare",
    description: "Medical and wellness",
  },
  {
    id: "finance",
    emoji: "🏦",
    title: "Finance",
    description: "Banking and investments",
  },
  {
    id: "other",
    emoji: "🏢",
    title: "Other",
    description: "Other industries",
  },
]

interface IndustryStepProps {
  selectedValue: IndustryType | null
  onSelect: (value: IndustryType) => void
  onContinue: () => void
  onBack: () => void
}

export function IndustryStep({
  selectedValue,
  onSelect,
  onContinue,
  onBack,
}: IndustryStepProps) {
  return (
    <CardQuestionStep
      icon={Building2}
      title="Your industry"
      subtitle="Helps agents understand your market context"
      question="What industry are you in?"
      options={industryOptions}
      selectedValue={selectedValue}
      onSelect={(value) => onSelect(value as IndustryType)}
      onContinue={onContinue}
      onBack={onBack}
      gridCols={3}
    />
  )
}
