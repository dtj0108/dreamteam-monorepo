"use client"

import { useRouter } from "next/navigation"
import { AnimatePresence } from "motion/react"
import { useOnboardingWizard } from "@/hooks/use-onboarding-wizard"
import { OnboardingProgress } from "./onboarding-progress"
import { WelcomeStep } from "./steps/welcome-step"
import { PrimaryFocusStep } from "./steps/primary-focus-step"
import { IndustryStep } from "./steps/industry-step"
import { DecisionStyleStep } from "./steps/decision-style-step"
import { TeamSizeStep } from "./steps/team-size-step"
import { CompanyStep } from "./steps/company-step"

interface OnboardingWizardProps {
  userName: string
  initialCompanyName?: string
}

export function OnboardingWizard({ userName, initialCompanyName = "" }: OnboardingWizardProps) {
  const router = useRouter()
  const wizard = useOnboardingWizard(initialCompanyName)

  const handleSubmit = async () => {
    const success = await wizard.submit()
    if (success) {
      router.push("/")
      router.refresh()
    }
  }

  return (
    <div className="relative">
      {/* Progress indicator (shown on steps 1-5) */}
      <OnboardingProgress
        currentStep={wizard.currentStep}
        totalSteps={wizard.totalSteps}
      />

      {/* Step content with padding for progress bar */}
      <div className={wizard.currentStep > 0 ? "pt-20" : ""}>
        <AnimatePresence mode="wait">
          {wizard.currentStep === 0 && (
            <WelcomeStep
              key="welcome"
              userName={userName}
              onContinue={wizard.nextStep}
            />
          )}

          {wizard.currentStep === 1 && (
            <PrimaryFocusStep
              key="primary-focus"
              selectedValue={wizard.primaryFocus}
              onSelect={wizard.setPrimaryFocus}
              onContinue={wizard.nextStep}
              onBack={wizard.prevStep}
            />
          )}

          {wizard.currentStep === 2 && (
            <IndustryStep
              key="industry"
              selectedValue={wizard.industryType}
              onSelect={wizard.setIndustryType}
              onContinue={wizard.nextStep}
              onBack={wizard.prevStep}
            />
          )}

          {wizard.currentStep === 3 && (
            <DecisionStyleStep
              key="decision-style"
              selectedValue={wizard.decisionStyle}
              onSelect={wizard.setDecisionStyle}
              onContinue={wizard.nextStep}
              onBack={wizard.prevStep}
            />
          )}

          {wizard.currentStep === 4 && (
            <TeamSizeStep
              key="team-size"
              selectedValue={wizard.teamSize}
              onSelect={wizard.setTeamSize}
              onContinue={wizard.nextStep}
              onBack={wizard.prevStep}
            />
          )}

          {wizard.currentStep === 5 && (
            <CompanyStep
              key="company"
              companyName={wizard.companyName}
              onCompanyNameChange={wizard.setCompanyName}
              onSubmit={handleSubmit}
              onBack={wizard.prevStep}
              canSubmit={wizard.canSubmit}
              isSubmitting={wizard.isSubmitting}
              error={wizard.error}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
