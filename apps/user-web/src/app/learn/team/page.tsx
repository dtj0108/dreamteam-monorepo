"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  MessageSquare,
  Rocket,
  Hash,
  MessageCircle,
  Paperclip,
  Video,
  Search,
  ArrowRight,
  Clock,
} from "lucide-react"

const tutorials = [
  {
    title: "Getting Started",
    description: "Browse channels, send messages, and start DMs.",
    icon: Rocket,
    href: "/learn/team/getting-started",
    duration: "5 min",
    level: "Beginner",
  },
  {
    title: "Channels",
    description: "Create and manage public and private channels.",
    icon: Hash,
    href: "/learn/team/channels",
    duration: "7 min",
    level: "Beginner",
  },
  {
    title: "Direct Messages",
    description: "Start private conversations with teammates.",
    icon: MessageCircle,
    href: "/learn/team/direct-messages",
    duration: "4 min",
    level: "Beginner",
  },
  {
    title: "File Sharing",
    description: "Share and browse files across conversations.",
    icon: Paperclip,
    href: "/learn/team/files",
    duration: "5 min",
    level: "Beginner",
  },
  {
    title: "Meetings & Calls",
    description: "Start calls from channels and direct messages.",
    icon: Video,
    href: "/learn/team/meetings",
    duration: "6 min",
    level: "Intermediate",
  },
  {
    title: "Search & Mentions",
    description: "Find messages and track @mentions.",
    icon: Search,
    href: "/learn/team/search",
    duration: "5 min",
    level: "Intermediate",
  },
]

const levelColors = {
  Beginner: "bg-emerald-100 text-emerald-700",
  Intermediate: "bg-blue-100 text-blue-700",
  Advanced: "bg-purple-100 text-purple-700",
}

export default function LearnTeamPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-lg bg-orange-100 p-2">
            <MessageSquare className="h-6 w-6 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Learn Team</h1>
        </div>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Master real-time communication with channels, direct messages, file sharing, and meetings.
        </p>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <h2 className="text-xl font-semibold">New to Team?</h2>
            <p className="mt-1 text-muted-foreground">
              Start with our getting started guide to set up your communication workspace.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/learn/team/getting-started">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
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
                    <div className="rounded-lg bg-muted p-2 transition-colors group-hover:bg-orange-100">
                      <Icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-orange-600" />
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
    </div>
  )
}
