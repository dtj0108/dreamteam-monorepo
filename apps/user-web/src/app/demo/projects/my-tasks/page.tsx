"use client"

import * as React from "react"
import { useDemoProjects } from "@/providers"
import { DemoProjectsLayout } from "@/components/demo/demo-projects-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Plus,
  CalendarDays,
  Circle,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
} from "lucide-react"
import { format } from "date-fns"
import type { DemoProjectTask } from "@/lib/demo-data"
import { cn } from "@/lib/utils"

function getStatusIcon(status: DemoProjectTask['status']) {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="size-4 text-emerald-500" />
    case 'in_progress':
      return <Clock className="size-4 text-blue-500" />
    case 'review':
      return <Circle className="size-4 text-amber-500 fill-amber-500/20" />
    default:
      return <Circle className="size-4 text-slate-300" />
  }
}

function getPriorityBadge(priority: DemoProjectTask['priority']) {
  switch (priority) {
    case 'urgent':
      return <Badge className="bg-red-100 text-red-600 text-[10px]">Urgent</Badge>
    case 'high':
      return <Badge className="bg-orange-100 text-orange-600 text-[10px]">High</Badge>
    case 'medium':
      return <Badge className="bg-blue-100 text-blue-600 text-[10px]">Medium</Badge>
    case 'low':
      return <Badge className="bg-slate-100 text-slate-600 text-[10px]">Low</Badge>
  }
}

function getStatusBadge(status: DemoProjectTask['status']) {
  switch (status) {
    case 'done':
      return <Badge className="bg-emerald-100 text-emerald-600 text-[10px]">Done</Badge>
    case 'review':
      return <Badge className="bg-amber-100 text-amber-600 text-[10px]">Review</Badge>
    case 'in_progress':
      return <Badge className="bg-blue-100 text-blue-600 text-[10px]">In Progress</Badge>
    default:
      return <Badge className="bg-slate-100 text-slate-600 text-[10px]">To Do</Badge>
  }
}

function TaskRow({ task }: { task: DemoProjectTask }) {
  const { getProjectById } = useDemoProjects()
  const project = getProjectById(task.project_id)
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  return (
    <Card className={cn(
      "group cursor-pointer hover:shadow-md transition-all duration-200",
      "bg-white/80 backdrop-blur-md border-white/60 dark:bg-white/[0.08] dark:border-white/10",
      task.status === 'done' && "opacity-60"
    )}>
      <CardContent className="p-3 flex items-center gap-3">
        {/* Status Icon */}
        <div className="shrink-0">
          {getStatusIcon(task.status)}
        </div>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn(
              "text-sm font-medium truncate",
              task.status === 'done' && "line-through text-muted-foreground"
            )}>
              {task.title}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {project && (
              <>
                <div
                  className="size-2 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <span className="truncate">{project.name}</span>
                <span>·</span>
              </>
            )}
            {getStatusBadge(task.status)}
          </div>
        </div>

        {/* Labels */}
        {task.labels.length > 0 && (
          <div className="hidden sm:flex items-center gap-1">
            {task.labels.slice(0, 2).map((label) => (
              <div
                key={label.id}
                className="size-2 rounded-full"
                style={{ backgroundColor: label.color }}
                title={label.name}
              />
            ))}
          </div>
        )}

        {/* Priority */}
        <div className="hidden sm:block">
          {getPriorityBadge(task.priority)}
        </div>

        {/* Due Date */}
        {task.due_date && (
          <div className={cn(
            "flex items-center gap-1 text-xs shrink-0",
            isOverdue ? "text-red-600" : "text-muted-foreground"
          )}>
            <CalendarDays className="size-3" />
            <span>{format(new Date(task.due_date), "MMM d")}</span>
          </div>
        )}

        {/* Assignees */}
        {task.assignees.length > 0 && (
          <div className="flex -space-x-1">
            {task.assignees.slice(0, 2).map((assignee) => (
              <Avatar key={assignee.id} className="size-6 border-2 border-white">
                <AvatarFallback className="text-[8px] bg-slate-100">
                  {assignee.name.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        )}

        <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </CardContent>
    </Card>
  )
}

function TaskGroup({
  title,
  tasks,
  icon: Icon,
  iconColor,
  emptyMessage,
}: {
  title: string
  tasks: DemoProjectTask[]
  icon: React.ElementType
  iconColor: string
  emptyMessage?: string
}) {
  if (tasks.length === 0 && !emptyMessage) return null

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("size-4", iconColor)} />
        <h2 className="font-semibold">{title}</h2>
        <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
        {tasks.length === 0 && emptyMessage && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {emptyMessage}
          </p>
        )}
      </div>
    </div>
  )
}

export default function DemoMyTasksPage() {
  const { tasksGroupedByDueDate, stats } = useDemoProjects()

  return (
    <DemoProjectsLayout
      title="My Tasks"
      breadcrumbs={[{ label: "My Tasks" }]}
      actions={
        <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="mr-2 size-4" />
          New Task
        </Button>
      }
    >
      {/* Summary Stats */}
      <div className="flex items-center gap-4 mb-6 text-sm">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 rounded-lg border">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-medium">{stats.totalTasks - stats.completedTasks}</span>
          <span className="text-muted-foreground">tasks</span>
        </div>
        {stats.overdueTasks > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg border border-red-100">
            <AlertCircle className="size-4" />
            <span className="font-medium">{stats.overdueTasks}</span>
            <span>overdue</span>
          </div>
        )}
      </div>

      {/* Overdue */}
      <TaskGroup
        title="Overdue"
        tasks={tasksGroupedByDueDate.overdue}
        icon={AlertCircle}
        iconColor="text-red-500"
      />

      {/* Today */}
      <TaskGroup
        title="Today"
        tasks={tasksGroupedByDueDate.today}
        icon={CalendarDays}
        iconColor="text-cyan-500"
        emptyMessage="No tasks due today"
      />

      {/* Tomorrow */}
      <TaskGroup
        title="Tomorrow"
        tasks={tasksGroupedByDueDate.tomorrow}
        icon={CalendarDays}
        iconColor="text-blue-500"
      />

      {/* This Week */}
      <TaskGroup
        title="This Week"
        tasks={tasksGroupedByDueDate.thisWeek}
        icon={CalendarDays}
        iconColor="text-indigo-500"
      />

      {/* Later */}
      <TaskGroup
        title="Later"
        tasks={tasksGroupedByDueDate.later}
        icon={Clock}
        iconColor="text-slate-400"
      />

      {/* No Due Date */}
      <TaskGroup
        title="No Due Date"
        tasks={tasksGroupedByDueDate.noDueDate}
        icon={Circle}
        iconColor="text-slate-300"
      />

      {/* Empty State */}
      {Object.values(tasksGroupedByDueDate).every(arr => arr.length === 0) && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="size-12 text-emerald-500/50 mb-4" />
          <h3 className="text-lg font-medium">All caught up!</h3>
          <p className="text-muted-foreground text-sm mt-1">
            You have no pending tasks. Great job!
          </p>
          <Button className="mt-4 bg-cyan-600 hover:bg-cyan-700">
            <Plus className="mr-2 size-4" />
            Create Task
          </Button>
        </div>
      )}
    </DemoProjectsLayout>
  )
}
