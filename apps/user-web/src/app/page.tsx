import type { Metadata } from "next"
import { getSession } from "@/lib/session"
import { HomeHub } from "@/components/home/home-hub"
import { LandingPage } from "@/components/marketing/landing-page"

export const metadata: Metadata = {
  title: "dreamteam.ai - Business in the AI era",
  description: "Finance, CRM, and Team collaboration—all powered by AI. Build, sell, and scale with the tools modern businesses need.",
  openGraph: {
    title: "dreamteam.ai - Business in the AI era",
    description: "Finance, CRM, and Team collaboration—all powered by AI. Build, sell, and scale with the tools modern businesses need.",
    url: "https://dreamteam.ai",
    images: ["/api/og?title=dreamteam.ai&description=Business%20in%20the%20AI%20era&type=marketing"],
  },
  twitter: {
    title: "dreamteam.ai - Business in the AI era",
    description: "Finance, CRM, and Team collaboration—all powered by AI. Build, sell, and scale with the tools modern businesses need.",
    images: ["/api/og?title=dreamteam.ai&description=Business%20in%20the%20AI%20era&type=marketing"],
  },
}

export default async function Page() {
  const session = await getSession()

  // If user is authenticated, show the home hub
  if (session) {
    return <HomeHub />
  }

  // Otherwise, show the landing page
  return <LandingPage />
}
