"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import { useProjects, type Project, type Task } from "@/providers/projects-provider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ListTodo,
  FolderKanban,
  ArrowRight,
  CalendarDays,
  Loader2,
  TrendingUp,
} from "lucide-react"
import { formatDistanceToNow, isToday, isTomorrow, isThisWeek, isPast, parseISO } from "date-fns"
import { DashboardPageSkeleton } from "@/components/projects/skeletons"

export default function ProjectsDashboardPage() {
  const { projects, loading, fetchProjects } = useProjects()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Aggregate stats across all projects
  const stats = useMemo(() => {
    let totalTasks = 0
    let completedTasks = 0
    let inProgressTasks = 0
    let reviewTasks = 0
    let todoTasks = 0
    let overdueTasks = 0

    const allTasks: (Task & { projectName: string; projectColor: string })[] = []

    projects.forEach((project) => {
      const tasks = project.tasks || []
      tasks.forEach((task) => {
        totalTasks++
        allTasks.push({ ...task, projectName: project.name, projectColor: project.color })

        switch (task.status) {
          case "done":
            completedTasks++
            break
          case "in_progress":
            inProgressTasks++
            break
          case "review":
            reviewTasks++
            break
          case "todo":
            todoTasks++
            break
        }

        if (task.due_date && isPast(parseISO(task.due_date)) && task.status !== "done") {
          overdueTasks++
        }
      })
    })

    return {
      totalTasks,
      completedTasks,
      inProgressTasks: inProgressTasks + reviewTasks,
      overdueTasks,
      todoTasks,
      reviewTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      allTasks,
    }
  }, [projects])

  // Task distribution by status
  const taskDistribution = useMemo(
    () => [
      { label: "To Do", value: stats.todoTasks, color: "bg-gray-500" },
      { label: "In Progress", value: stats.inProgressTasks - stats.reviewTasks, color: "bg-blue-500" },
      { label: "Review", value: stats.reviewTasks, color: "bg-amber-500" },
      { label: "Done", value: stats.completedTasks, color: "bg-emerald-500" },
    ],
    [stats]
  )

  // Active projects with progress
  const activeProjects = useMemo(() => {
    return projects
      .filter((p) => p.status === "active")
      .map((project) => {
        const tasks = project.tasks || []
        const done = tasks.filter((t) => t.status === "done").length
        const total = tasks.length
        return {
          ...project,
          progress: total > 0 ? Math.round((done / total) * 100) : 0,
          completedTasks: done,
          totalTasks: total,
        }
      })
      .sort((a, b) => b.totalTasks - a.totalTasks)
      .slice(0, 5)
  }, [projects])

  // Upcoming deadlines grouped by: Today, Tomorrow, This Week
  const upcomingDeadlines = useMemo(() => {
    const today: (Task & { projectName: string; projectColor: string })[] = []
    const tomorrow: (Task & { projectName: string; projectColor: string })[] = []
    const thisWeek: (Task & { projectName: string; projectColor: string })[] = []

    stats.allTasks
      .filter((task) => task.due_date && task.status !== "done")
      .forEach((task) => {
        const dueDate = parseISO(task.due_date!)
        if (isPast(dueDate) || isToday(dueDate)) {
          today.push(task)
        } else if (isTomorrow(dueDate)) {
          tomorrow.push(task)
        } else if (isThisWeek(dueDate)) {
          thisWeek.push(task)
        }
      })

    return { today, tomorrow, thisWeek }
  }, [stats.allTasks])

  // Recent activity (most recently updated tasks)
  const recentActivity = useMemo(() => {
    return stats.allTasks
      .filter((task) => task.updated_at && !isNaN(new Date(task.updated_at).getTime()))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 12)
  }, [stats.allTasks])

  // Get status action text
  const getStatusAction = (status: string) => {
    switch (status) {
      case "done":
        return "completed"
      case "in_progress":
        return "started working on"
      case "review":
        return "submitted for review"
      case "todo":
        return "created"
      default:
        return "updated"
    }
  }

  // Only show skeleton on first load
  if (loading && projects.length === 0) {
    return <DashboardPageSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of all projects and tasks</p>
      </div>

      {/* Summary Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ListTodo className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalTasks}</p>
              <p className="text-sm text-muted-foreground">Total Tasks</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completedTasks}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.inProgressTasks}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.overdueTasks}</p>
              <p className="text-sm text-muted-foreground">Overdue</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress Section + Task Distribution */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Overall Completion */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Overall Progress
            </CardTitle>
            <CardDescription>Task completion across all projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative h-32 w-32">
                <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    className="text-muted stroke-current"
                    strokeWidth="10"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                  <circle
                    className="text-emerald-500 stroke-current transition-all duration-500"
                    strokeWidth="10"
                    strokeLinecap="round"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                    strokeDasharray={`${stats.completionRate * 2.51} 251`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{stats.completionRate}%</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-medium">{stats.completedTasks} tasks</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-medium">{stats.totalTasks - stats.completedTasks} tasks</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Active Projects</span>
                  <span className="font-medium">{projects.filter((p) => p.status === "active").length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Task Distribution</CardTitle>
            <CardDescription>Tasks breakdown by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {taskDistribution.map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", item.color)} />
                      <span>{item.label}</span>
                    </div>
                    <span className="font-medium">
                      {item.value} ({stats.totalTasks > 0 ? Math.round((item.value / stats.totalTasks) * 100) : 0}%)
                    </span>
                  </div>
                  <Progress value={stats.totalTasks > 0 ? (item.value / stats.totalTasks) * 100 : 0} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Projects + Upcoming Deadlines */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                Active Projects
              </CardTitle>
              <CardDescription>Top projects by task count</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/projects/all" className="flex items-center gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {activeProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No active projects</div>
            ) : (
              <div className="space-y-4">
                {activeProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: project.color + "20" }}
                    >
                      <FolderKanban className="w-4 h-4" style={{ color: project.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.completedTasks} of {project.totalTasks} tasks
                      </p>
                    </div>
                    <div className="w-20 hidden sm:block">
                      <Progress value={project.progress} className="h-2" />
                    </div>
                    <span className="text-sm font-medium w-10 text-right">{project.progress}%</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Upcoming Deadlines
            </CardTitle>
            <CardDescription>Tasks due this week</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.today.length === 0 &&
            upcomingDeadlines.tomorrow.length === 0 &&
            upcomingDeadlines.thisWeek.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No upcoming deadlines</div>
            ) : (
              <div className="space-y-4">
                {upcomingDeadlines.today.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-600 mb-2">Today / Overdue</h4>
                    <div className="space-y-2">
                      {upcomingDeadlines.today.slice(0, 3).map((task) => (
                        <DeadlineItem key={task.id} task={task} />
                      ))}
                    </div>
                  </div>
                )}
                {upcomingDeadlines.tomorrow.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-amber-600 mb-2">Tomorrow</h4>
                    <div className="space-y-2">
                      {upcomingDeadlines.tomorrow.slice(0, 3).map((task) => (
                        <DeadlineItem key={task.id} task={task} />
                      ))}
                    </div>
                  </div>
                )}
                {upcomingDeadlines.thisWeek.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">This Week</h4>
                    <div className="space-y-2">
                      {upcomingDeadlines.thisWeek.slice(0, 3).map((task) => (
                        <DeadlineItem key={task.id} task={task} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates across all projects</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No recent activity</div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((task) => (
                <div key={task.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <div
                    className="w-2 h-2 rounded-full mt-2 shrink-0"
                    style={{ backgroundColor: task.projectColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="text-muted-foreground">{getStatusAction(task.status)}</span>{" "}
                      <span className="font-medium">{task.title}</span>{" "}
                      <span className="text-muted-foreground">in</span>{" "}
                      <span className="text-muted-foreground">{task.projectName}</span>
                    </p>
                    {task.updated_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  {task.task_assignees && task.task_assignees.length > 0 && (
                    <div className="flex -space-x-2">
                      {task.task_assignees.slice(0, 2).map((assignee) => (
                        <Avatar key={assignee.id} className="h-6 w-6 border-2 border-background">
                          <AvatarImage src={assignee.user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {assignee.user.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Deadline item component
function DeadlineItem({ task }: { task: Task & { projectName: string; projectColor: string } }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: task.projectColor }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        <p className="text-xs text-muted-foreground">{task.projectName}</p>
      </div>
      {task.task_assignees && task.task_assignees.length > 0 && (
        <div className="flex -space-x-1.5">
          {task.task_assignees.slice(0, 2).map((assignee) => (
            <Avatar key={assignee.id} className="h-5 w-5 border border-background">
              <AvatarImage src={assignee.user.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">{assignee.user.name?.charAt(0) || "?"}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      )}
    </div>
  )
}
