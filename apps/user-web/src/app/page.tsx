import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { createServerSupabaseClient } from "@dreamteam/database/server"
import { HomeHub } from "@/components/home/home-hub"
import { LandingPage } from "@/components/marketing/landing-page"

export const metadata: Metadata = {
  title: "Have up to 38 autonomous AI agents working for you in minutes",
  description: "Finance, CRM, and Team collaboration—all powered by AI. Build, sell, and scale with the tools modern businesses need.",
  openGraph: {
    title: "Have up to 38 autonomous AI agents working for you in minutes",
    description: "Finance, CRM, and Team collaboration—all powered by AI. Build, sell, and scale with the tools modern businesses need.",
    url: "https://dreamteam.ai",
    images: ["/api/og"],
  },
  twitter: {
    title: "Have up to 38 autonomous AI agents working for you in minutes",
    description: "Finance, CRM, and Team collaboration—all powered by AI. Build, sell, and scale with the tools modern businesses need.",
    images: ["/api/og"],
  },
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function Page() {
  const session = await getSession()

  // If user is authenticated, check onboarding status
  if (session) {
    const supabase = await createServerSupabaseClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", session.id)
      .single()

    // Redirect to onboarding if not completed
    if (!profile?.onboarding_completed) {
      redirect("/onboarding")
    }

    return <HomeHub />
  }

  // Otherwise, show the landing page
  return <LandingPage />
}
