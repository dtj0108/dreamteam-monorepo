import type { Metadata } from "next"
import { PricingContent } from "./pricing-content"

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing for teams of all sizes. Start free, scale as you grow.",
  openGraph: {
    title: "Pricing | dreamteam.ai",
    description: "Simple, transparent pricing for teams of all sizes. Start free, scale as you grow.",
    url: "https://dreamteam.ai/pricing",
    images: ["/api/og?title=Pricing&description=Simple%2C%20transparent%20pricing&type=marketing"],
  },
  twitter: {
    title: "Pricing | dreamteam.ai",
    description: "Simple, transparent pricing for teams of all sizes. Start free, scale as you grow.",
    images: ["/api/og?title=Pricing&description=Simple%2C%20transparent%20pricing&type=marketing"],
  },
}

export default function PricingPage() {
  return <PricingContent />
}
