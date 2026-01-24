import type { Metadata } from "next"
import { DemoWrapper } from "./demo-wrapper"

export const metadata: Metadata = {
  title: "Demo",
  description: "Explore dreamteam.ai with sample data. Try all features without signing up.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Demo | dreamteam.ai",
    description: "Explore dreamteam.ai with sample data. Try all features without signing up.",
    url: "https://dreamteam.ai/demo",
    images: ["/api/og?title=Demo&description=Try%20all%20features%20free&type=demo"],
  },
  twitter: {
    title: "Demo | dreamteam.ai",
    description: "Explore dreamteam.ai with sample data. Try all features without signing up.",
    images: ["/api/og?title=Demo&description=Try%20all%20features%20free&type=demo"],
  },
}

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DemoWrapper>{children}</DemoWrapper>
}
