import type { Metadata } from "next"
import { TeamContent } from "./team-content"

export const metadata: Metadata = {
  title: "Team",
  description: "Team collaboration reimagined. Messaging, calls, and coordination with AI assistance.",
  openGraph: {
    title: "Team | dreamteam.ai",
    description: "Team collaboration reimagined. Messaging, calls, and coordination with AI assistance.",
    url: "https://dreamteam.ai/products/team",
    images: ["/api/og?title=Team&description=Real-time%20collaboration&type=product"],
  },
  twitter: {
    title: "Team | dreamteam.ai",
    description: "Team collaboration reimagined. Messaging, calls, and coordination with AI assistance.",
    images: ["/api/og?title=Team&description=Real-time%20collaboration&type=product"],
  },
}

export default function TeamProductPage() {
  return <TeamContent />
}
