"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  LayoutGrid,
  ArrowRight,
  ArrowLeft,
  GripVertical,
  Plus,
  CheckCircle2,
  Lightbulb,
  MousePointer2,
} from "lucide-react"

export default function KanbanTutorialPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/learn/projects" className="hover:text-foreground">
          Learn Projects
        </Link>
        <span>/</span>
        <span>Kanban Board</span>
      </div>

      {/* Header */}
      <div>
        <Badge variant="secondary" className="mb-3 bg-emerald-100 text-emerald-700">
          Beginner • 7 min read
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Using the Kanban Board
        </h1>
        <p className="text-lg text-muted-foreground">
          Master drag-and-drop task management with customizable columns to visualize
          your workflow.
        </p>
      </div>

      <Separator />

      {/* Content */}
      <div className="prose prose-gray max-w-none">
        <h2>What is a Kanban Board?</h2>
        <p>
          A Kanban board is a visual project management tool that helps you see the
          status of all tasks at a glance. Tasks move through columns (like &quot;To Do&quot;,
          &quot;In Progress&quot;, and &quot;Done&quot;) as work progresses.
        </p>

        <h2 className="mt-8">Understanding Columns</h2>
        <p>
          By default, your Kanban board has four columns representing task status:
        </p>

        <div className="not-prose grid grid-cols-4 gap-2 my-4">
          <Card className="p-3 text-center">
            <div className="w-2 h-2 rounded-full bg-gray-500 mx-auto mb-2" />
            <p className="font-medium text-sm">To Do</p>
            <p className="text-xs text-muted-foreground">Not started</p>
          </Card>
          <Card className="p-3 text-center">
            <div className="w-2 h-2 rounded-full bg-blue-500 mx-auto mb-2" />
            <p className="font-medium text-sm">In Progress</p>
            <p className="text-xs text-muted-foreground">Being worked on</p>
          </Card>
          <Card className="p-3 text-center">
            <div className="w-2 h-2 rounded-full bg-amber-500 mx-auto mb-2" />
            <p className="font-medium text-sm">Review</p>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </Card>
          <Card className="p-3 text-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mx-auto mb-2" />
            <p className="font-medium text-sm">Done</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </Card>
        </div>

        <h2 className="mt-8">Drag and Drop Tasks</h2>
        <p>
          Moving tasks between columns is as simple as dragging and dropping:
        </p>

        <Card className="not-prose my-4">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <MousePointer2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">How to move a task:</p>
                <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>1. Hover over a task card</li>
                  <li>2. Click and hold the grip handle <GripVertical className="inline h-4 w-4" /></li>
                  <li>3. Drag to the desired column</li>
                  <li>4. Release to drop the task</li>
                </ol>
                <p className="text-sm text-muted-foreground mt-2">
                  The task status updates automatically when you drop it in a new column.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="mt-8">Creating Tasks</h2>
        <p>
          There are multiple ways to add new tasks to your board:
        </p>

        <ul className="space-y-2 mt-4">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            Click the <Plus className="inline h-4 w-4" /> button in any column header
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            Click &quot;+ Add task&quot; at the bottom of any column
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            Use the keyboard shortcut <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">N</kbd>
          </li>
        </ul>

        <h2 className="mt-8">Task Cards</h2>
        <p>
          Each task card displays key information at a glance:
        </p>

        <Card className="not-prose my-4 p-4">
          <div className="space-y-3">
            <div className="flex gap-1">
              <div className="h-1.5 w-8 rounded-full bg-violet-500" />
              <div className="h-1.5 w-8 rounded-full bg-emerald-500" />
            </div>
            <div className="flex items-start gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Design homepage mockup</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
              high
            </Badge>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Dec 28</span>
              <div className="w-5 h-5 rounded-full bg-muted" />
            </div>
          </div>
        </Card>

        <ul className="space-y-1 text-sm">
          <li><strong>Labels:</strong> Colored bars at the top for categorization</li>
          <li><strong>Title:</strong> The main task name</li>
          <li><strong>Priority:</strong> Badge showing urgency level</li>
          <li><strong>Due date:</strong> When the task should be completed</li>
          <li><strong>Assignee:</strong> Avatar of who&apos;s responsible</li>
        </ul>

        <Card className="not-prose my-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">Pro Tip</p>
                <p className="text-sm text-amber-800 mt-1">
                  Click on any task card to open the detail panel where you can add
                  descriptions, comments, subtasks, and attachments.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="mt-8">Best Practices</h2>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-1 shrink-0" />
            <span><strong>Limit work in progress:</strong> Don&apos;t have too many tasks in the &quot;In Progress&quot; column</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-1 shrink-0" />
            <span><strong>Keep tasks small:</strong> Break large tasks into smaller, actionable items</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-1 shrink-0" />
            <span><strong>Update regularly:</strong> Move tasks as soon as their status changes</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-1 shrink-0" />
            <span><strong>Use labels:</strong> Color-code tasks by type, feature, or priority</span>
          </li>
        </ul>
      </div>

      <Separator />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/learn/projects/getting-started">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Getting Started
          </Link>
        </Button>
        <Button asChild>
          <Link href="/learn/projects/tasks">
            Task Management
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

