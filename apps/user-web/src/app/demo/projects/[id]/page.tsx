"use client"

import * as React from "react"
import { useParams, notFound } from "next/navigation"
import { useDemoProjects } from "@/providers"
import { DemoProjectsLayout } from "@/components/demo/demo-projects-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Plus,
  CalendarDays,
  MoreHorizontal,
  GripVertical,
  MessageSquare,
  Paperclip,
  CheckSquare,
} from "lucide-react"
import { format } from "date-fns"
import type { DemoProjectTask } from "@/lib/demo-data"
import { cn } from "@/lib/utils"

const columns = [
  { id: "todo", title: "To Do", color: "bg-slate-500" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-500" },
  { id: "review", title: "Review", color: "bg-amber-500" },
  { id: "done", title: "Done", color: "bg-emerald-500" },
] as const

function getPriorityStyles(priority: DemoProjectTask['priority']) {
  switch (priority) {
    case 'urgent':
      return "border-l-red-500 bg-red-50/50"
    case 'high':
      return "border-l-orange-500"
    case 'medium':
      return "border-l-blue-500"
    case 'low':
      return "border-l-slate-300"
  }
}

function getPriorityBadge(priority: DemoProjectTask['priority']) {
  switch (priority) {
    case 'urgent':
      return <Badge className="bg-red-100 text-red-600 text-[10px] animate-pulse">Urgent</Badge>
    case 'high':
      return <Badge className="bg-orange-100 text-orange-600 text-[10px]">High</Badge>
    case 'medium':
      return <Badge className="bg-blue-100 text-blue-600 text-[10px]">Medium</Badge>
    case 'low':
      return <Badge className="bg-slate-100 text-slate-600 text-[10px]">Low</Badge>
  }
}

function TaskCard({ task }: { task: DemoProjectTask }) {
  const subtaskCount = task.subtasks.length
  const completedSubtasks = task.subtasks.filter(s => s.status === 'done').length

  return (
    <Card className={cn(
      "group cursor-pointer hover:shadow-lg transition-all duration-200",
      "bg-white/80 dark:bg-white/[0.08] backdrop-blur-md",
      "border border-white/60 dark:border-white/10",
      "border-l-4",
      getPriorityStyles(task.priority)
    )}>
      <CardContent className="p-3 space-y-3">
        {/* Header with drag handle and menu */}
        <div className="flex items-start gap-2">
          <GripVertical className="size-4 text-muted-foreground/50 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium line-clamp-2">{task.title}</p>
          </div>
          <Button variant="ghost" size="icon" className="size-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="size-4" />
          </Button>
        </div>

        {/* Labels */}
        {task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.labels.map((label) => (
              <Badge
                key={label.id}
                variant="outline"
                className="text-[10px] px-1.5 py-0"
                style={{
                  borderColor: label.color + "40",
                  backgroundColor: label.color + "10",
                  color: label.color,
                }}
              >
                {label.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Subtask Progress */}
        {subtaskCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckSquare className="size-3" />
            <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${(completedSubtasks / subtaskCount) * 100}%` }}
              />
            </div>
            <span>{completedSubtasks}/{subtaskCount}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {/* Due date */}
            {task.due_date && (
              <div className={cn(
                "flex items-center gap-1 text-xs",
                new Date(task.due_date) < new Date() && task.status !== 'done'
                  ? "text-red-600"
                  : "text-muted-foreground"
              )}>
                <CalendarDays className="size-3" />
                <span>{format(new Date(task.due_date), "MMM d")}</span>
              </div>
            )}
            {/* Priority badge */}
            {getPriorityBadge(task.priority)}
          </div>

          {/* Assignees */}
          {task.assignees.length > 0 && (
            <div className="flex -space-x-1.5">
              {task.assignees.slice(0, 3).map((assignee) => (
                <Avatar key={assignee.id} className="size-6 border-2 border-white">
                  <AvatarFallback className="text-[8px] bg-slate-100">
                    {assignee.name.split(' ').map((n: string) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              ))}
              {task.assignees.length > 3 && (
                <div className="size-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] text-muted-foreground">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function KanbanColumn({
  column,
  tasks,
}: {
  column: typeof columns[number]
  tasks: DemoProjectTask[]
}) {
  return (
    <div className="flex flex-col min-w-[300px] max-w-[320px] h-full">
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2 mb-2">
        <div className="flex items-center gap-2">
          <div className={cn("size-3 rounded-full", column.color)} />
          <h3 className="font-semibold text-sm">{column.title}</h3>
          <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
        </div>
        <Button variant="ghost" size="icon" className="size-7">
          <Plus className="size-4" />
        </Button>
      </div>

      {/* Column Content */}
      <div className="flex-1 overflow-hidden bg-slate-50/50 rounded-lg p-2">
        <ScrollArea className="h-full">
          <div className="space-y-2 pr-2">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
            {tasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                <p className="text-sm text-muted-foreground">No tasks</p>
                <Button variant="ghost" size="sm" className="mt-2 text-muted-foreground">
                  <Plus className="size-4 mr-1" />
                  Add task
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

export default function DemoProjectKanbanPage() {
  const params = useParams()
  const projectId = params.id as string
  const { getProjectById, getTasksByProject } = useDemoProjects()

  const project = getProjectById(projectId)
  const projectTasks = getTasksByProject(projectId)

  if (!project) {
    // Return a fallback for invalid project IDs
    return (
      <DemoProjectsLayout title="Project Not Found">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h2 className="text-lg font-medium">Project not found</h2>
          <p className="text-muted-foreground text-sm mt-1">
            This project may have been deleted or doesn't exist.
          </p>
        </div>
      </DemoProjectsLayout>
    )
  }

  // Group tasks by status
  const tasksByStatus = {
    todo: projectTasks.filter(t => t.status === 'todo'),
    in_progress: projectTasks.filter(t => t.status === 'in_progress'),
    review: projectTasks.filter(t => t.status === 'review'),
    done: projectTasks.filter(t => t.status === 'done'),
  }

  return (
    <DemoProjectsLayout currentProject={project}>
      <div className="flex gap-4 h-[calc(100vh-280px)] overflow-x-auto pb-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasksByStatus[column.id]}
          />
        ))}
      </div>
    </DemoProjectsLayout>
  )
}
