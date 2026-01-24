"use client"

import { useState, useEffect, useMemo } from "react"
import { useProjects, type Project, type TaskStatus } from "@/providers/projects-provider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  PieChart,
  FolderKanban,
} from "lucide-react"
import { ReportsPageSkeleton } from "@/components/projects/skeletons"

export default function ProjectsReportsPage() {
  const { projects, loading, fetchProjects } = useProjects()
  const [timeRange, setTimeRange] = useState<"week" | "month" | "quarter">("month")

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Aggregate stats
  const stats = useMemo(() => {
    let totalTasks = 0
    let completedTasks = 0
    let totalEstimatedHours = 0
    let todoTasks = 0
    let inProgressTasks = 0
    let reviewTasks = 0
    let overdueTasks = 0

    const projectStats = projects.map((project) => {
      const tasks = project.tasks || []
      const done = tasks.filter(t => t.status === "done").length
      const total = tasks.length
      
      totalTasks += total
      completedTasks += done
      todoTasks += tasks.filter(t => t.status === "todo").length
      inProgressTasks += tasks.filter(t => t.status === "in_progress").length
      reviewTasks += tasks.filter(t => t.status === "review").length
      
      tasks.forEach(t => {
        totalEstimatedHours += t.estimated_hours || 0
        if (t.due_date && new Date(t.due_date) < new Date() && t.status !== "done") {
          overdueTasks++
        }
      })

      return {
        ...project,
        completedTasks: done,
        totalTasks: total,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
      }
    })

    return {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === "active").length,
      completedProjects: projects.filter(p => p.status === "completed").length,
      totalTasks,
      completedTasks,
      todoTasks,
      inProgressTasks,
      reviewTasks,
      overdueTasks,
      totalEstimatedHours,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      projectStats,
    }
  }, [projects])

  // Task distribution by status
  const taskDistribution = useMemo(() => [
    { label: "To Do", value: stats.todoTasks, color: "bg-gray-500" },
    { label: "In Progress", value: stats.inProgressTasks, color: "bg-blue-500" },
    { label: "Review", value: stats.reviewTasks, color: "bg-amber-500" },
    { label: "Done", value: stats.completedTasks, color: "bg-emerald-500" },
  ], [stats])

  // Project status distribution
  const projectDistribution = useMemo(() => [
    { label: "Active", value: stats.activeProjects, color: "bg-emerald-500" },
    { label: "On Hold", value: projects.filter(p => p.status === "on_hold").length, color: "bg-amber-500" },
    { label: "Completed", value: stats.completedProjects, color: "bg-blue-500" },
    { label: "Archived", value: projects.filter(p => p.status === "archived").length, color: "bg-gray-500" },
  ], [stats, projects])

  // Only show skeleton on first load - cached data renders instantly
  if (loading && projects.length === 0) {
    return <ReportsPageSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Project analytics and performance metrics
          </p>
        </div>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <FolderKanban className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalProjects}</p>
              <p className="text-sm text-muted-foreground">Total Projects</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
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
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completionRate}%</p>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
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
              <p className="text-sm text-muted-foreground">Overdue Tasks</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Task Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Task Distribution
            </CardTitle>
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
                  <Progress 
                    value={stats.totalTasks > 0 ? (item.value / stats.totalTasks) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Project Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              Project Status
            </CardTitle>
            <CardDescription>Projects breakdown by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projectDistribution.map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", item.color)} />
                      <span>{item.label}</span>
                    </div>
                    <span className="font-medium">
                      {item.value} ({stats.totalProjects > 0 ? Math.round((item.value / stats.totalProjects) * 100) : 0}%)
                    </span>
                  </div>
                  <Progress 
                    value={stats.totalProjects > 0 ? (item.value / stats.totalProjects) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Progress Table */}
      <Card>
        <CardHeader>
          <CardTitle>Project Progress</CardTitle>
          <CardDescription>Individual project completion status</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.projectStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No projects to display
            </div>
          ) : (
            <div className="space-y-4">
              {stats.projectStats.map((project) => (
                <div key={project.id} className="flex items-center gap-4">
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
                  <div className="w-32">
                    <Progress value={project.progress} className="h-2" />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">
                    {project.progress}%
                  </span>
                  <Badge 
                    variant="outline"
                    className={cn(
                      project.status === "active" && "bg-emerald-100 text-emerald-700",
                      project.status === "on_hold" && "bg-amber-100 text-amber-700",
                      project.status === "completed" && "bg-blue-100 text-blue-700",
                      project.status === "archived" && "bg-gray-100 text-gray-700"
                    )}
                  >
                    {project.status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold">{stats.totalEstimatedHours}h</p>
              <p className="text-sm text-muted-foreground">Total Estimated Hours</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-lg font-bold">{stats.completedTasks}</p>
              <p className="text-sm text-muted-foreground">Tasks Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-lg font-bold">{stats.inProgressTasks}</p>
              <p className="text-sm text-muted-foreground">Tasks In Progress</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

