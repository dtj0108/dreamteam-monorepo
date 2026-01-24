"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  BookOpen,
  Wallet,
  Receipt,
  Target,
  TrendingUp,
  Flag,
  Rocket,
} from "lucide-react"

const articles = [
  {
    title: "Getting Started",
    href: "/learn/getting-started",
    icon: Rocket,
    description: "First steps with dreamteam.ai",
  },
  {
    title: "Managing Accounts",
    href: "/learn/accounts",
    icon: Wallet,
    description: "Bank accounts and balances",
  },
  {
    title: "Transactions",
    href: "/learn/transactions",
    icon: Receipt,
    description: "Track income and expenses",
  },
  {
    title: "Budgets",
    href: "/learn/budgets",
    icon: Target,
    description: "Plan and control spending",
  },
  {
    title: "Analytics & Reports",
    href: "/learn/analytics",
    icon: TrendingUp,
    description: "Insights and reporting",
  },
  {
    title: "Goals",
    href: "/learn/goals",
    icon: Flag,
    description: "Revenue, profit, and exit planning",
  },
]

export function LearnSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 border-r bg-muted/30 sticky top-0 h-screen overflow-y-auto">
      <div className="p-4 border-b">
        <Link href="/learn" className="flex items-center gap-2 font-semibold">
          <BookOpen className="h-5 w-5 text-sky-600" />
          <span>Learning Center</span>
        </Link>
      </div>
      <nav className="p-4">
        <ul className="space-y-1">
          {articles.map((article) => {
            const isActive = pathname === article.href
            const Icon = article.icon
            return (
              <li key={article.href}>
                <Link
                  href={article.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-sky-100 text-sky-700 font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{article.title}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

export { articles }

