"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useProjects, type Task, type TaskStatus, type Project } from "@/providers/projects-provider"
import { useUser } from "@/hooks/use-user"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { format, isPast, isToday, isTomorrow, isThisWeek } from "date-fns"
import {
  Search,
  Calendar,
  FolderKanban,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Users,
  ChevronDown,
  User,
} from "lucide-react"
import { MyTasksPageSkeleton } from "@/components/projects/skeletons"

const statusColors: Record<TaskStatus, string> = {
  todo: "bg-gray-100 text-gray-700 border-gray-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  review: "bg-amber-100 text-amber-700 border-amber-200",
  done: "bg-emerald-100 text-emerald-700 border-emerald-200",
}

type ViewMode = "my" | "all"
type GroupBy = "due_date" | "project" | "assignee"

interface TaskWithProject extends Task {
  project?: Project
}

interface Assignee {
  id: string
  name: string
  avatar_url: string | null
}

export default function MyTasksPage() {
  const { user } = useUser()
  const { projects, loading, fetchProjects } = useProjects()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("active")
  const [viewMode, setViewMode] = useState<ViewMode>("all")
  const [groupBy, setGroupBy] = useState<GroupBy>("project")

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Get all tasks based on view mode
  const allTasks = useMemo(() => {
    const tasks: TaskWithProject[] = []

    projects.forEach((project) => {
      project.tasks?.forEach((task) => {
        if (viewMode === "all") {
          tasks.push({ ...task, project })
        } else {
          const isAssigned = task.task_assignees?.some(
            (a) => a.user?.id === user?.id
          )
          if (isAssigned) {
            tasks.push({ ...task, project })
          }
        }
      })
    })

    return tasks
  }, [projects, user?.id, viewMode])

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let filtered = allTasks

    // Search filter
    if (search) {
      filtered = filtered.filter((task) =>
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.project?.name.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter === "active") {
      filtered = filtered.filter((t) => t.status !== "done")
    } else if (statusFilter === "completed") {
      filtered = filtered.filter((t) => t.status === "done")
    }

    return filtered
  }, [allTasks, search, statusFilter])

  // Group by due date
  const groupedByDueDate = useMemo(() => {
    const overdue: TaskWithProject[] = []
    const today: TaskWithProject[] = []
    const tomorrow: TaskWithProject[] = []
    const thisWeek: TaskWithProject[] = []
    const later: TaskWithProject[] = []
    const noDueDate: TaskWithProject[] = []

    filteredTasks.forEach((task) => {
      if (!task.due_date) {
        noDueDate.push(task)
        return
      }

      const dueDate = new Date(task.due_date)
      if (isPast(dueDate) && !isToday(dueDate)) {
        overdue.push(task)
      } else if (isToday(dueDate)) {
        today.push(task)
      } else if (isTomorrow(dueDate)) {
        tomorrow.push(task)
      } else if (isThisWeek(dueDate)) {
        thisWeek.push(task)
      } else {
        later.push(task)
      }
    })

    return { overdue, today, tomorrow, thisWeek, later, noDueDate }
  }, [filteredTasks])

  // Group by project
  const groupedByProject = useMemo(() => {
    const groups: Record<string, { project: Project; tasks: TaskWithProject[] }> = {}

    filteredTasks.forEach((task) => {
      if (!task.project) return
      if (!groups[task.project_id]) {
        groups[task.project_id] = { project: task.project, tasks: [] }
      }
      groups[task.project_id].tasks.push(task)
    })

    return Object.values(groups).sort((a, b) => a.project.name.localeCompare(b.project.name))
  }, [filteredTasks])

  // Group by assignee
  const groupedByAssignee = useMemo(() => {
    const groups: Record<string, { assignee: Assignee; tasks: TaskWithProject[] }> = {}
    const unassigned: TaskWithProject[] = []

    filteredTasks.forEach((task) => {
      if (!task.task_assignees?.length) {
        unassigned.push(task)
      } else {
        task.task_assignees.forEach((a) => {
          if (!groups[a.user.id]) {
            groups[a.user.id] = { assignee: a.user, tasks: [] }
          }
          // Avoid duplicate tasks if multiple assignees
          if (!groups[a.user.id].tasks.some(t => t.id === task.id)) {
            groups[a.user.id].tasks.push(task)
          }
        })
      }
    })

    const sortedGroups = Object.values(groups).sort((a, b) =>
      a.assignee.name.localeCompare(b.assignee.name)
    )

    return { groups: sortedGroups, unassigned }
  }, [filteredTasks])

  // Stats
  const stats = useMemo(() => ({
    total: allTasks.length,
    todo: allTasks.filter(t => t.status === "todo").length,
    inProgress: allTasks.filter(t => t.status === "in_progress").length,
    review: allTasks.filter(t => t.status === "review").length,
    done: allTasks.filter(t => t.status === "done").length,
    overdue: allTasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== "done").length,
  }), [allTasks])

  const TaskRow = ({ task, showAssignees = false }: { task: TaskWithProject; showAssignees?: boolean }) => (
    <Link
      href={`/projects/${task.project_id}`}
      className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors group"
    >
      {task.status === "done" ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium truncate",
          task.status === "done" && "line-through text-muted-foreground"
        )}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FolderKanban className="h-3 w-3" />
            {task.project?.name}
          </div>
        </div>
      </div>

      {showAssignees && task.task_assignees && task.task_assignees.length > 0 && (
        <div className="flex -space-x-1">
          {task.task_assignees.slice(0, 3).map((a) => (
            <Avatar key={a.id} className="h-6 w-6 border-2 border-background">
              <AvatarImage src={a.user.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {a.user.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
          ))}
          {task.task_assignees.length > 3 && (
            <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs text-muted-foreground">
              +{task.task_assignees.length - 3}
            </div>
          )}
        </div>
      )}

      <Badge variant="outline" className={cn("shrink-0", statusColors[task.status])}>
        {task.status.replace("_", " ")}
      </Badge>

      {task.due_date && (
        <div className={cn(
          "flex items-center gap-1 text-xs shrink-0",
          isPast(new Date(task.due_date)) && task.status !== "done"
            ? "text-red-600"
            : "text-muted-foreground"
        )}>
          <Calendar className="h-3 w-3" />
          {format(new Date(task.due_date), "MMM d")}
        </div>
      )}
    </Link>
  )

  const TaskGroup = ({ title, tasks, icon: Icon, className, showAssignees = false }: {
    title: string
    tasks: TaskWithProject[]
    icon: typeof Calendar
    className?: string
    showAssignees?: boolean
  }) => {
    if (tasks.length === 0) return null

    return (
      <div className="space-y-2">
        <div className={cn("flex items-center gap-2 text-sm font-medium", className)}>
          <Icon className="h-4 w-4" />
          {title} ({tasks.length})
        </div>
        <Card>
          <div className="divide-y">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} showAssignees={showAssignees} />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  const ProjectGroup = ({ project, tasks }: { project: Project; tasks: TaskWithProject[] }) => {
    if (tasks.length === 0) return null

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <div
            className="h-4 w-4 rounded"
            style={{ backgroundColor: project.color || "#6b7280" }}
          />
          {project.name} ({tasks.length})
        </div>
        <Card>
          <div className="divide-y">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} showAssignees={viewMode === "all"} />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  const AssigneeGroup = ({ assignee, tasks }: { assignee: Assignee; tasks: TaskWithProject[] }) => {
    if (tasks.length === 0) return null

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Avatar className="h-5 w-5">
            <AvatarImage src={assignee.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {assignee.name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          {assignee.name} ({tasks.length})
        </div>
        <Card>
          <div className="divide-y">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  // Only show skeleton on first load - cached data renders instantly
  if (loading && projects.length === 0) {
    return <MyTasksPageSkeleton />
  }

  const groupByLabel = {
    due_date: "Due Date",
    project: "Project",
    assignee: "Assignee",
  }

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {viewMode === "my" ? "My Tasks" : "All Tasks"}
          </h1>
          <p className="text-muted-foreground">
            {viewMode === "my"
              ? "Tasks assigned to you across projects"
              : "All tasks across all projects"
            }
          </p>
        </div>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="my" className="gap-1.5">
              <User className="h-4 w-4" />
              My Tasks
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-1.5">
              <Users className="h-4 w-4" />
              All Tasks
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Circle className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.todo}</p>
              <p className="text-sm text-muted-foreground">To Do</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.review}</p>
              <p className="text-sm text-muted-foreground">Review</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.done}</p>
              <p className="text-sm text-muted-foreground">Done</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.overdue}</p>
              <p className="text-sm text-muted-foreground">Overdue</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              Group by: {groupByLabel[groupBy]}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setGroupBy("due_date")}>
              <Calendar className="h-4 w-4 mr-2" />
              Due Date
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setGroupBy("project")}>
              <FolderKanban className="h-4 w-4 mr-2" />
              Project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setGroupBy("assignee")}>
              <Users className="h-4 w-4 mr-2" />
              Assignee
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Task Groups */}
      {filteredTasks.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No tasks found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {allTasks.length === 0
                ? viewMode === "my"
                  ? "You don't have any tasks assigned yet"
                  : "No tasks exist yet"
                : "Try adjusting your search or filters"
              }
            </p>
          </div>
        </Card>
      ) : groupBy === "due_date" ? (
        <div className="space-y-6">
          <TaskGroup
            title="Overdue"
            tasks={groupedByDueDate.overdue}
            icon={AlertCircle}
            className="text-red-600"
            showAssignees={viewMode === "all"}
          />
          <TaskGroup
            title="Today"
            tasks={groupedByDueDate.today}
            icon={Calendar}
            className="text-blue-600"
            showAssignees={viewMode === "all"}
          />
          <TaskGroup
            title="Tomorrow"
            tasks={groupedByDueDate.tomorrow}
            icon={Calendar}
            showAssignees={viewMode === "all"}
          />
          <TaskGroup
            title="This Week"
            tasks={groupedByDueDate.thisWeek}
            icon={Calendar}
            showAssignees={viewMode === "all"}
          />
          <TaskGroup
            title="Later"
            tasks={groupedByDueDate.later}
            icon={Calendar}
            className="text-muted-foreground"
            showAssignees={viewMode === "all"}
          />
          <TaskGroup
            title="No Due Date"
            tasks={groupedByDueDate.noDueDate}
            icon={Circle}
            className="text-muted-foreground"
            showAssignees={viewMode === "all"}
          />
        </div>
      ) : groupBy === "project" ? (
        <div className="space-y-6">
          {groupedByProject.map(({ project, tasks }) => (
            <ProjectGroup key={project.id} project={project} tasks={tasks} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByAssignee.groups.map(({ assignee, tasks }) => (
            <AssigneeGroup key={assignee.id} assignee={assignee} tasks={tasks} />
          ))}
          {groupedByAssignee.unassigned.length > 0 && (
            <TaskGroup
              title="Unassigned"
              tasks={groupedByAssignee.unassigned}
              icon={User}
              className="text-muted-foreground"
            />
          )}
        </div>
      )}
    </div>
  )
}
