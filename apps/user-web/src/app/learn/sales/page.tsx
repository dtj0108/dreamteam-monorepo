"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Rocket,
  Users,
  Contact,
  TrendingUp,
  Inbox,
  Workflow,
  FileText,
  BarChart3,
  ArrowRight,
  Clock,
} from "lucide-react"

const tutorials = [
  {
    title: "Getting Started",
    description: "Set up your workspace and create your first lead.",
    icon: Rocket,
    href: "/learn/sales/getting-started",
    duration: "6 min",
    level: "Beginner",
  },
  {
    title: "Lead Management",
    description: "Create, organize, and track leads with smart views.",
    icon: Users,
    href: "/learn/sales/leads",
    duration: "7 min",
    level: "Beginner",
  },
  {
    title: "Contacts & Communication",
    description: "Manage contacts and their communication details.",
    icon: Contact,
    href: "/learn/sales/contacts",
    duration: "5 min",
    level: "Beginner",
  },
  {
    title: "Opportunities & Pipeline",
    description: "Track deals through pipeline stages to close.",
    icon: TrendingUp,
    href: "/learn/sales/opportunities",
    duration: "8 min",
    level: "Intermediate",
  },
  {
    title: "Inbox & Conversations",
    description: "Manage email and SMS from a unified inbox.",
    icon: Inbox,
    href: "/learn/sales/inbox",
    duration: "5 min",
    level: "Beginner",
  },
  {
    title: "Workflows & Automation",
    description: "Build multi-step outreach sequences.",
    icon: Workflow,
    href: "/learn/sales/workflows",
    duration: "8 min",
    level: "Intermediate",
  },
  {
    title: "Email & SMS Templates",
    description: "Create reusable templates with dynamic tags.",
    icon: FileText,
    href: "/learn/sales/templates",
    duration: "7 min",
    level: "Intermediate",
  },
  {
    title: "Reports & Analytics",
    description: "Analyze activity and pipeline performance.",
    icon: BarChart3,
    href: "/learn/sales/reports",
    duration: "6 min",
    level: "Advanced",
  },
]

const levelColors = {
  Beginner: "bg-emerald-100 text-emerald-700",
  Intermediate: "bg-blue-100 text-blue-700",
  Advanced: "bg-purple-100 text-purple-700",
}

export default function LearnSalesPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Learn Sales</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Master your sales pipeline from lead capture to closed-won. Learn how to manage
          contacts, track opportunities, and automate outreach.
        </p>
      </div>

      {/* Quick Start */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">New to Sales?</h2>
              <p className="text-muted-foreground max-w-md">
                Start with our getting started guide to set up your workspace in just 6 minutes.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/learn/sales/getting-started">
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
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="p-2 bg-muted rounded-lg group-hover:bg-emerald-100 transition-colors">
                      <Icon className="h-5 w-5 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                    </div>
                    <Badge variant="secondary" className={levelColors[tutorial.level as keyof typeof levelColors]}>
                      {tutorial.level}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{tutorial.title}</CardTitle>
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
              <h3 className="font-semibold mb-1">Need more help?</h3>
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
