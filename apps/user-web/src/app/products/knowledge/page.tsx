import type { Metadata } from "next"
import { KnowledgeContent } from "./knowledge-content"

export const metadata: Metadata = {
  title: "Knowledge",
  description: "Your team's knowledge base. Documents, whiteboards, and AI-powered search.",
  openGraph: {
    title: "Knowledge | dreamteam.ai",
    description: "Your team's knowledge base. Documents, whiteboards, and AI-powered search.",
    url: "https://dreamteam.ai/products/knowledge",
    images: ["/api/og?title=Knowledge&description=Your%20company%27s%20second%20brain&type=product"],
  },
  twitter: {
    title: "Knowledge | dreamteam.ai",
    description: "Your team's knowledge base. Documents, whiteboards, and AI-powered search.",
    images: ["/api/og?title=Knowledge&description=Your%20company%27s%20second%20brain&type=product"],
  },
}

export default function KnowledgeProductPage() {
  return <KnowledgeContent />
}
