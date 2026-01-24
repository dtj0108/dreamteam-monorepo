"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Milestone,
  ArrowRight,
  ArrowLeft,
  Flag,
  CalendarCheck,
  CheckCircle2,
  Lightbulb,
  Target,
  Circle,
} from "lucide-react"

export default function MilestonesTutorialPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/learn/projects" className="hover:text-foreground">
          Learn Projects
        </Link>
        <span>/</span>
        <span>Milestones</span>
      </div>

      {/* Header */}
      <div>
        <Badge variant="secondary" className="mb-3 bg-blue-100 text-blue-700">
          Intermediate • 6 min read
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Milestones
        </h1>
        <p className="text-lg text-muted-foreground">
          Set and track key project checkpoints to measure progress and celebrate
          achievements along the way.
        </p>
      </div>

      <Separator />

      {/* Content */}
      <div className="prose prose-gray max-w-none">
        <h2>What are Milestones?</h2>
        <p>
          Milestones are significant checkpoints in your project that mark the completion
          of a major phase or deliverable. Unlike tasks, milestones represent achievements
          rather than work to be done.
        </p>

        <div className="not-prose my-4 space-y-3">
          <Card className="p-4 border-l-4 border-l-emerald-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-full">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium">Phase 1: Design Complete</p>
                <p className="text-sm text-muted-foreground">Completed Dec 15</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Circle className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Phase 2: Development Complete</p>
                <p className="text-sm text-muted-foreground">Due Jan 15</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-gray-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-full">
                <Circle className="h-4 w-4 text-gray-400" />
              </div>
              <div>
                <p className="font-medium">Phase 3: Launch</p>
                <p className="text-sm text-muted-foreground">Due Feb 1</p>
              </div>
            </div>
          </Card>
        </div>

        <h2 className="mt-8">Creating Milestones</h2>
        
        <Card className="not-prose my-4">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-violet-100 rounded-lg shrink-0">
                <Flag className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="font-medium">To create a milestone:</p>
                <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>1. Open your project and go to the Milestones tab</li>
                  <li>2. Click &quot;New Milestone&quot;</li>
                  <li>3. Enter a name that describes the achievement</li>
                  <li>4. Set the target date</li>
                  <li>5. Optionally add a description</li>
                  <li>6. Click &quot;Create&quot;</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="mt-8">Linking Tasks to Milestones</h2>
        <p>
          Connect tasks to milestones to track what work needs to be done to reach
          each checkpoint. The milestone&apos;s progress updates automatically as linked
          tasks are completed.
        </p>

        <Card className="not-prose my-4 p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-violet-500" />
                <span className="font-medium">Beta Release</span>
              </div>
              <span className="text-sm text-muted-foreground">75% complete</span>
            </div>
            <Progress value={75} className="h-2" />
            <div className="text-sm text-muted-foreground">
              6 of 8 tasks completed
            </div>
          </div>
        </Card>

        <h2 className="mt-8">Milestone Status</h2>
        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <strong>Not Started:</strong> Target date is in the future, no tasks completed
          </li>
          <li className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <strong>In Progress:</strong> Some linked tasks are completed
          </li>
          <li className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <strong>At Risk:</strong> Behind schedule, target date approaching
          </li>
          <li className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <strong>Completed:</strong> All linked tasks done, milestone achieved
          </li>
        </ul>

        <Card className="not-prose my-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">Pro Tip</p>
                <p className="text-sm text-amber-800 mt-1">
                  Keep milestones focused on outcomes, not activities. Instead of
                  &quot;Complete testing&quot;, try &quot;Product ready for launch&quot;.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="mt-8">Best Practices</h2>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-1 shrink-0" />
            <span><strong>Space them out:</strong> Have 3-5 milestones per project phase</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-1 shrink-0" />
            <span><strong>Make them measurable:</strong> A milestone should have clear completion criteria</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-1 shrink-0" />
            <span><strong>Celebrate completion:</strong> Recognize the team when milestones are achieved</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-1 shrink-0" />
            <span><strong>Review regularly:</strong> Adjust dates if the project scope changes</span>
          </li>
        </ul>
      </div>

      <Separator />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/learn/projects/calendar">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Calendar View
          </Link>
        </Button>
        <Button asChild>
          <Link href="/learn/projects/workload">
            Team Workload
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

