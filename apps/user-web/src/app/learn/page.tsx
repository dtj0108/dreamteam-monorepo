"use client"

import Link from "next/link"
import { ArrowRight, BookOpen } from "lucide-react"
import { learnSections } from "@/components/learn"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function LearnPage() {
  const starterSections = learnSections.map((section) => ({
    ...section,
    firstTopic: section.topics[0],
  }))

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-sky-100">
            <BookOpen className="h-8 w-8 text-sky-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Learning Center</h1>
            <p className="text-muted-foreground">
              Product guides and playbooks for Finance, Sales, Team, Projects, Knowledge, and Agents.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">New here? Start with a product path</h2>
        <Link
          href="/learn/getting-started"
          className="group flex items-center justify-between p-6 rounded-xl border-2 border-sky-200 bg-sky-50 hover:border-sky-300 transition-colors"
        >
          <div>
            <p className="font-semibold text-lg text-sky-900">Finance Getting Started</p>
            <p className="text-sky-700">
              Learn the platform flow and complete your first core workflows quickly.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-sky-600 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Browse by Product</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {starterSections.map((section) => {
            return (
              <Link key={section.id} href={section.baseHref}>
                <Card className="h-full hover:border-sky-300 hover:shadow-sm transition-all cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">
                          <span className="mr-2">{section.emoji}</span>
                          {section.title}
                        </CardTitle>
                        <CardDescription className="mt-2">{section.description}</CardDescription>
                      </div>
                      <Badge variant="secondary">{section.topics.length} guides</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border bg-muted/40 px-3 py-2">
                      <p className="text-sm font-medium">Start here: {section.firstTopic?.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {section.firstTopic?.description}
                      </p>
                    </div>
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
          We are expanding guides across every product. Support can help with anything missing.
        </p>
      </div>
    </div>
  )
}
