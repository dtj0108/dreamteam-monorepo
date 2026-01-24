"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { useProjects, type Task, type TaskStatus } from "@/providers/projects-provider"
import { ProjectHeader } from "@/components/projects/project-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react"
import { CalendarPageSkeleton } from "@/components/projects/skeletons"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  getDay,
} from "date-fns"
import { TaskDetailSheet } from "@/components/projects/task-detail-sheet"

const statusColors: Record<TaskStatus, string> = {
  todo: "bg-gray-200 text-gray-700 border-gray-300",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  review: "bg-amber-100 text-amber-700 border-amber-200",
  done: "bg-emerald-100 text-emerald-700 border-emerald-200",
}

const statusDotColors: Record<TaskStatus, string> = {
  todo: "bg-gray-400",
  in_progress: "bg-blue-500",
  review: "bg-amber-500",
  done: "bg-emerald-500",
}

interface CalendarDayProps {
  date: Date
  tasks: Task[]
  isCurrentMonth: boolean
  onTaskClick: (task: Task) => void
}

function CalendarDay({ date, tasks, isCurrentMonth, onTaskClick }: CalendarDayProps) {
  const displayTasks = tasks.slice(0, 3)
  const remainingCount = tasks.length - 3

  return (
    <div
      className={cn(
        "min-h-28 border-b border-r p-1",
        !isCurrentMonth && "bg-muted/30",
        isToday(date) && "bg-primary/5"
      )}
    >
      <div className={cn(
        "flex items-center justify-center w-7 h-7 rounded-full text-sm mb-1",
        isToday(date) && "bg-primary text-primary-foreground font-medium",
        !isCurrentMonth && "text-muted-foreground"
      )}>
        {format(date, "d")}
      </div>

      <div className="space-y-0.5">
        {displayTasks.map((task) => (
          <button
            key={task.id}
            className={cn(
              "w-full text-left text-xs px-1.5 py-0.5 rounded truncate",
              "hover:ring-1 hover:ring-primary transition-colors",
              statusColors[task.status]
            )}
            onClick={() => onTaskClick(task)}
          >
            {task.title}
          </button>
        ))}
        {remainingCount > 0 && (
          <div className="text-xs text-muted-foreground px-1.5">
            +{remainingCount} more
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProjectCalendarPage() {
  const params = useParams()
  const projectId = params.id as string
  const { currentProject, tasks, members, loading, fetchProject, fetchTasks } = useProjects()
  
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId)
      fetchTasks(projectId)
    }
  }, [projectId, fetchProject, fetchTasks])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentMonth])

  // Group tasks by due date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {}
    
    tasks.forEach((task) => {
      if (task.due_date) {
        const dateKey = format(new Date(task.due_date), "yyyy-MM-dd")
        if (!grouped[dateKey]) {
          grouped[dateKey] = []
        }
        grouped[dateKey].push(task)
      }
    })

    return grouped
  }, [tasks])

  // Task summary for the month
  const monthSummary = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    
    const monthTasks = tasks.filter((task) => {
      if (!task.due_date) return false
      const dueDate = new Date(task.due_date)
      return dueDate >= monthStart && dueDate <= monthEnd
    })

    return {
      total: monthTasks.length,
      todo: monthTasks.filter(t => t.status === "todo").length,
      inProgress: monthTasks.filter(t => t.status === "in_progress").length,
      review: monthTasks.filter(t => t.status === "review").length,
      done: monthTasks.filter(t => t.status === "done").length,
    }
  }, [tasks, currentMonth])

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const handleToday = () => setCurrentMonth(new Date())

  // Only show skeleton on first load - cached data renders instantly
  if (loading && !currentProject) {
    return <CalendarPageSkeleton />
  }

  if (!currentProject) {
    return <CalendarPageSkeleton />
  }

  return (
    <div className="space-y-6">
      <ProjectHeader project={currentProject} />

      {/* Calendar Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleToday}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <h2 className="text-xl font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", statusDotColors.todo)} />
            <span className="text-muted-foreground">To Do: {monthSummary.todo}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", statusDotColors.in_progress)} />
            <span className="text-muted-foreground">In Progress: {monthSummary.inProgress}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", statusDotColors.done)} />
            <span className="text-muted-foreground">Done: {monthSummary.done}</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, i) => {
            const dateKey = format(date, "yyyy-MM-dd")
            const dayTasks = tasksByDate[dateKey] || []
            const isCurrentMonth = isSameMonth(date, currentMonth)

            return (
              <CalendarDay
                key={i}
                date={date}
                tasks={dayTasks}
                isCurrentMonth={isCurrentMonth}
                onTaskClick={setSelectedTask}
              />
            )
          })}
        </div>
      </Card>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <span className="text-muted-foreground">
          {monthSummary.total} tasks due this month
        </span>
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

