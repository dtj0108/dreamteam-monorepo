"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Bot,
  Rocket,
  Search,
  MessageSquare,
  Settings,
  Calendar,
  Brain,
  ClipboardCheck,
  ArrowRight,
  Clock,
} from "lucide-react"

const tutorials = [
  {
    title: "Getting Started",
    description: "Choose a tier, hire your first agent, and chat.",
    icon: Rocket,
    href: "/learn/agents/getting-started",
    duration: "7 min",
    level: "Beginner",
  },
  {
    title: "Discovering & Hiring",
    description: "Browse the marketplace and hire agents.",
    icon: Search,
    href: "/learn/agents/discover",
    duration: "5 min",
    level: "Beginner",
  },
  {
    title: "Agent Chat",
    description: "Interact with agents through the chat interface.",
    icon: MessageSquare,
    href: "/learn/agents/chat",
    duration: "6 min",
    level: "Beginner",
  },
  {
    title: "Configuring Agents",
    description: "Customize style, instructions, and notifications.",
    icon: Settings,
    href: "/learn/agents/configure",
    duration: "7 min",
    level: "Intermediate",
  },
  {
    title: "Schedules & Automation",
    description: "Set up recurring tasks with CRON schedules.",
    icon: Calendar,
    href: "/learn/agents/schedules",
    duration: "8 min",
    level: "Intermediate",
  },
  {
    title: "Autonomy & Business Context",
    description: "Provide context that shapes agent behavior.",
    icon: Brain,
    href: "/learn/agents/autonomy",
    duration: "6 min",
    level: "Intermediate",
  },
  {
    title: "Activity & Approvals",
    description: "Review activity feeds and approve pending actions.",
    icon: ClipboardCheck,
    href: "/learn/agents/activity",
    duration: "7 min",
    level: "Advanced",
  },
]

const levelColors = {
  Beginner: "bg-emerald-100 text-emerald-700",
  Intermediate: "bg-blue-100 text-blue-700",
  Advanced: "bg-purple-100 text-purple-700",
}

export default function LearnAgentsPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-lg bg-sky-100 p-2">
            <Bot className="h-6 w-6 text-sky-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Learn Agents</h1>
        </div>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Hire, configure, and supervise AI agents that automate work across your workspace.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="mb-2 text-xl font-semibold">New to Agents?</h2>
              <p className="max-w-md text-muted-foreground">
                Start with our getting started guide to hire your first agent in minutes.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/learn/agents/getting-started">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tutorials.map((tutorial) => {
          const Icon = tutorial.icon
          return (
            <Link key={tutorial.href} href={tutorial.href}>
              <Card className="group h-full cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-muted p-2 transition-colors group-hover:bg-sky-100">
                      <Icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-sky-600" />
                    </div>
                    <Badge variant="secondary" className={levelColors[tutorial.level as keyof typeof levelColors]}>
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
