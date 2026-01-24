"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import { useProjects, type Project, type Milestone } from "@/providers/projects-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { format, differenceInDays, isPast } from "date-fns"
import {
  Flag,
  CheckCircle2,
  AlertCircle,
  Clock,
  FolderKanban,
  Target,
} from "lucide-react"
import { MilestonesPageSkeleton } from "@/components/projects/skeletons"

interface MilestoneWithProject extends Milestone {
  project?: Project
}

const statusConfig = {
  upcoming: { 
    color: "bg-blue-100 text-blue-700 border-blue-200", 
    icon: Clock,
    label: "Upcoming" 
  },
  at_risk: { 
    color: "bg-amber-100 text-amber-700 border-amber-200", 
    icon: AlertCircle,
    label: "At Risk" 
  },
  completed: { 
    color: "bg-emerald-100 text-emerald-700 border-emerald-200", 
    icon: CheckCircle2,
    label: "Completed" 
  },
  missed: { 
    color: "bg-red-100 text-red-700 border-red-200", 
    icon: AlertCircle,
    label: "Missed" 
  },
}

export default function GlobalMilestonesPage() {
  const { projects, loading, fetchProjects } = useProjects()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Gather all milestones with project info
  const allMilestones = useMemo(() => {
    const milestones: MilestoneWithProject[] = []
    projects.forEach((project) => {
      project.milestones?.forEach((milestone) => {
        milestones.push({ ...milestone, project })
      })
    })
    return milestones.sort((a, b) => 
      new Date(a.target_date).getTime() - new Date(b.target_date).getTime()
    )
  }, [projects])

  // Group by status
  const groupedMilestones = useMemo(() => ({
    upcoming: allMilestones.filter(m => m.status === "upcoming"),
    atRisk: allMilestones.filter(m => m.status === "at_risk"),
    completed: allMilestones.filter(m => m.status === "completed"),
    missed: allMilestones.filter(m => m.status === "missed"),
  }), [allMilestones])

  // Stats
  const stats = useMemo(() => ({
    total: allMilestones.length,
    upcoming: groupedMilestones.upcoming.length,
    atRisk: groupedMilestones.atRisk.length,
    completed: groupedMilestones.completed.length,
    missed: groupedMilestones.missed.length,
  }), [allMilestones, groupedMilestones])

  // Only show skeleton on first load - cached data renders instantly
  if (loading && projects.length === 0) {
    return <MilestonesPageSkeleton />
  }

  const MilestoneCard = ({ milestone }: { milestone: MilestoneWithProject }) => {
    const config = statusConfig[milestone.status]
    const StatusIcon = config.icon
    const targetDate = new Date(milestone.target_date)
    const daysUntil = differenceInDays(targetDate, new Date())

    const getDaysLabel = () => {
      if (milestone.status === "completed") return "Completed"
      if (milestone.status === "missed") return "Missed"
      if (daysUntil === 0) return "Due today"
      if (daysUntil < 0) return `${Math.abs(daysUntil)} days overdue`
      return `${daysUntil} days left`
    }

    return (
      <Card className="group">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              config.color
            )}>
              <Flag className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">{milestone.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className={config.color}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {format(targetDate, "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Project link */}
          <Link 
            href={`/projects/${milestone.project_id}`}
            className="flex items-center gap-2 text-sm hover:underline"
          >
            <div
              className="w-5 h-5 rounded flex items-center justify-center"
              style={{ backgroundColor: (milestone.project?.color || "#6366f1") + "20" }}
            >
              <FolderKanban className="w-3 h-3" style={{ color: milestone.project?.color }} />
            </div>
            <span className="text-muted-foreground">{milestone.project?.name}</span>
          </Link>

          {milestone.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {milestone.description}
            </p>
          )}

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {milestone.completedTasks || 0} of {milestone.totalTasks || 0} tasks
              </span>
              <span className={cn(
                "font-medium",
                daysUntil < 0 && milestone.status !== "completed" && "text-red-600"
              )}>
                {getDaysLabel()}
              </span>
            </div>
            <Progress value={milestone.progress || 0} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Milestones</h1>
        <p className="text-muted-foreground">
          Track milestones across all projects
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Target className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.upcoming}</p>
              <p className="text-sm text-muted-foreground">Upcoming</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.atRisk}</p>
              <p className="text-sm text-muted-foreground">At Risk</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.missed}</p>
              <p className="text-sm text-muted-foreground">Missed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Milestones */}
      {allMilestones.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Target className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No milestones yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create milestones within your projects to track key checkpoints
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* At Risk - Show first */}
          {groupedMilestones.atRisk.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-amber-600 mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                At Risk ({groupedMilestones.atRisk.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedMilestones.atRisk.map((m) => (
                  <MilestoneCard key={m.id} milestone={m} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {groupedMilestones.upcoming.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Upcoming ({groupedMilestones.upcoming.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedMilestones.upcoming.map((m) => (
                  <MilestoneCard key={m.id} milestone={m} />
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {groupedMilestones.completed.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-emerald-600 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Completed ({groupedMilestones.completed.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedMilestones.completed.map((m) => (
                  <MilestoneCard key={m.id} milestone={m} />
                ))}
              </div>
            </div>
          )}

          {/* Missed */}
          {groupedMilestones.missed.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Missed ({groupedMilestones.missed.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedMilestones.missed.map((m) => (
                  <MilestoneCard key={m.id} milestone={m} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

