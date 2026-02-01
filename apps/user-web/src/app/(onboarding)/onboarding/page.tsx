import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { createServerSupabaseClient } from "@dreamteam/database/server"
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard"

export default async function OnboardingPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  // Check if onboarding is already completed
  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, name, company_name")
    .eq("id", session.id)
    .single()

  if (profile?.onboarding_completed) {
    redirect("/")
  }

  return (
    <OnboardingWizard
      userName={profile?.name || session.name || "there"}
      initialCompanyName={profile?.company_name || ""}
    />
  )
}
