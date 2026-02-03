"use client"

import { cn } from "@/lib/utils"

interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
}

const stepLabels = ["Timezone", "Focus", "Industry", "Style", "Team", "Finish"]

export function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
  // Don't show progress on welcome step (step 0)
  if (currentStep === 0) return null

  const displaySteps = 6 // Steps 1-6 (excluding welcome)

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-background/80 backdrop-blur-sm border-b">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex justify-between">
          {/* Connector line background */}
          <div className="absolute top-4 left-4 right-4 h-1 bg-muted rounded-full" />

          {/* Completed connector overlay */}
          <div
            className="absolute top-4 left-4 h-1 bg-primary/40 rounded-full transition-all"
            style={{
              width: currentStep > 1
                ? `calc(${((currentStep - 1) / (displaySteps - 1)) * 100}% - 32px)`
                : 0
            }}
          />

          {/* Step indicators */}
          {Array.from({ length: displaySteps }).map((_, index) => {
            const stepIndex = index + 1
            const isActive = currentStep === stepIndex
            const isCompleted = currentStep > stepIndex

            return (
              <div key={index} className="relative z-10 flex flex-col items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                    isActive && "bg-primary text-primary-foreground",
                    isCompleted && "bg-primary/20 text-primary",
                    !isActive && !isCompleted && "bg-muted text-muted-foreground"
                  )}
                >
                  {stepIndex}
                </div>
                <span
                  className={cn(
                    "text-xs mt-1.5 transition-colors",
                    isActive ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  {stepLabels[index]}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
