"use client"

import { useState, useCallback } from "react"

export type PrimaryFocus = "revenue" | "costs" | "team" | "products" | "operations" | "cashflow"
export type IndustryType = "saas" | "ecommerce" | "services" | "healthcare" | "finance" | "other"
export type DecisionStyle = "data" | "bottomline" | "options" | "balanced"
export type TeamSize = "solo" | "small" | "growing" | "large"

export interface OnboardingState {
  currentStep: number
  timezone: string
  primaryFocus: PrimaryFocus | null
  industryType: IndustryType | null
  decisionStyle: DecisionStyle | null
  teamSize: TeamSize | null
  companyName: string
}

const TOTAL_STEPS = 7 // Welcome (0), Timezone (1), Primary Focus (2), Industry (3), Decision Style (4), Team Size (5), Company (6)

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return "UTC"
  }
}

export function useOnboardingWizard(initialCompanyName: string = "") {
  const [state, setState] = useState<OnboardingState>({
    currentStep: 0,
    timezone: getBrowserTimezone(),
    primaryFocus: null,
    industryType: null,
    decisionStyle: null,
    teamSize: null,
    companyName: initialCompanyName,
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

  const setTimezone = useCallback((timezone: string) => {
    setState((prev) => ({ ...prev, timezone }))
  }, [])

  const setPrimaryFocus = useCallback((primaryFocus: PrimaryFocus) => {
    setState((prev) => ({ ...prev, primaryFocus }))
  }, [])

  const setPrimaryFocusAndAdvance = useCallback((primaryFocus: PrimaryFocus) => {
    setState((prev) => ({
      ...prev,
      primaryFocus,
      currentStep: Math.min(prev.currentStep + 1, TOTAL_STEPS - 1),
    }))
  }, [])

  const setIndustryType = useCallback((industryType: IndustryType) => {
    setState((prev) => ({ ...prev, industryType }))
  }, [])

  const setIndustryTypeAndAdvance = useCallback((industryType: IndustryType) => {
    setState((prev) => ({
      ...prev,
      industryType,
      currentStep: Math.min(prev.currentStep + 1, TOTAL_STEPS - 1),
    }))
  }, [])

  const setDecisionStyle = useCallback((decisionStyle: DecisionStyle) => {
    setState((prev) => ({ ...prev, decisionStyle }))
  }, [])

  const setDecisionStyleAndAdvance = useCallback((decisionStyle: DecisionStyle) => {
    setState((prev) => ({
      ...prev,
      decisionStyle,
      currentStep: Math.min(prev.currentStep + 1, TOTAL_STEPS - 1),
    }))
  }, [])

  const setTeamSize = useCallback((teamSize: TeamSize) => {
    setState((prev) => ({ ...prev, teamSize }))
  }, [])

  const setTeamSizeAndAdvance = useCallback((teamSize: TeamSize) => {
    setState((prev) => ({
      ...prev,
      teamSize,
      currentStep: Math.min(prev.currentStep + 1, TOTAL_STEPS - 1),
    }))
  }, [])

  const setCompanyName = useCallback((companyName: string) => {
    setState((prev) => ({ ...prev, companyName }))
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
          timezone: state.timezone,
          primaryFocus: state.primaryFocus,
          industryType: state.industryType,
          decisionStyle: state.decisionStyle,
          teamSize: state.teamSize,
          companyName: state.companyName,
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

  const canSubmit = state.companyName.trim().length > 0

  return {
    ...state,
    totalSteps: TOTAL_STEPS,
    isSubmitting,
    error,
    canSubmit,
    nextStep,
    prevStep,
    setTimezone,
    setPrimaryFocus,
    setPrimaryFocusAndAdvance,
    setIndustryType,
    setIndustryTypeAndAdvance,
    setDecisionStyle,
    setDecisionStyleAndAdvance,
    setTeamSize,
    setTeamSizeAndAdvance,
    setCompanyName,
    submit,
  }
}
