"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  BarChart3,
  ArrowLeft,
  TrendingUp,
  PieChart,
  Activity,
  CheckCircle2,
  Lightbulb,
  Download,
  Calendar,
} from "lucide-react"

export default function ReportsTutorialPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/learn/projects" className="hover:text-foreground">
          Learn Projects
        </Link>
        <span>/</span>
        <span>Reports & Analytics</span>
      </div>

      {/* Header */}
      <div>
        <Badge variant="secondary" className="mb-3 bg-purple-100 text-purple-700">
          Advanced • 7 min read
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Reports & Analytics
        </h1>
        <p className="text-lg text-muted-foreground">
          Analyze project performance, track team velocity, and generate insights
          to improve your workflow.
        </p>
      </div>

      <Separator />

      {/* Content */}
      <div className="prose prose-gray max-w-none">
        <h2>Available Reports</h2>
        <p>
          The Reports section provides multiple views into your project data,
          helping you understand performance and make better decisions.
        </p>

        <div className="not-prose grid gap-4 my-4">
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Burndown Chart</p>
                <p className="text-sm text-muted-foreground">
                  Track remaining work over time. Shows if you&apos;re on pace to complete
                  the project on schedule.
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium">Velocity Chart</p>
                <p className="text-sm text-muted-foreground">
                  Measure how much work your team completes each week. Helps with
                  future planning and estimation.
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-violet-100 rounded-lg shrink-0">
                <PieChart className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="font-medium">Task Distribution</p>
                <p className="text-sm text-muted-foreground">
                  See how tasks are distributed by status, priority, assignee, or label.
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                <BarChart3 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium">Completion Rate</p>
                <p className="text-sm text-muted-foreground">
                  Track on-time vs late task completion. Identify patterns and bottlenecks.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <h2 className="mt-8">Reading the Burndown Chart</h2>
        
        <Card className="not-prose my-4 p-4">
          <div className="h-32 relative">
            {/* Ideal line */}
            <div className="absolute top-0 left-0 w-full h-full">
              <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                <line x1="0" y1="0" x2="100" y2="50" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2,2" />
                <polyline points="0,5 20,12 40,20 60,28 80,42 100,45" fill="none" stroke="#3b82f6" strokeWidth="1" />
              </svg>
            </div>
            <div className="absolute bottom-0 left-0 flex justify-between w-full text-xs text-muted-foreground">
              <span>Start</span>
              <span>End</span>
            </div>
          </div>
          <div className="flex gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-slate-400" style={{ borderStyle: "dashed" }} />
              <span>Ideal Progress</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-blue-500" />
              <span>Actual Progress</span>
            </div>
          </div>
        </Card>

        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <strong>Line above ideal:</strong> Behind schedule
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <strong>Line below ideal:</strong> Ahead of schedule
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <strong>Flat sections:</strong> No tasks completed during that period
          </li>
        </ul>

        <h2 className="mt-8">Date Range Selection</h2>
        
        <Card className="not-prose my-4">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-violet-100 rounded-lg shrink-0">
                <Calendar className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="font-medium">Filter reports by time period:</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>• <strong>This Week:</strong> Current week&apos;s activity</li>
                  <li>• <strong>This Month:</strong> Current month overview</li>
                  <li>• <strong>Last 30 Days:</strong> Rolling 30-day window</li>
                  <li>• <strong>Custom Range:</strong> Pick any start and end date</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="mt-8">Exporting Reports</h2>
        <p>
          Share insights with stakeholders by exporting reports:
        </p>

        <div className="not-prose flex gap-2 my-4">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Card className="not-prose my-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">Pro Tip</p>
                <p className="text-sm text-amber-800 mt-1">
                  Schedule weekly report emails to automatically send project status
                  updates to stakeholders. Configure this in Project Settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="mt-8">Key Metrics to Watch</h2>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-1 shrink-0" />
            <span><strong>Cycle Time:</strong> How long tasks take from start to completion</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-1 shrink-0" />
            <span><strong>Throughput:</strong> Number of tasks completed per time period</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-1 shrink-0" />
            <span><strong>On-time Rate:</strong> Percentage of tasks completed by due date</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-1 shrink-0" />
            <span><strong>Blockers:</strong> Tasks stuck in review or waiting states</span>
          </li>
        </ul>
      </div>

      <Separator />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/learn/projects/workload">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Team Workload
          </Link>
        </Button>
        <Button asChild>
          <Link href="/learn/projects">
            Back to All Tutorials
          </Link>
        </Button>
      </div>
    </div>
  )
}

