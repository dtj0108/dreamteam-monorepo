"use client"

import { Users } from "lucide-react"
import { CardQuestionStep, type CardOption } from "./card-question-step"
import type { TeamSize } from "@/hooks/use-onboarding-wizard"

const teamSizeOptions: CardOption[] = [
  {
    id: "solo",
    emoji: "👤",
    title: "Just me",
    description: "Solo founder/freelancer",
  },
  {
    id: "small",
    emoji: "👥",
    title: "Small team",
    description: "2-10 people",
  },
  {
    id: "growing",
    emoji: "🏢",
    title: "Growing team",
    description: "11-50 people",
  },
  {
    id: "large",
    emoji: "🏛️",
    title: "Large team",
    description: "50+ people",
  },
]

interface TeamSizeStepProps {
  selectedValue: TeamSize | null
  onSelect: (value: TeamSize) => void
  onContinue: () => void
  onBack: () => void
}

export function TeamSizeStep({
  selectedValue,
  onSelect,
  onContinue,
  onBack,
}: TeamSizeStepProps) {
  return (
    <CardQuestionStep
      icon={Users}
      title="Your team"
      subtitle="Helps agents tailor advice to your scale"
      question="What's your team size?"
      options={teamSizeOptions}
      selectedValue={selectedValue}
      onSelect={(value) => onSelect(value as TeamSize)}
      onContinue={onContinue}
      onBack={onBack}
      gridCols={4}
    />
  )
}
