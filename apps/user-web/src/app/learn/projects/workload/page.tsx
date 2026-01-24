"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Users,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  BarChart3,
  Clock,
} from "lucide-react"

export default function WorkloadTutorialPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/learn/projects" className="hover:text-foreground">
          Learn Projects
        </Link>
        <span>/</span>
        <span>Team Workload</span>
      </div>

      {/* Header */}
      <div>
        <Badge variant="secondary" className="mb-3 bg-purple-100 text-purple-700">
          Advanced • 8 min read
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Team Workload
        </h1>
        <p className="text-lg text-muted-foreground">
          Monitor team capacity, prevent burnout, and balance resource allocation
          across your projects.
        </p>
      </div>

      <Separator />

      {/* Content */}
      <div className="prose prose-gray max-w-none">
        <h2>Understanding Workload</h2>
        <p>
          The Workload view shows you how work is distributed across your team.
          It helps you identify who&apos;s overloaded and who has capacity for more tasks.
        </p>

        <h2 className="mt-8">Workload Visualization</h2>
        
        <div className="not-prose my-4 space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">JD</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-sm">John Doe</span>
                  <span className="text-xs text-muted-foreground">32h / 40h</span>
                </div>
                <Progress value={80} className="h-2" />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">5 tasks assigned</div>
          </Card>
          
          <Card className="p-4 border-amber-200">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">AS</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-sm">Alice Smith</span>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    <span className="text-xs text-amber-600">48h / 40h</span>
                  </div>
                </div>
                <Progress value={120} className="h-2 [&>div]:bg-amber-500" />
              </div>
            </div>
            <div className="text-xs text-amber-600">Overallocated by 8 hours</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-violet-100 text-violet-700 text-sm">BJ</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-sm">Bob Johnson</span>
                  <span className="text-xs text-muted-foreground">24h / 40h</span>
                </div>
                <Progress value={60} className="h-2" />
              </div>
            </div>
            <div className="text-xs text-emerald-600">Has capacity for more work</div>
          </Card>
        </div>

        <h2 className="mt-8">Setting Capacity</h2>
        <p>
          Each team member has a weekly capacity (default: 40 hours). Adjust this
          based on part-time schedules, time off, or other commitments.
        </p>

        <Card className="not-prose my-4">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">To adjust capacity:</p>
                <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>1. Go to Workload view from the Projects sidebar</li>
                  <li>2. Click on a team member&apos;s name</li>
                  <li>3. Adjust their weekly hours</li>
                  <li>4. Set time-off periods if needed</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="mt-8">Workload Indicators</h2>
        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <strong>Under capacity (0-75%):</strong> Room for more work
          </li>
          <li className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <strong>Optimal (75-100%):</strong> Well-balanced workload
          </li>
          <li className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <strong>Overallocated (100%+):</strong> At risk of burnout
          </li>
        </ul>

        <h2 className="mt-8">Rebalancing Work</h2>
        <p>
          When you spot an imbalance, you can quickly reassign tasks:
        </p>

        <Card className="not-prose my-4">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-violet-100 rounded-lg shrink-0">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="font-medium">Quick reassignment:</p>
                <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>1. Click on an overloaded team member</li>
                  <li>2. See their assigned tasks</li>
                  <li>3. Drag tasks to another team member with capacity</li>
                  <li>4. Or click a task to open it and change the assignee</li>
                </ol>
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
                  Review the Workload view at the start of each week. Catching
                  overallocation early prevents last-minute scrambles and keeps
                  your team productive.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="mt-8">Best Practices</h2>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-1 shrink-0" />
            <span><strong>Estimate accurately:</strong> Set realistic hour estimates on tasks</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-1 shrink-0" />
            <span><strong>Leave buffer:</strong> Don&apos;t schedule 100% capacity—unexpected work happens</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-1 shrink-0" />
            <span><strong>Track time off:</strong> Update capacity when people are on vacation</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-1 shrink-0" />
            <span><strong>Communicate:</strong> Discuss workload concerns in team meetings</span>
          </li>
        </ul>
      </div>

      <Separator />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/learn/projects/milestones">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Milestones
          </Link>
        </Button>
        <Button asChild>
          <Link href="/learn/projects/reports">
            Reports & Analytics
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

