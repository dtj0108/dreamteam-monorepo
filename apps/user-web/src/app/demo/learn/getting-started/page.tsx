"use client"

import Link from "next/link"
import { Rocket, ArrowRight, CheckCircle2, Wallet, Receipt, Target, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function DemoGettingStartedPage() {
  const steps = [
    {
      number: 1,
      title: "Add Your Accounts",
      description: "Connect your business bank accounts and credit cards to get a complete view of your finances.",
      icon: Wallet,
      link: "/demo/accounts",
    },
    {
      number: 2,
      title: "Import Transactions",
      description: "Upload CSV exports from your bank or manually add transactions. Our AI will categorize them automatically.",
      icon: Receipt,
      link: "/demo/transactions",
    },
    {
      number: 3,
      title: "Set Up Budgets",
      description: "Create budgets for different expense categories to track and control your spending.",
      icon: Target,
      link: "/demo/budgets",
    },
    {
      number: 4,
      title: "Track Your Goals",
      description: "Set revenue, profit, and exit goals to stay focused on what matters for your business.",
      icon: TrendingUp,
      link: "/demo/goals",
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-sky-100">
            <Rocket className="h-8 w-8 text-sky-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Getting Started</h1>
            <p className="text-muted-foreground">
              Set up dreamteam.ai in just a few minutes
            </p>
          </div>
        </div>
      </div>

      {/* Introduction */}
      <div className="prose prose-slate max-w-none mb-8">
        <p className="text-lg text-muted-foreground">
          Welcome to dreamteam.ai! This guide will walk you through the essential steps to get your 
          business finances organized and start tracking your path to exit.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-4 mb-8">
        {steps.map((step) => {
          const Icon = step.icon
          return (
            <Card key={step.number}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 font-semibold">
                    {step.number}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-sky-600" />
                      {step.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {step.description}
                    </CardDescription>
                  </div>
                  <Link href={step.link}>
                    <Button variant="outline" size="sm">
                      Try it
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      {/* Tips */}
      <Card className="bg-emerald-50 border-emerald-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="h-5 w-5" />
            Pro Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-emerald-800">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-1 shrink-0" />
              <span>Start by importing your last 3 months of transactions for better trend analysis</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-1 shrink-0" />
              <span>Set up subscription tracking to find unused software licenses</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-1 shrink-0" />
              <span>Use the Exit Plan feature to model your business valuation</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <div className="mt-8 p-6 rounded-xl bg-muted/50">
        <h3 className="font-semibold mb-2">Ready to explore more?</h3>
        <p className="text-muted-foreground mb-4">
          Check out the other guides to learn about specific features.
        </p>
        <Link href="/demo/learn">
          <Button variant="outline">
            Browse All Topics
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

