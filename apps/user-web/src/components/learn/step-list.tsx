"use client"

import { cn } from "@/lib/utils"

interface Step {
  title: string
  description: string
}

interface StepListProps {
  steps: Step[]
  className?: string
}

export function StepList({ steps, className }: StepListProps) {
  return (
    <ol className={cn("space-y-4 my-6", className)}>
      {steps.map((step, index) => (
        <li key={index} className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-semibold text-sm">
            {index + 1}
          </div>
          <div className="pt-1">
            <p className="font-semibold mb-1">{step.title}</p>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

