"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useDemoProjects } from "@/providers"
import { DemoProjectsLayout } from "@/components/demo/demo-projects-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  CalendarDays,
  ArrowUpDown,
  Filter,
  Search,
  ChevronRight,
} from "lucide-react"
import { format } from "date-fns"
import type { DemoProjectTask } from "@/lib/demo-data"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

function getStatusBadge(status: DemoProjectTask['status']) {
  switch (status) {
    case 'done':
      return <Badge className="bg-emerald-100 text-emerald-600">Done</Badge>
    case 'review':
      return <Badge className="bg-amber-100 text-amber-600">Review</Badge>
    case 'in_progress':
      return <Badge className="bg-blue-100 text-blue-600">In Progress</Badge>
    default:
      return <Badge className="bg-slate-100 text-slate-600">To Do</Badge>
  }
}

function getPriorityBadge(priority: DemoProjectTask['priority']) {
  switch (priority) {
    case 'urgent':
      return <Badge variant="outline" className="border-red-200 text-red-600">Urgent</Badge>
    case 'high':
      return <Badge variant="outline" className="border-orange-200 text-orange-600">High</Badge>
    case 'medium':
      return <Badge variant="outline" className="border-blue-200 text-blue-600">Medium</Badge>
    case 'low':
      return <Badge variant="outline" className="border-slate-200 text-slate-600">Low</Badge>
  }
}

export default function DemoProjectListPage() {
  const params = useParams()
  const projectId = params.id as string
  const { getProjectById, getTasksByProject } = useDemoProjects()
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all")
  const [searchQuery, setSearchQuery] = React.useState("")

  const project = getProjectById(projectId)
  const projectTasks = getTasksByProject(projectId)

  if (!project) {
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

  // Filter tasks
  const filteredTasks = projectTasks.filter(task => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false
    if (priorityFilter !== "all" && task.priority !== priorityFilter) return false
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Sort by status then priority
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const statusOrder = { todo: 0, in_progress: 1, review: 2, done: 3 }
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }

    const statusDiff = statusOrder[a.status] - statusOrder[b.status]
    if (statusDiff !== 0) return statusDiff
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  return (
    <DemoProjectsLayout currentProject={project}>
      {/* Filters Row */}
      <div className="flex items-center gap-4 mb-4 p-4 bg-white/80 backdrop-blur-md rounded-lg border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 ml-auto">
          <Plus className="mr-2 size-4" />
          New Task
        </Button>
      </div>

      {/* Tasks Table */}
      <div className="bg-white/80 backdrop-blur-md rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="min-w-[300px]">Task</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[100px]">Priority</TableHead>
              <TableHead className="w-[140px]">Assignees</TableHead>
              <TableHead className="w-[120px]">Due Date</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.map((task) => {
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

              return (
                <TableRow
                  key={task.id}
                  className={cn(
                    "group cursor-pointer hover:bg-slate-50",
                    task.status === 'done' && "opacity-60"
                  )}
                >
                  <TableCell>
                    <Checkbox
                      checked={task.status === 'done'}
                      className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        "font-medium",
                        task.status === 'done' && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </p>
                      {task.labels.length > 0 && (
                        <div className="flex gap-1">
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
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(task.status)}
                  </TableCell>
                  <TableCell>
                    {getPriorityBadge(task.priority)}
                  </TableCell>
                  <TableCell>
                    {task.assignees.length > 0 ? (
                      <div className="flex -space-x-1.5">
                        {task.assignees.slice(0, 3).map((assignee) => (
                          <Avatar key={assignee.id} className="size-7 border-2 border-white">
                            <AvatarFallback className="text-[10px] bg-slate-100">
                              {assignee.name.split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {task.assignees.length > 3 && (
                          <div className="size-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] text-muted-foreground">
                            +{task.assignees.length - 3}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.due_date ? (
                      <div className={cn(
                        "flex items-center gap-1 text-sm",
                        isOverdue ? "text-red-600" : "text-muted-foreground"
                      )}>
                        <CalendarDays className="size-3.5" />
                        <span>{format(new Date(task.due_date), "MMM d")}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No date</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </TableCell>
                </TableRow>
              )
            })}
            {sortedTasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                      ? "No tasks match your filters"
                      : "No tasks in this project yet"}
                  </p>
                  <Button variant="outline" size="sm" className="mt-2">
                    <Plus className="size-4 mr-1" />
                    Add Task
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Task Count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground mt-4">
        <span>
          Showing {sortedTasks.length} of {projectTasks.length} tasks
        </span>
      </div>
    </DemoProjectsLayout>
  )
}
