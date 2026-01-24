"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  CheckSquare,
  ArrowRight,
  ArrowLeft,
  Users,
  Calendar,
  Tag,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  Lightbulb,
  ListTree,
} from "lucide-react"

export default function TasksTutorialPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/learn/projects" className="hover:text-foreground">
          Learn Projects
        </Link>
        <span>/</span>
        <span>Task Management</span>
      </div>

      {/* Header */}
      <div>
        <Badge variant="secondary" className="mb-3 bg-emerald-100 text-emerald-700">
          Beginner • 8 min read
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Task Management
        </h1>
        <p className="text-lg text-muted-foreground">
          Learn how to create detailed tasks, organize with subtasks, assign team members,
          and track progress effectively.
        </p>
      </div>

      <Separator />

      {/* Content */}
      <div className="prose prose-gray max-w-none">
        <h2>Creating Detailed Tasks</h2>
        <p>
          Every task can contain rich information to help your team understand what
          needs to be done. Click on any task to open the detail panel.
        </p>

        <h2 className="mt-8">Task Properties</h2>
        
        <div className="not-prose grid gap-3 my-4">
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <CheckSquare className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Status</p>
                <p className="text-sm text-muted-foreground">
                  Track where the task is in your workflow (To Do, In Progress, Review, Done)
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 rounded-lg shrink-0">
                <Tag className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="font-medium">Priority</p>
                <p className="text-sm text-muted-foreground">
                  Set urgency level: Low, Medium, High, or Urgent
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
                <Calendar className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium">Due Date</p>
                <p className="text-sm text-muted-foreground">
                  Set a deadline to keep the work on track
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-violet-100 rounded-lg shrink-0">
                <Users className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="font-medium">Assignees</p>
                <p className="text-sm text-muted-foreground">
                  Assign one or more team members to be responsible for the task
                </p>
              </div>
            </div>
          </Card>
        </div>

        <h2 className="mt-8">Subtasks</h2>
        <p>
          Break complex tasks into smaller, manageable pieces using subtasks. This helps
          track progress and ensures nothing is missed.
        </p>

        <Card className="not-prose my-4">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-violet-100 rounded-lg shrink-0">
                <ListTree className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="font-medium">Creating subtasks:</p>
                <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>1. Open a task by clicking on it</li>
                  <li>2. Scroll to the Subtasks section</li>
                  <li>3. Click &quot;Add&quot; to create a new subtask</li>
                  <li>4. Enter the subtask title and press Enter</li>
                  <li>5. Check off subtasks as you complete them</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="mt-8">Comments & Collaboration</h2>
        <p>
          Keep all task-related discussions in one place using comments. Tag team members
          with @mentions to notify them directly.
        </p>

        <div className="not-prose flex gap-4 my-4">
          <Card className="flex-1 p-4">
            <MessageSquare className="h-8 w-8 text-blue-500 mb-2" />
            <p className="font-medium">Comments</p>
            <p className="text-sm text-muted-foreground">
              Discuss tasks with your team, ask questions, provide updates
            </p>
          </Card>
          <Card className="flex-1 p-4">
            <Paperclip className="h-8 w-8 text-emerald-500 mb-2" />
            <p className="font-medium">Attachments</p>
            <p className="text-sm text-muted-foreground">
              Attach files, images, and documents directly to tasks
            </p>
          </Card>
        </div>

        <Card className="not-prose my-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">Pro Tip</p>
                <p className="text-sm text-amber-800 mt-1">
                  Use @mentions in comments to notify specific team members. They&apos;ll
                  receive a notification and can respond quickly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="mt-8">Estimated Hours</h2>
        <p>
          Track how long tasks should take by setting estimated hours. This helps with:
        </p>
        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Sprint planning and capacity management
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Workload distribution across the team
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Project timeline estimation
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Identifying bottlenecks and overcommitment
          </li>
        </ul>

        <h2 className="mt-8">Labels for Organization</h2>
        <p>
          Use labels to categorize tasks by type, feature, or any custom grouping:
        </p>
        
        <div className="not-prose flex gap-2 my-4">
          <Badge style={{ backgroundColor: "#ef444420", color: "#ef4444" }}>Bug</Badge>
          <Badge style={{ backgroundColor: "#3b82f620", color: "#3b82f6" }}>Feature</Badge>
          <Badge style={{ backgroundColor: "#22c55e20", color: "#22c55e" }}>Enhancement</Badge>
          <Badge style={{ backgroundColor: "#f9731620", color: "#f97316" }}>Urgent</Badge>
          <Badge style={{ backgroundColor: "#8b5cf620", color: "#8b5cf6" }}>Design</Badge>
        </div>

        <p>
          Create custom labels in Project Settings to match your team&apos;s workflow.
        </p>
      </div>

      <Separator />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/learn/projects/kanban">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kanban Board
          </Link>
        </Button>
        <Button asChild>
          <Link href="/learn/projects/timeline">
            Timeline & Gantt
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

