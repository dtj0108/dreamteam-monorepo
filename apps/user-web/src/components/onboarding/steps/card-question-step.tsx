"use client"

import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { motion } from "motion/react"
import type { LucideIcon } from "lucide-react"

export interface CardOption {
  id: string
  emoji: string
  title: string
  description: string
}

interface CardQuestionStepProps {
  icon: LucideIcon
  title: string
  subtitle: string
  question: string
  options: CardOption[]
  selectedValue: string | null
  onSelect: (value: string) => void
  onContinue: () => void
  onBack: () => void
  gridCols?: 3 | 4
}

export function CardQuestionStep({
  icon: Icon,
  title,
  subtitle,
  question,
  options,
  selectedValue,
  onSelect,
  onContinue,
  onBack,
  gridCols = 3,
}: CardQuestionStepProps) {
  const gridClassName = gridCols === 4
    ? "grid grid-cols-2 sm:grid-cols-4 gap-4"
    : "grid grid-cols-2 sm:grid-cols-3 gap-4"

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
          <Icon className="text-primary-foreground size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {/* Question */}
      <div className="space-y-3 mb-8">
        <Label className="text-base font-medium">{question}</Label>
        <RadioGroup
          value={selectedValue || ""}
          onValueChange={onSelect}
          className={gridClassName}
        >
          {options.map((option) => (
            <div key={option.id} className="relative h-full">
              <RadioGroupItem
                value={option.id}
                id={`option-${option.id}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`option-${option.id}`}
                className="peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:border-primary hover:border-primary/50 flex h-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 min-h-[120px] justify-center text-center transition-all"
              >
                <span className="text-2xl">{option.emoji}</span>
                <span className="font-semibold">{option.title}</span>
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onContinue} disabled={!selectedValue}>
          Continue
        </Button>
      </div>
    </motion.div>
  )
}
