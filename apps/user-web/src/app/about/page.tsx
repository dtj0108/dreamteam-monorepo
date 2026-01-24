import type { Metadata } from "next"
import { AboutContent } from "./about-content"

export const metadata: Metadata = {
  title: "About",
  description: "Learn about dreamteam.ai and our mission to transform how businesses operate in the AI era.",
  openGraph: {
    title: "About | dreamteam.ai",
    description: "Learn about dreamteam.ai and our mission to transform how businesses operate in the AI era.",
    url: "https://dreamteam.ai/about",
    images: ["/api/og?title=About%20dreamteam.ai&description=Our%20mission%20to%20transform%20business&type=marketing"],
  },
  twitter: {
    title: "About | dreamteam.ai",
    description: "Learn about dreamteam.ai and our mission to transform how businesses operate in the AI era.",
    images: ["/api/og?title=About%20dreamteam.ai&description=Our%20mission%20to%20transform%20business&type=marketing"],
  },
}

export default function AboutPage() {
  return <AboutContent />
}
