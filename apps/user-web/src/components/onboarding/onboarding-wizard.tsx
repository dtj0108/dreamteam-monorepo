"use client"

import { useRouter } from "next/navigation"
import { AnimatePresence } from "motion/react"
import { useOnboardingWizard } from "@/hooks/use-onboarding-wizard"
import { OnboardingProgress } from "./onboarding-progress"
import { WelcomeStep } from "./steps/welcome-step"
import { GoalStep } from "./steps/goal-step"
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
      {/* Progress indicator (shown on steps 1-2) */}
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
            <GoalStep
              key="goal"
              selectedGoal={wizard.goal}
              onSelect={wizard.setGoal}
              onContinue={wizard.nextStep}
              onBack={wizard.prevStep}
              canContinue={wizard.canProceedFromGoal}
            />
          )}

          {wizard.currentStep === 2 && (
            <CompanyStep
              key="company"
              companyName={wizard.companyName}
              onCompanyNameChange={wizard.setCompanyName}
              selectedIndustry={wizard.industryType}
              onIndustrySelect={wizard.setIndustryType}
              selectedTeamSize={wizard.teamSize}
              onTeamSizeSelect={wizard.setTeamSize}
              onSubmit={handleSubmit}
              onBack={wizard.prevStep}
              canSubmit={wizard.canProceedFromCompany}
              isSubmitting={wizard.isSubmitting}
              error={wizard.error}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
