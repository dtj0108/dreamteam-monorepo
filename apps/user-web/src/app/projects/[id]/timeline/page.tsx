"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useParams } from "next/navigation"
import { useProjects, type Task, type TaskStatus } from "@/providers/projects-provider"
import { ProjectHeader } from "@/components/projects/project-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Calendar,
} from "lucide-react"
import { ProjectTimelineSkeleton } from "@/components/projects/skeletons"
import { 
  addDays, 
  addWeeks, 
  startOfWeek, 
  endOfWeek, 
  format, 
  differenceInDays,
  eachDayOfInterval,
  isToday,
  isSameDay,
  isWeekend,
} from "date-fns"
import { TaskDetailSheet } from "@/components/projects/task-detail-sheet"

const statusColors: Record<TaskStatus, string> = {
  todo: "bg-gray-400",
  in_progress: "bg-blue-500",
  review: "bg-amber-500",
  done: "bg-emerald-500",
}

type ZoomLevel = "day" | "week" | "month"

interface GanttTaskRowProps {
  task: Task
  startDate: Date
  dayWidth: number
  onTaskClick: (task: Task) => void
}

function GanttTaskRow({ task, startDate, dayWidth, onTaskClick }: GanttTaskRowProps) {
  const taskStart = task.start_date ? new Date(task.start_date) : new Date(task.created_at)
  const taskEnd = task.due_date ? new Date(task.due_date) : addDays(taskStart, 7)
  
  const startOffset = differenceInDays(taskStart, startDate)
  const duration = differenceInDays(taskEnd, taskStart) + 1
  
  const left = Math.max(0, startOffset * dayWidth)
  const width = Math.max(dayWidth, duration * dayWidth)

  const assignees = task.task_assignees?.slice(0, 2) || []

  return (
    <div className="flex items-center h-12 border-b hover:bg-muted/50 group">
      {/* Task info - fixed left column */}
      <div className="w-64 shrink-0 px-3 flex items-center gap-2 border-r bg-background sticky left-0 z-10">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{task.title}</p>
          <div className="flex items-center gap-1.5">
            <Badge 
              variant="secondary" 
              className={cn("h-4 text-[10px] px-1.5", statusColors[task.status], "text-white")}
            >
              {task.status.replace("_", " ")}
            </Badge>
          </div>
        </div>
        <div className="flex -space-x-1 shrink-0">
          {assignees.map((a) => (
            <Avatar key={a.id} className="w-5 h-5 border border-background">
              <AvatarImage src={a.user?.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">
                {a.user?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>

      {/* Gantt bar area */}
      <div className="flex-1 relative h-full">
        <div
          className={cn(
            "absolute top-2 h-8 rounded cursor-pointer transition-all",
            "hover:ring-2 hover:ring-primary hover:ring-offset-1",
            statusColors[task.status]
          )}
          style={{
            left: `${left}px`,
            width: `${width}px`,
          }}
          onClick={() => onTaskClick(task)}
        >
          <div className="flex items-center justify-between h-full px-2 text-white text-xs">
            <span className="truncate">{task.title}</span>
            {task.due_date && (
              <span className="shrink-0 opacity-80">
                {format(new Date(task.due_date), "MMM d")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProjectTimelinePage() {
  const params = useParams()
  const projectId = params.id as string
  const { currentProject, tasks, members, loading, fetchProject, fetchTasks } = useProjects()
  
  const [startDate, setStartDate] = useState(() => startOfWeek(new Date()))
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("week")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId)
      fetchTasks(projectId)
    }
  }, [projectId, fetchProject, fetchTasks])

  // Calculate visible date range and day width based on zoom
  const { visibleDays, dayWidth, endDate } = useMemo(() => {
    let days: number
    let width: number

    switch (zoomLevel) {
      case "day":
        days = 14
        width = 80
        break
      case "week":
        days = 28
        width = 40
        break
      case "month":
        days = 90
        width = 16
        break
      default:
        days = 28
        width = 40
    }

    return {
      visibleDays: days,
      dayWidth: width,
      endDate: addDays(startDate, days),
    }
  }, [startDate, zoomLevel])

  const dateColumns = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [startDate, endDate])

  // Sort tasks by start date
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const dateA = a.start_date || a.created_at
      const dateB = b.start_date || b.created_at
      return new Date(dateA).getTime() - new Date(dateB).getTime()
    })
  }, [tasks])

  const handleNavigate = (direction: "prev" | "next") => {
    const amount = zoomLevel === "month" ? 30 : zoomLevel === "week" ? 7 : 3
    setStartDate(prev => 
      direction === "next" ? addDays(prev, amount) : addDays(prev, -amount)
    )
  }

  const handleZoom = (direction: "in" | "out") => {
    const levels: ZoomLevel[] = ["month", "week", "day"]
    const currentIndex = levels.indexOf(zoomLevel)
    if (direction === "in" && currentIndex < levels.length - 1) {
      setZoomLevel(levels[currentIndex + 1])
    } else if (direction === "out" && currentIndex > 0) {
      setZoomLevel(levels[currentIndex - 1])
    }
  }

  const handleGoToToday = () => {
    setStartDate(startOfWeek(new Date()))
  }

  // Only show skeleton on first load - cached data renders instantly
  if (loading && !currentProject) {
    return <ProjectTimelineSkeleton />
  }

  if (!currentProject) {
    return <ProjectTimelineSkeleton />
  }

  return (
    <div className="space-y-6">
      <ProjectHeader project={currentProject} />

      {/* Timeline Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => handleNavigate("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleGoToToday}>
            <Calendar className="h-4 w-4 mr-2" />
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleNavigate("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-sm font-medium">
          {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => handleZoom("out")}
            disabled={zoomLevel === "month"}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground capitalize w-16 text-center">
            {zoomLevel}
          </span>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => handleZoom("in")}
            disabled={zoomLevel === "day"}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="border rounded-lg overflow-hidden">
        <ScrollArea className="w-full" ref={scrollRef}>
          <div className="min-w-max">
            {/* Header row */}
            <div className="flex border-b bg-muted/50 sticky top-0 z-20">
              {/* Fixed task column header */}
              <div className="w-64 shrink-0 px-3 py-2 border-r bg-muted/50 sticky left-0 z-30">
                <span className="text-sm font-medium">Task</span>
              </div>

              {/* Date headers */}
              <div className="flex">
                {dateColumns.map((date, i) => (
                  <div
                    key={i}
                    className={cn(
                      "text-center py-2 border-r text-xs",
                      isToday(date) && "bg-primary/10",
                      isWeekend(date) && "bg-muted/50"
                    )}
                    style={{ width: `${dayWidth}px` }}
                  >
                    <div className="font-medium">
                      {format(date, zoomLevel === "day" ? "EEE" : "d")}
                    </div>
                    {(i === 0 || date.getDate() === 1) && (
                      <div className="text-muted-foreground">
                        {format(date, "MMM")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Task rows */}
            <div>
              {sortedTasks.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  No tasks to display
                </div>
              ) : (
                sortedTasks.map((task) => (
                  <GanttTaskRow
                    key={task.id}
                    task={task}
                    startDate={startDate}
                    dayWidth={dayWidth}
                    onTaskClick={setSelectedTask}
                  />
                ))
              )}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Today line indicator */}
      <div className="text-sm text-muted-foreground text-center">
        Showing {sortedTasks.length} tasks • Drag bars to reschedule (coming soon)
      </div>

      <TaskDetailSheet
        task={selectedTask}
        projectId={projectId}
        workspaceId={currentProject?.workspace_id}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        members={members}
      />
    </div>
  )
}

