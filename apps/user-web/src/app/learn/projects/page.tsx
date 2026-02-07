"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FolderKanban,
  LayoutGrid,
  List,
  GanttChart,
  CalendarDays,
  Milestone,
  Users,
  CheckSquare,
  ArrowRight,
  Clock,
  Target,
} from "lucide-react"

const tutorials = [
  {
    title: "Getting Started with Projects",
    description: "Learn how to create your first project, add team members, and organize your work.",
    icon: FolderKanban,
    href: "/learn/projects/getting-started",
    duration: "5 min",
    level: "Beginner",
  },
  {
    title: "Using the Kanban Board",
    description: "Master drag-and-drop task management with customizable columns and swimlanes.",
    icon: LayoutGrid,
    href: "/learn/projects/kanban",
    duration: "7 min",
    level: "Beginner",
  },
  {
    title: "Task Management",
    description: "Create tasks, add subtasks, set priorities, assign team members, and track progress.",
    icon: CheckSquare,
    href: "/learn/projects/tasks",
    duration: "8 min",
    level: "Beginner",
  },
  {
    title: "Timeline & Gantt Charts",
    description: "Visualize project schedules, dependencies, and critical paths on a timeline.",
    icon: GanttChart,
    href: "/learn/projects/timeline",
    duration: "10 min",
    level: "Intermediate",
  },
  {
    title: "Calendar View",
    description: "See all your tasks and deadlines on a monthly calendar view.",
    icon: CalendarDays,
    href: "/learn/projects/calendar",
    duration: "4 min",
    level: "Beginner",
  },
  {
    title: "Milestones",
    description: "Set and track key project checkpoints to measure progress.",
    icon: Milestone,
    href: "/learn/projects/milestones",
    duration: "6 min",
    level: "Intermediate",
  },
  {
    title: "Team Workload",
    description: "Monitor team capacity, prevent burnout, and balance resource allocation.",
    icon: Users,
    href: "/learn/projects/workload",
    duration: "8 min",
    level: "Advanced",
  },
  {
    title: "Reports & Analytics",
    description: "Analyze project performance, track velocity, and generate insights.",
    icon: Target,
    href: "/learn/projects/reports",
    duration: "7 min",
    level: "Advanced",
  },
]

const levelColors = {
  Beginner: "bg-emerald-100 text-emerald-700",
  Intermediate: "bg-blue-100 text-blue-700",
  Advanced: "bg-purple-100 text-purple-700",
}

export default function LearnProjectsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-violet-100 rounded-lg">
            <FolderKanban className="h-6 w-6 text-violet-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Learn Projects</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Master project management with our comprehensive tutorials. From basic task
          management to advanced resource planning.
        </p>
      </div>

      {/* Quick Start */}
      <Card className="bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">New to Projects?</h2>
              <p className="text-violet-100 max-w-md">
                Start with our getting started guide to learn the basics in just 5 minutes.
              </p>
            </div>
            <Button asChild variant="secondary" size="lg">
              <Link href="/learn/projects/getting-started">
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
                    <div className="p-2 bg-muted rounded-lg group-hover:bg-violet-100 transition-colors">
                      <Icon className="h-5 w-5 text-muted-foreground group-hover:text-violet-600 transition-colors" />
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

