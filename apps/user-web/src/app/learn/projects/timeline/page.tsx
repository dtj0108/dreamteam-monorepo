"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  GanttChart,
  ArrowRight,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Calendar,
  Link2,
  CheckCircle2,
  Lightbulb,
} from "lucide-react"

export default function TimelineTutorialPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/learn/projects" className="hover:text-foreground">
          Learn Projects
        </Link>
        <span>/</span>
        <span>Timeline & Gantt Charts</span>
      </div>

      {/* Header */}
      <div>
        <Badge variant="secondary" className="mb-3 bg-blue-100 text-blue-700">
          Intermediate • 10 min read
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Timeline & Gantt Charts
        </h1>
        <p className="text-lg text-muted-foreground">
          Visualize your project schedule, manage dependencies, and track progress
          over time with the Timeline view.
        </p>
      </div>

      <Separator />

      {/* Content */}
      <div className="prose prose-gray max-w-none">
        <h2>Understanding the Timeline View</h2>
        <p>
          The Timeline (Gantt chart) provides a visual representation of your project
          schedule. Each task appears as a bar spanning from its start date to its
          due date.
        </p>

        <Card className="not-prose my-4 p-4 overflow-hidden">
          <div className="text-sm font-medium text-muted-foreground mb-3">Timeline Preview</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-24 text-sm truncate">Design</span>
              <div className="flex-1 h-6 bg-muted rounded relative">
                <div className="absolute left-[10%] w-[30%] h-full bg-blue-500 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-24 text-sm truncate">Development</span>
              <div className="flex-1 h-6 bg-muted rounded relative">
                <div className="absolute left-[35%] w-[40%] h-full bg-emerald-500 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-24 text-sm truncate">Testing</span>
              <div className="flex-1 h-6 bg-muted rounded relative">
                <div className="absolute left-[70%] w-[20%] h-full bg-amber-500 rounded" />
              </div>
            </div>
          </div>
        </Card>

        <h2 className="mt-8">Navigation Controls</h2>
        
        <div className="not-prose grid grid-cols-2 gap-4 my-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ZoomIn className="h-5 w-5 text-muted-foreground" />
              <ZoomOut className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="font-medium">Zoom Levels</p>
            <p className="text-sm text-muted-foreground">
              Switch between Day, Week, and Month views to see more or less detail
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="font-medium">Date Navigation</p>
            <p className="text-sm text-muted-foreground">
              Use arrows to scroll through time, or click &quot;Today&quot; to jump to current date
            </p>
          </Card>
        </div>

        <h2 className="mt-8">Task Dependencies</h2>
        <p>
          Dependencies show relationships between tasks—which tasks must complete before
          others can begin.
        </p>

        <Card className="not-prose my-4">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-violet-100 rounded-lg shrink-0">
                <Link2 className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="font-medium">Dependency Types:</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>• <strong>Finish-to-Start:</strong> Task B can&apos;t start until Task A finishes (most common)</li>
                  <li>• <strong>Start-to-Start:</strong> Task B can&apos;t start until Task A starts</li>
                  <li>• <strong>Finish-to-Finish:</strong> Task B can&apos;t finish until Task A finishes</li>
                  <li>• <strong>Start-to-Finish:</strong> Task B can&apos;t finish until Task A starts</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="mt-8">Reading the Timeline</h2>
        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <strong>Bar length:</strong> Represents task duration
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <strong>Bar color:</strong> Indicates task status
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <strong>Position:</strong> Shows when the task is scheduled
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <strong>Today line:</strong> Vertical line marking the current date
          </li>
        </ul>

        <Card className="not-prose my-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">Pro Tip</p>
                <p className="text-sm text-amber-800 mt-1">
                  Set both start dates and due dates on tasks for the most accurate
                  timeline visualization. Tasks without dates will use their creation
                  date as the start.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="mt-8">Global Timeline</h2>
        <p>
          Access the global Timeline from the sidebar to see tasks across all your
          projects. This is useful for:
        </p>
        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Identifying scheduling conflicts
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Resource planning across projects
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Getting a bird&apos;s-eye view of all work
          </li>
        </ul>
      </div>

      <Separator />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/learn/projects/tasks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Task Management
          </Link>
        </Button>
        <Button asChild>
          <Link href="/learn/projects/calendar">
            Calendar View
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

