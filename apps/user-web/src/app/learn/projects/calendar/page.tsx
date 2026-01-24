"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  CalendarDays,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Lightbulb,
} from "lucide-react"

export default function CalendarTutorialPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/learn/projects" className="hover:text-foreground">
          Learn Projects
        </Link>
        <span>/</span>
        <span>Calendar View</span>
      </div>

      {/* Header */}
      <div>
        <Badge variant="secondary" className="mb-3 bg-emerald-100 text-emerald-700">
          Beginner • 4 min read
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Calendar View
        </h1>
        <p className="text-lg text-muted-foreground">
          See all your tasks and deadlines organized on a monthly calendar for easy
          scheduling and planning.
        </p>
      </div>

      <Separator />

      {/* Content */}
      <div className="prose prose-gray max-w-none">
        <h2>Overview</h2>
        <p>
          The Calendar view displays your tasks based on their due dates, giving you a
          familiar monthly overview of upcoming work. It&apos;s perfect for spotting busy
          periods and managing deadlines.
        </p>

        <h2 className="mt-8">Navigating the Calendar</h2>
        
        <Card className="not-prose my-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium">December 2024</span>
              <Button variant="outline" size="sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="p-2 text-muted-foreground font-medium">
                  {day}
                </div>
              ))}
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="p-2 border rounded h-16 text-left">
                  <span className="text-xs">{i + 15}</span>
                  {i === 2 && (
                    <div className="mt-1 text-xs bg-blue-100 text-blue-700 rounded px-1 truncate">
                      Design review
                    </div>
                  )}
                  {i === 4 && (
                    <div className="mt-1 text-xs bg-emerald-100 text-emerald-700 rounded px-1 truncate">
                      Sprint demo
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Use arrows to navigate between months
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Click &quot;Today&quot; to jump back to the current month
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Click on any day to see all tasks due that day
          </li>
        </ul>

        <h2 className="mt-8">Task Display</h2>
        <p>
          Tasks appear on their due dates as colored bars. The color indicates the
          task status or project it belongs to.
        </p>

        <div className="not-prose flex flex-wrap gap-2 my-4">
          <Badge className="bg-gray-100 text-gray-700">To Do</Badge>
          <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>
          <Badge className="bg-amber-100 text-amber-700">Review</Badge>
          <Badge className="bg-emerald-100 text-emerald-700">Done</Badge>
        </div>

        <h2 className="mt-8">Filtering Tasks</h2>
        <p>
          Use filters to focus on specific tasks:
        </p>

        <Card className="not-prose my-4">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-violet-100 rounded-lg shrink-0">
                <Filter className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="font-medium">Available Filters:</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>• <strong>By assignee:</strong> Show only your tasks or a specific team member&apos;s</li>
                  <li>• <strong>By project:</strong> Focus on tasks from one project</li>
                  <li>• <strong>By priority:</strong> Show only high-priority items</li>
                  <li>• <strong>By status:</strong> Hide completed tasks</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="not-prose my-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">Pro Tip</p>
                <p className="text-sm text-amber-800 mt-1">
                  Drag tasks between days to quickly reschedule them. The due date
                  updates automatically when you drop the task on a new day.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="mt-8">Creating Tasks from Calendar</h2>
        <p>
          Click on any empty day to quickly create a new task with that due date
          already set. This is a fast way to plan future work.
        </p>
      </div>

      <Separator />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/learn/projects/timeline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Timeline & Gantt
          </Link>
        </Button>
        <Button asChild>
          <Link href="/learn/projects/milestones">
            Milestones
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

