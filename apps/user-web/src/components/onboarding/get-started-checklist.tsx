"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check, ChevronDown, ChevronUp, Rocket, X, PartyPopper } from "lucide-react"
import { cn } from "@/lib/utils"
import type { OnboardingStatus, ChecklistItem as ChecklistItemType } from "@/app/api/account/onboarding/route"

interface GetStartedChecklistProps {
  className?: string
}

export function GetStartedChecklist({ className }: GetStartedChecklistProps) {
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch("/api/account/onboarding")
        if (response.ok) {
          const data = await response.json()
          setStatus(data)

          // Show celebration if just completed
          if (data.isComplete && data.completedCount === data.totalCount) {
            setShowCelebration(true)
            setTimeout(() => setShowCelebration(false), 3000)
          }
        }
      } catch (error) {
        console.error("Failed to fetch onboarding status:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStatus()
  }, [])

  // Don't render if loading, dismissed, or wizard not completed yet
  if (isLoading || isDismissed || !status || !status.onboardingCompleted) {
    return null
  }

  // Don't show if checklist is complete (after celebration)
  if (status.isComplete && !showCelebration) {
    return null
  }

  const items = status.checklistItems || []

  return (
    <div className={cn("rounded-lg border border-border-secondary bg-bg-secondary_subtle", className)}>
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="p-4 text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-green-100">
            <PartyPopper className="size-6 text-green-600" />
          </div>
          <p className="font-semibold text-green-700">All done!</p>
          <p className="text-sm text-text-secondary">You've completed all getting started tasks</p>
        </div>
      )}

      {!showCelebration && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between p-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex flex-1 items-center gap-2 text-left"
            >
              <div className="flex size-6 items-center justify-center rounded-full bg-brand-100">
                <Rocket className="size-3.5 text-brand-600" />
              </div>
              <span className="text-sm font-semibold text-text-primary">Get Started</span>
              <span className="text-xs text-text-tertiary">
                {status.completedCount}/{status.totalCount}
              </span>
              {isExpanded ? (
                <ChevronUp className="ml-auto size-4 text-text-tertiary" />
              ) : (
                <ChevronDown className="ml-auto size-4 text-text-tertiary" />
              )}
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="ml-2 rounded p-1 text-text-tertiary hover:bg-bg-primary_hover hover:text-text-secondary"
              aria-label="Dismiss checklist"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mx-3 h-1 rounded-full bg-bg-quaternary overflow-hidden">
            <div
              className="h-full bg-brand-500 transition-all duration-300"
              style={{ width: `${(status.completedCount / status.totalCount) * 100}%` }}
            />
          </div>

          {/* Items */}
          {isExpanded && (
            <div className="p-2 pt-3">
              <ul className="space-y-1">
                {items.map((item: ChecklistItemType) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                        item.isComplete
                          ? "text-text-tertiary"
                          : "text-text-secondary hover:bg-bg-primary_hover hover:text-text-primary"
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full",
                          item.isComplete
                            ? "bg-success-500 text-white"
                            : "border border-border-primary bg-bg-primary"
                        )}
                      >
                        {item.isComplete ? (
                          <Check className="size-3" strokeWidth={3} />
                        ) : (
                          <span className="size-2 rounded-full bg-text-quaternary" />
                        )}
                      </div>
                      <span className={cn(item.isComplete && "line-through")}>
                        {item.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

