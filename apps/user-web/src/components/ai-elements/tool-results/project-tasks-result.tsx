"use client"

import { ListTodo, Circle, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ToolResultCard } from "./tool-result-card"
import type { ProjectTasksResult as ProjectTasksResultType } from "@/lib/agent"

interface ProjectTasksResultProps {
  result: ProjectTasksResultType & {
    message?: string
    task?: ProjectTasksResultType["tasks"][number]
  }
}

const statusIcons: Record<string, React.ReactNode> = {
  todo: <Circle className="size-3" />,
  in_progress: <Clock className="size-3 text-blue-500" />,
  done: <CheckCircle2 className="size-3 text-green-500" />,
  blocked: <AlertCircle className="size-3 text-red-500" />,
}

export function ProjectTasksResult({ result }: ProjectTasksResultProps) {
  // Handle both array format and single task format
  const tasks = result?.tasks || (result?.task ? [result.task] : [])
  const summary = result?.summary || { count: tasks.length, byStatus: {}, byPriority: {} }

  // Determine action message
  const actionMessage = result?.message
    ? String(result.message)
    : tasks.length === 1
      ? "Task Created"
      : `${summary.count} Tasks`

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, overdue: true }
    if (diffDays === 0) return { text: "Due today", overdue: false }
    if (diffDays === 1) return { text: "Due tomorrow", overdue: false }
    return { text: `Due in ${diffDays}d`, overdue: false }
  }

  return (
    <ToolResultCard
      icon={<ListTodo className="size-4" />}
      title={actionMessage}
      status="success"
    >
      <div className="space-y-2">
        {/* Summary badges */}
        {summary.byStatus && Object.keys(summary.byStatus).length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {Object.entries(summary.byStatus).map(([status, count]) => (
              <Badge key={status} variant="outline" className="text-[10px] h-5 gap-1">
                {statusIcons[status] || <Circle className="size-3" />}
                {count} {status.replace("_", " ")}
              </Badge>
            ))}
          </div>
        )}

        {/* Task list - compact single-line rows */}
        {tasks.slice(0, 8).map((task: ProjectTasksResultType["tasks"][number]) => {
          const dueInfo = formatDate(task.dueDate)
          return (
            <div key={task.id} className="flex items-center gap-1.5 text-xs py-0.5">
              {statusIcons[task.status] || <Circle className="size-3" />}
              <span className="truncate flex-1 min-w-0">{task.title}</span>
              {task.priority && task.priority !== "medium" && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className={task.priority === "urgent" || task.priority === "high" ? "text-orange-500" : "text-muted-foreground"}>
                    {task.priority}
                  </span>
                </>
              )}
              {dueInfo && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className={dueInfo.overdue ? "text-red-500" : "text-muted-foreground"}>
                    {dueInfo.text}
                  </span>
                </>
              )}
              {task.assignees?.[0] && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">@{task.assignees[0].name.split(' ')[0]}</span>
                </>
              )}
            </div>
          )
        })}

        {tasks.length > 8 && (
          <p className="text-xs text-muted-foreground">
            + {tasks.length - 8} more
          </p>
        )}

        {tasks.length === 0 && (
          <p className="text-xs text-muted-foreground">No tasks found.</p>
        )}
      </div>
    </ToolResultCard>
  )
}
