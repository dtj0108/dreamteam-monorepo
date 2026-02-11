import type { Metadata } from "next"
import { ApiDocsContent } from "./api-docs-content"

export const metadata: Metadata = {
  title: "API Documentation",
  description: "Complete REST API reference for dreamteam.ai. Manage leads, contacts, opportunities, projects, tasks, messages, and more via API.",
  openGraph: {
    title: "API Documentation | dreamteam.ai",
    description: "Complete REST API reference for dreamteam.ai. Manage leads, contacts, opportunities, projects, tasks, messages, and more via API.",
    url: "https://dreamteam.ai/docs/api",
    images: ["/api/og?title=API%20Documentation&description=REST%20API%20Reference&type=marketing"],
  },
  twitter: {
    title: "API Documentation | dreamteam.ai",
    description: "Complete REST API reference for dreamteam.ai. Manage leads, contacts, opportunities, projects, tasks, messages, and more via API.",
    images: ["/api/og?title=API%20Documentation&description=REST%20API%20Reference&type=marketing"],
  },
}

export default function ApiDocsPage() {
  return <ApiDocsContent />
}
