"use client"

import Link from "next/link"
import { BookOpen, ArrowRight, Wallet, Receipt, Target, TrendingUp, Flag, Rocket } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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

export default function DemoLearnPage() {
  return (
    <div>
      {/* Hero Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-sky-100">
            <BookOpen className="h-8 w-8 text-sky-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Learning Center</h1>
            <p className="text-muted-foreground">
              Everything you need to master your business finances
            </p>
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">New here? Start with the basics</h2>
        <Link
          href="/demo/learn/getting-started"
          className="group flex items-center justify-between p-6 rounded-xl border-2 border-sky-200 bg-sky-50 hover:border-sky-300 transition-colors"
        >
          <div>
            <p className="font-semibold text-lg text-sky-900">Getting Started Guide</p>
            <p className="text-sky-700">
              Learn the fundamentals and set up your first account in minutes
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-sky-600 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* All Topics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Browse All Topics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {demoArticles.map((article) => {
            const Icon = article.icon
            return (
              <Link key={article.href} href={article.href}>
                <Card className="h-full hover:border-sky-300 hover:shadow-sm transition-all cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-5 w-5 text-sky-600" />
                      </div>
                      <CardTitle className="text-base">{article.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{article.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Help Footer */}
      <div className="mt-12 p-6 rounded-xl bg-muted/50 text-center">
        <p className="text-muted-foreground mb-2">
          Can&apos;t find what you&apos;re looking for?
        </p>
        <p className="text-sm text-muted-foreground">
          Our documentation is constantly improving. Check back soon for more guides!
        </p>
      </div>
    </div>
  )
}

