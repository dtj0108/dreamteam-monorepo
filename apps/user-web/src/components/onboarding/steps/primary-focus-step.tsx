"use client"

import { Briefcase } from "lucide-react"
import { CardQuestionStep, type CardOption } from "./card-question-step"
import type { PrimaryFocus } from "@/hooks/use-onboarding-wizard"

const primaryFocusOptions: CardOption[] = [
  {
    id: "revenue",
    emoji: "📈",
    title: "Growing Revenue",
    description: "Increasing sales and customers",
  },
  {
    id: "costs",
    emoji: "💰",
    title: "Controlling Costs",
    description: "Reducing expenses, margins",
  },
  {
    id: "team",
    emoji: "👥",
    title: "Building Team",
    description: "Hiring and collaboration",
  },
  {
    id: "products",
    emoji: "🚀",
    title: "Launching Products",
    description: "New offerings, go-to-market",
  },
  {
    id: "operations",
    emoji: "⚙️",
    title: "Streamlining Ops",
    description: "Efficiency and automation",
  },
  {
    id: "cashflow",
    emoji: "💸",
    title: "Managing Cash Flow",
    description: "Runway and liquidity",
  },
]

interface PrimaryFocusStepProps {
  selectedValue: PrimaryFocus | null
  onSelect: (value: PrimaryFocus) => void
  onContinue: () => void
  onBack: () => void
}

export function PrimaryFocusStep({
  selectedValue,
  onSelect,
  onContinue,
  onBack,
}: PrimaryFocusStepProps) {
  return (
    <CardQuestionStep
      icon={Briefcase}
      title="Tell us about your work"
      subtitle="Your agents will use this for relevant advice"
      question="What's your primary focus right now?"
      options={primaryFocusOptions}
      selectedValue={selectedValue}
      onSelect={(value) => onSelect(value as PrimaryFocus)}
      onContinue={onContinue}
      onBack={onBack}
      gridCols={3}
    />
  )
}
