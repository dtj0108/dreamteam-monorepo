"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  FolderKanban,
  Plus,
  Users,
  LayoutGrid,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lightbulb,
} from "lucide-react"

export default function GettingStartedPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/learn/projects" className="hover:text-foreground">
          Learn Projects
        </Link>
        <span>/</span>
        <span>Getting Started</span>
      </div>

      {/* Header */}
      <div>
        <Badge variant="secondary" className="mb-3 bg-emerald-100 text-emerald-700">
          Beginner • 5 min read
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Getting Started with Projects
        </h1>
        <p className="text-lg text-muted-foreground">
          Learn how to create your first project, invite team members, and start
          organizing your work effectively.
        </p>
      </div>

      <Separator />

      {/* Content */}
      <div className="prose prose-gray max-w-none">
        <h2 className="flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 text-violet-600 text-sm font-bold">1</span>
          Create Your First Project
        </h2>
        <p>
          Projects are the foundation of your work organization. Each project contains
          tasks, milestones, and team members working toward a common goal.
        </p>
        
        <Card className="not-prose my-4">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-violet-100 rounded-lg shrink-0">
                <Plus className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="font-medium">To create a project:</p>
                <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>1. Navigate to the Projects workspace</li>
                  <li>2. Click the &quot;New Project&quot; button in the top right</li>
                  <li>3. Enter a project name and description</li>
                  <li>4. Choose a color and set the priority</li>
                  <li>5. Optionally set start and end dates</li>
                  <li>6. Click &quot;Create Project&quot;</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="flex items-center gap-2 mt-8">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 text-violet-600 text-sm font-bold">2</span>
          Invite Team Members
        </h2>
        <p>
          Collaboration is key to successful project management. Add team members to
          share the workload and keep everyone aligned.
        </p>

        <Card className="not-prose my-4">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Adding team members:</p>
                <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>1. Open your project and go to Settings</li>
                  <li>2. Scroll to the Team Members section</li>
                  <li>3. Click &quot;Add Member&quot;</li>
                  <li>4. Select team members from your workspace</li>
                  <li>5. Assign roles (Owner, Admin, Member, Viewer)</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="flex items-center gap-2 mt-8">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 text-violet-600 text-sm font-bold">3</span>
          Add Your First Tasks
        </h2>
        <p>
          Break down your project into manageable tasks. Each task can have assignees,
          due dates, priorities, and subtasks.
        </p>

        <Card className="not-prose my-4">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
                <LayoutGrid className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium">Creating tasks on the Kanban board:</p>
                <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>1. Open your project (default view is the Kanban board)</li>
                  <li>2. Click &quot;+ Add task&quot; in any column</li>
                  <li>3. Enter a task title</li>
                  <li>4. Click the task to add details, assignees, and due dates</li>
                  <li>5. Drag tasks between columns to update their status</li>
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
                  Use keyboard shortcuts to speed up your workflow! Press <kbd className="px-1.5 py-0.5 bg-amber-100 rounded text-xs">N</kbd> to
                  quickly create a new task from anywhere in the project.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="flex items-center gap-2 mt-8">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 text-violet-600 text-sm font-bold">4</span>
          Explore Different Views
        </h2>
        <p>
          Projects offers multiple ways to visualize your work. Switch between views
          using the tabs at the top of your project:
        </p>

        <ul className="space-y-2 mt-4">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <strong>Board:</strong> Kanban-style columns for visual task management
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <strong>List:</strong> Table view with sorting and filtering
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <strong>Timeline:</strong> Gantt chart for scheduling and dependencies
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <strong>Calendar:</strong> Monthly view of task due dates
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <strong>Milestones:</strong> Track key project checkpoints
          </li>
        </ul>
      </div>

      <Separator />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/learn/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Learn
          </Link>
        </Button>
        <Button asChild>
          <Link href="/learn/projects/kanban">
            Using the Kanban Board
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

