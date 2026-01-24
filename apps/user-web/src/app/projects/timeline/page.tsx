"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import Link from "next/link"
import { useProjects, type Project, type Task, type TaskStatus } from "@/providers/projects-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Calendar,
  FolderKanban,
} from "lucide-react"
import { TimelinePageSkeleton } from "@/components/projects/skeletons"
import { 
  addDays,
  startOfWeek, 
  format, 
  differenceInDays,
  eachDayOfInterval,
  isToday,
  isWeekend,
} from "date-fns"

const statusColors: Record<TaskStatus, string> = {
  todo: "bg-gray-400",
  in_progress: "bg-blue-500",
  review: "bg-amber-500",
  done: "bg-emerald-500",
}

type ZoomLevel = "day" | "week" | "month"

interface TaskWithProject extends Task {
  project?: Project
}

export default function GlobalTimelinePage() {
  const { projects, loading, fetchProjects } = useProjects()
  
  const [startDate, setStartDate] = useState(() => startOfWeek(new Date()))
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("week")

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Gather all tasks with project info
  const allTasks = useMemo(() => {
    const tasks: TaskWithProject[] = []
    projects.forEach((project) => {
      project.tasks?.forEach((task) => {
        tasks.push({ ...task, project })
      })
    })
    return tasks.sort((a, b) => {
      const dateA = a.start_date || a.created_at
      const dateB = b.start_date || b.created_at
      return new Date(dateA).getTime() - new Date(dateB).getTime()
    })
  }, [projects])

  // Calculate visible date range
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

  const handleDateClick = (date: Date) => {
    setStartDate(date)
  }

  // Only show skeleton on first load - cached data renders instantly
  if (loading && projects.length === 0) {
    return <TimelinePageSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timeline</h1>
          <p className="text-muted-foreground">
            View all tasks across projects on a timeline
          </p>
        </div>
      </div>

      {/* Controls */}
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

      {/* Timeline */}
      <div className="border rounded-lg overflow-hidden">
        <ScrollArea className="w-full">
          <div className="min-w-max">
            {/* Header */}
            <div className="flex border-b bg-muted/50 sticky top-0 z-20">
              <div className="w-80 shrink-0 px-3 py-2 border-r bg-muted/50 sticky left-0 z-30">
                <span className="text-sm font-medium">Task</span>
              </div>
              <div className="flex">
                {dateColumns.map((date, i) => (
                  <button
                    key={i}
                    onClick={() => handleDateClick(date)}
                    className={cn(
                      "text-center py-2 border-r text-xs hover:bg-accent transition-colors",
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
                  </button>
                ))}
              </div>
            </div>

            {/* Rows */}
            <div>
              {allTasks.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  No tasks to display
                </div>
              ) : (
                allTasks.map((task) => {
                  const taskStart = task.start_date ? new Date(task.start_date) : new Date(task.created_at)
                  const taskEnd = task.due_date ? new Date(task.due_date) : addDays(taskStart, 7)
                  
                  const startOffset = differenceInDays(taskStart, startDate)
                  const duration = differenceInDays(taskEnd, taskStart) + 1
                  
                  const left = Math.max(0, startOffset * dayWidth)
                  const width = Math.max(dayWidth, duration * dayWidth)

                  return (
                    <div key={task.id} className="flex items-center h-12 border-b hover:bg-muted/50">
                      {/* Task info */}
                      <div className="w-80 shrink-0 px-3 flex items-center gap-2 border-r bg-background sticky left-0 z-10">
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                          style={{ backgroundColor: (task.project?.color || "#6366f1") + "20" }}
                        >
                          <FolderKanban className="w-3 h-3" style={{ color: task.project?.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link 
                            href={`/projects/${task.project_id}`}
                            className="text-sm font-medium truncate block hover:underline"
                          >
                            {task.title}
                          </Link>
                          <p className="text-xs text-muted-foreground truncate">
                            {task.project?.name}
                          </p>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={cn("h-5 text-[10px] shrink-0", statusColors[task.status], "text-white")}
                        >
                          {task.status.replace("_", " ")}
                        </Badge>
                      </div>

                      {/* Bar */}
                      <div className="flex-1 relative h-full">
                        <div
                          className={cn(
                            "absolute top-2 h-8 rounded transition-all",
                            statusColors[task.status]
                          )}
                          style={{
                            left: `${left}px`,
                            width: `${width}px`,
                          }}
                        >
                          <div className="flex items-center justify-between h-full px-2 text-white text-xs">
                            <span className="truncate">{task.title}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div className="text-sm text-muted-foreground text-center">
        Showing {allTasks.length} tasks from {projects.length} projects
      </div>
    </div>
  )
}

