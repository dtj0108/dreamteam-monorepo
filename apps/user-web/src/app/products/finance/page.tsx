import type { Metadata } from "next"
import { FinanceContent } from "./finance-content"

export const metadata: Metadata = {
  title: "Finance",
  description: "AI-powered finance management. Track expenses, manage budgets, and get intelligent insights for your business.",
  openGraph: {
    title: "Finance | dreamteam.ai",
    description: "AI-powered finance management. Track expenses, manage budgets, and get intelligent insights.",
    url: "https://dreamteam.ai/products/finance",
    images: ["/api/og?title=Finance&description=AI-powered%20bookkeeping&type=product"],
  },
  twitter: {
    title: "Finance | dreamteam.ai",
    description: "AI-powered finance management. Track expenses, manage budgets, and get intelligent insights.",
    images: ["/api/og?title=Finance&description=AI-powered%20bookkeeping&type=product"],
  },
}

export default function FinanceProductPage() {
  return <FinanceContent />
}
