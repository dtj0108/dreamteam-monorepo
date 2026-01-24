"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { DemoDashboardLayout } from "@/components/demo/demo-dashboard-layout"
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

const demoArticles = [
  {
    title: "Getting Started",
    href: "/demo/learn/getting-started",
    icon: Rocket,
    description: "First steps with dreamteam.ai",
  },
  {
    title: "Managing Accounts",
    href: "/demo/learn/accounts",
    icon: Wallet,
    description: "Bank accounts and balances",
  },
  {
    title: "Transactions",
    href: "/demo/learn/transactions",
    icon: Receipt,
    description: "Track income and expenses",
  },
  {
    title: "Budgets",
    href: "/demo/learn/budgets",
    icon: Target,
    description: "Plan and control spending",
  },
  {
    title: "Analytics & Reports",
    href: "/demo/learn/analytics",
    icon: TrendingUp,
    description: "Insights and reporting",
  },
  {
    title: "Goals",
    href: "/demo/learn/goals",
    icon: Flag,
    description: "Revenue, profit, and exit planning",
  },
]

function DemoLearnSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 border-r bg-muted/30 sticky top-0 h-screen overflow-y-auto">
      <div className="p-4 border-b">
        <Link href="/demo/learn" className="flex items-center gap-2 font-semibold">
          <BookOpen className="h-5 w-5 text-sky-600" />
          <span>Learning Center</span>
        </Link>
      </div>
      <nav className="p-4">
        <ul className="space-y-1">
          {demoArticles.map((article) => {
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

export default function DemoLearnLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DemoDashboardLayout breadcrumbs={[{ label: "Learn" }]}>
      <div className="flex min-h-[calc(100vh-5rem)] -mx-4 -mb-4 -mt-4">
        <DemoLearnSidebar />
        <main className="flex-1 overflow-y-auto p-8 bg-background">
          <div className="max-w-3xl">
            {children}
          </div>
        </main>
      </div>
    </DemoDashboardLayout>
  )
}

export { demoArticles }

