"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  Rocket,
  FileText,
  FolderOpen,
  LayoutTemplate,
  PenTool,
  Search,
  ArrowRight,
  Clock,
} from "lucide-react"

const tutorials = [
  {
    title: "Getting Started",
    description: "Create your first page and organize content.",
    icon: Rocket,
    href: "/learn/knowledge/getting-started",
    duration: "5 min",
    level: "Beginner",
  },
  {
    title: "Pages & Editor",
    description: "Create and edit rich content pages.",
    icon: FileText,
    href: "/learn/knowledge/pages",
    duration: "7 min",
    level: "Beginner",
  },
  {
    title: "Categories & Organization",
    description: "Organize pages with color-coded categories.",
    icon: FolderOpen,
    href: "/learn/knowledge/categories",
    duration: "5 min",
    level: "Beginner",
  },
  {
    title: "Templates",
    description: "Build reusable page templates.",
    icon: LayoutTemplate,
    href: "/learn/knowledge/templates",
    duration: "6 min",
    level: "Intermediate",
  },
  {
    title: "Whiteboards",
    description: "Collaborate visually with drawing tools.",
    icon: PenTool,
    href: "/learn/knowledge/whiteboards",
    duration: "5 min",
    level: "Intermediate",
  },
  {
    title: "Search & Favorites",
    description: "Find pages and save favorites.",
    icon: Search,
    href: "/learn/knowledge/search",
    duration: "4 min",
    level: "Beginner",
  },
]

const levelColors = {
  Beginner: "bg-emerald-100 text-emerald-700",
  Intermediate: "bg-blue-100 text-blue-700",
  Advanced: "bg-purple-100 text-purple-700",
}

export default function LearnKnowledgePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-lg bg-violet-100 p-2">
            <BookOpen className="h-6 w-6 text-violet-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Learn Knowledge</h1>
        </div>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Build a shared knowledge base your team can trust. From pages and
          templates to whiteboards and search.
        </p>
      </div>

      {/* Quick Start */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="mb-2 text-xl font-semibold">New to Knowledge?</h2>
              <p className="max-w-md text-muted-foreground">
                Start with our getting started guide to create your first page in
                just 5 minutes.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/learn/knowledge/getting-started">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tutorial Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tutorials.map((tutorial) => {
          const Icon = tutorial.icon
          return (
            <Link key={tutorial.href} href={tutorial.href}>
              <Card className="group h-full cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-muted p-2 transition-colors group-hover:bg-violet-100">
                      <Icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-violet-600" />
                    </div>
                    <Badge
                      variant="secondary"
                      className={levelColors[tutorial.level as keyof typeof levelColors]}
                    >
                      {tutorial.level}
                    </Badge>
                  </div>
                  <CardTitle className="mt-3 text-lg">{tutorial.title}</CardTitle>
                  <CardDescription>{tutorial.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {tutorial.duration} read
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Help Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="mb-1 font-semibold">Need more help?</h3>
              <p className="text-sm text-muted-foreground">
                Contact support for personalized assistance.
              </p>
            </div>
            <Button variant="outline">Contact Support</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
