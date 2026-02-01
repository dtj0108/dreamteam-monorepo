"use client"

import { useState, useCallback } from "react"

export type OnboardingGoal = "finance" | "sales" | "team" | "projects" | "knowledge" | "agents"
export type IndustryType = "saas" | "retail" | "service" | "general"
export type TeamSize = "solo" | "small" | "medium" | "large"

export interface OnboardingState {
  currentStep: number
  goal: OnboardingGoal | null
  companyName: string
  industryType: IndustryType | null
  teamSize: TeamSize | null
}

const TOTAL_STEPS = 3 // Welcome (0), Goal (1), Company (2)

export function useOnboardingWizard(initialCompanyName: string = "") {
  const [state, setState] = useState<OnboardingState>({
    currentStep: 0,
    goal: null,
    companyName: initialCompanyName,
    industryType: null,
    teamSize: null,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, TOTAL_STEPS - 1),
    }))
  }, [])

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }))
  }, [])

  const setGoal = useCallback((goal: OnboardingGoal) => {
    setState((prev) => ({ ...prev, goal }))
  }, [])

  const setCompanyName = useCallback((companyName: string) => {
    setState((prev) => ({ ...prev, companyName }))
  }, [])

  const setIndustryType = useCallback((industryType: IndustryType) => {
    setState((prev) => ({ ...prev, industryType }))
  }, [])

  const setTeamSize = useCallback((teamSize: TeamSize) => {
    setState((prev) => ({ ...prev, teamSize }))
  }, [])

  const submit = useCallback(async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/account/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboardingCompleted: true,
          goal: state.goal,
          companyName: state.companyName,
          industryType: state.industryType,
          teamSize: state.teamSize,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save onboarding data")
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [state])

  const canProceedFromGoal = state.goal !== null
  const canProceedFromCompany = state.companyName.trim().length > 0 && state.industryType !== null && state.teamSize !== null

  return {
    ...state,
    totalSteps: TOTAL_STEPS,
    isSubmitting,
    error,
    canProceedFromGoal,
    canProceedFromCompany,
    nextStep,
    prevStep,
    setGoal,
    setCompanyName,
    setIndustryType,
    setTeamSize,
    submit,
  }
}
