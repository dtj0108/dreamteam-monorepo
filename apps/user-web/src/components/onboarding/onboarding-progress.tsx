"use client"

import { cn } from "@/lib/utils"

interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
}

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  // Don't show progress on welcome step (step 0)
  if (currentStep === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-background/80 backdrop-blur-sm border-b">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps - 1 }).map((_, index) => {
            const stepIndex = index + 1 // Start from step 1 (skip welcome)
            const isActive = currentStep === stepIndex
            const isCompleted = currentStep > stepIndex

            return (
              <div key={index} className="flex items-center flex-1">
                {/* Step indicator */}
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

                {/* Connector line (not after last step) */}
                {index < totalSteps - 2 && (
                  <div className="flex-1 mx-2">
                    <div
                      className={cn(
                        "h-1 rounded-full transition-colors",
                        currentStep > stepIndex ? "bg-primary/40" : "bg-muted"
                      )}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Step labels */}
        <div className="flex items-center gap-2 mt-2">
          {["Your goals", "Company info"].map((label, index) => {
            const stepIndex = index + 1
            const isActive = currentStep === stepIndex

            return (
              <div key={index} className="flex-1">
                <span
                  className={cn(
                    "text-xs transition-colors",
                    isActive ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
