"use client"

import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { motion } from "motion/react"
import { Target } from "lucide-react"
import type { OnboardingGoal } from "@/hooks/use-onboarding-wizard"

const goals = [
  {
    id: "finance" as OnboardingGoal,
    emoji: "💰",
    title: "Finance",
    description: "Track finances, manage budgets, and analyze spending",
  },
  {
    id: "sales" as OnboardingGoal,
    emoji: "🤝",
    title: "Sales",
    description: "Manage leads, track deals, and grow revenue",
  },
  {
    id: "team" as OnboardingGoal,
    emoji: "💬",
    title: "Team",
    description: "Collaborate with your team and stay connected",
  },
  {
    id: "projects" as OnboardingGoal,
    emoji: "📋",
    title: "Projects",
    description: "Organize tasks and track milestones",
  },
  {
    id: "knowledge" as OnboardingGoal,
    emoji: "📚",
    title: "Knowledge",
    description: "Build docs, templates, and resources",
  },
  {
    id: "agents" as OnboardingGoal,
    emoji: "🤖",
    title: "Agents",
    description: "Create AI automation for your workflows",
  },
]

interface GoalStepProps {
  selectedGoal: OnboardingGoal | null
  onSelect: (goal: OnboardingGoal) => void
  onContinue: () => void
  onBack: () => void
  canContinue: boolean
}

export function GoalStep({
  selectedGoal,
  onSelect,
  onContinue,
  onBack,
  canContinue,
}: GoalStepProps) {
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
          <Target className="text-primary-foreground size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">What&apos;s your primary goal?</h1>
          <p className="text-muted-foreground">
            We&apos;ll customize your experience based on what matters most to you.
          </p>
        </div>
      </div>

      {/* Goal Selection Grid */}
      <RadioGroup
        value={selectedGoal || ""}
        onValueChange={(value) => onSelect(value as OnboardingGoal)}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
      >
        {goals.map((goal) => (
          <div key={goal.id} className="relative">
            <RadioGroupItem
              value={goal.id}
              id={goal.id}
              className="peer sr-only"
            />
            <Label
              htmlFor={goal.id}
              className="peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:border-primary hover:border-primary/50 flex cursor-pointer flex-col items-start gap-2 rounded-xl border-2 px-5 py-4 transition-all"
            >
              <span className="text-3xl">{goal.emoji}</span>
              <span className="text-lg font-semibold">{goal.title}</span>
              <span className="text-sm text-muted-foreground leading-relaxed">
                {goal.description}
              </span>
            </Label>
          </div>
        ))}
      </RadioGroup>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onContinue} disabled={!canContinue}>
          Continue
        </Button>
      </div>
    </motion.div>
  )
}
