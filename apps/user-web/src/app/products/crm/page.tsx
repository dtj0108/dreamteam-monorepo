import type { Metadata } from "next"
import { CRMContent } from "./crm-content"

export const metadata: Metadata = {
  title: "CRM",
  description: "Smart sales CRM that helps you close more deals. AI-powered lead scoring and pipeline management.",
  openGraph: {
    title: "CRM | dreamteam.ai",
    description: "Smart sales CRM that helps you close more deals. AI-powered lead scoring and pipeline management.",
    url: "https://dreamteam.ai/products/crm",
    images: ["/api/og?title=CRM&description=Smart%20sales%20pipeline&type=product"],
  },
  twitter: {
    title: "CRM | dreamteam.ai",
    description: "Smart sales CRM that helps you close more deals. AI-powered lead scoring and pipeline management.",
    images: ["/api/og?title=CRM&description=Smart%20sales%20pipeline&type=product"],
  },
}

export default function CRMProductPage() {
  return <CRMContent />
}
