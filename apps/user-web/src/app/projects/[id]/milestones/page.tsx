"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useProjects, type Milestone } from "@/providers/projects-provider"
import { ProjectHeader } from "@/components/projects/project-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { format, isPast, isToday, differenceInDays } from "date-fns"
import {
  Loader2,
  Plus,
  CalendarIcon,
  Flag,
  CheckCircle2,
  AlertCircle,
  Clock,
  MoreHorizontal,
  Trash2,
  Edit,
  Target,
} from "lucide-react"
import { ProjectMilestonesSkeleton } from "@/components/projects/skeletons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

interface MilestoneCardProps {
  milestone: Milestone
  onEdit: () => void
  onDelete: () => void
}

function MilestoneCard({ milestone, onEdit, onDelete }: MilestoneCardProps) {
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
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              config.color
            )}>
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">{milestone.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {milestone.description && (
          <p className="text-sm text-muted-foreground">{milestone.description}</p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{milestone.progress || 0}%</span>
          </div>
          <Progress value={milestone.progress || 0} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{milestone.completedTasks || 0} of {milestone.totalTasks || 0} tasks</span>
            <span className={cn(
              daysUntil < 0 && milestone.status !== "completed" && "text-red-600 font-medium"
            )}>
              {getDaysLabel()}
            </span>
          </div>
        </div>

        {milestone.tasks && milestone.tasks.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Linked Tasks</span>
            <div className="space-y-1">
              {milestone.tasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50"
                >
                  <CheckCircle2
                    className={cn(
                      "h-4 w-4",
                      task.status === "done" ? "text-emerald-500" : "text-muted-foreground"
                    )}
                  />
                  <span className={cn(
                    task.status === "done" && "line-through text-muted-foreground"
                  )}>
                    {task.title}
                  </span>
                </div>
              ))}
              {milestone.tasks.length > 3 && (
                <span className="text-xs text-muted-foreground px-2">
                  +{milestone.tasks.length - 3} more tasks
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ProjectMilestonesPage() {
  const params = useParams()
  const projectId = params.id as string
  const { currentProject, milestones, loading, fetchProject } = useProjects()
  
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [targetDate, setTargetDate] = useState<Date | undefined>()

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId)
    }
  }, [projectId, fetchProject])

  const handleCreateMilestone = async () => {
    if (!name || !targetDate) return

    setCreateLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          target_date: targetDate.toISOString().split("T")[0],
        }),
      })

      if (response.ok) {
        setShowCreateDialog(false)
        setName("")
        setDescription("")
        setTargetDate(undefined)
        fetchProject(projectId) // Refresh data
      }
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!confirm("Delete this milestone?")) return

    try {
      await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
        method: "DELETE",
      })
      fetchProject(projectId) // Refresh data
    } catch (error) {
      console.error("Failed to delete milestone:", error)
    }
  }

  // Group milestones by status
  const upcomingMilestones = milestones.filter(m => m.status === "upcoming")
  const atRiskMilestones = milestones.filter(m => m.status === "at_risk")
  const completedMilestones = milestones.filter(m => m.status === "completed")
  const missedMilestones = milestones.filter(m => m.status === "missed")

  // Only show skeleton on first load - cached data renders instantly
  if (loading && !currentProject) {
    return <ProjectMilestonesSkeleton />
  }

  if (!currentProject) {
    return <ProjectMilestonesSkeleton />
  }

  return (
    <div className="space-y-6">
      <ProjectHeader project={currentProject} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Milestones</h2>
          <p className="text-sm text-muted-foreground">
            Track key project checkpoints and deliverables
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Milestone
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcomingMilestones.length}</p>
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
              <p className="text-2xl font-bold">{atRiskMilestones.length}</p>
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
              <p className="text-2xl font-bold">{completedMilestones.length}</p>
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
              <p className="text-2xl font-bold">{missedMilestones.length}</p>
              <p className="text-sm text-muted-foreground">Missed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Milestones Grid */}
      {milestones.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Target className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No milestones yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create milestones to track key project checkpoints
            </p>
            <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Milestone
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...atRiskMilestones, ...upcomingMilestones, ...completedMilestones, ...missedMilestones].map((milestone) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              onEdit={() => {/* TODO: Implement edit */}}
              onDelete={() => handleDeleteMilestone(milestone.id)}
            />
          ))}
        </div>
      )}

      {/* Create Milestone Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Milestone</DialogTitle>
            <DialogDescription>
              Add a new milestone to track a key checkpoint in your project.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Beta Launch"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What does this milestone represent?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label>Target Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !targetDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {targetDate ? format(targetDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={targetDate}
                    onSelect={setTargetDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateMilestone}
              disabled={!name || !targetDate || createLoading}
            >
              {createLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

