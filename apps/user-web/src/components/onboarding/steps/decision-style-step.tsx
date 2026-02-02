"use client"

import { MessageSquare } from "lucide-react"
import { CardQuestionStep, type CardOption } from "./card-question-step"
import type { DecisionStyle } from "@/hooks/use-onboarding-wizard"

const decisionStyleOptions: CardOption[] = [
  {
    id: "data",
    emoji: "📊",
    title: "Show me the data",
    description: "Numbers and evidence first",
  },
  {
    id: "bottomline",
    emoji: "⚡",
    title: "Give me the bottom line",
    description: "Top pick with brief why",
  },
  {
    id: "options",
    emoji: "🔍",
    title: "Show all options",
    description: "Full pros and cons",
  },
  {
    id: "balanced",
    emoji: "⚖️",
    title: "Balance of both",
    description: "Mix of data and advice",
  },
]

interface DecisionStyleStepProps {
  selectedValue: DecisionStyle | null
  onSelect: (value: DecisionStyle) => void
  onContinue: () => void
  onBack: () => void
}

export function DecisionStyleStep({
  selectedValue,
  onSelect,
  onContinue,
  onBack,
}: DecisionStyleStepProps) {
  return (
    <CardQuestionStep
      icon={MessageSquare}
      title="How you like to work"
      subtitle="This helps agents communicate your way"
      question="How do you prefer recommendations?"
      options={decisionStyleOptions}
      selectedValue={selectedValue}
      onSelect={(value) => onSelect(value as DecisionStyle)}
      onContinue={onContinue}
      onBack={onBack}
      gridCols={4}
    />
  )
}
