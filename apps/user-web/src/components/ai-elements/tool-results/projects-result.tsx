"use client"

import { FolderKanban, CheckCircle2, Clock, Pause, Archive } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ToolResultCard } from "./tool-result-card"
import type { ProjectsResult as ProjectsResultType } from "@/lib/agent"

interface ProjectsResultProps {
  result: ProjectsResultType & {
    message?: string
    project?: ProjectsResultType["projects"][number]
  }
}

const statusIcons: Record<string, React.ReactNode> = {
  active: <Clock className="size-3" />,
  completed: <CheckCircle2 className="size-3" />,
  on_hold: <Pause className="size-3" />,
  archived: <Archive className="size-3" />,
}

const priorityColors: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
}

export function ProjectsResult({ result }: ProjectsResultProps) {
  // Handle both array format and object format from tool results
  const projects = result?.projects || (result?.project ? [result.project] : [])
  const summary = result?.summary || { count: projects.length, byStatus: {} }

  // Determine if this was a create/update action or a query
  const actionMessage = result?.message
    ? String(result.message)
    : projects.length === 1
      ? "Project Created"
      : `${summary.count} Projects Found`

  return (
    <ToolResultCard
      icon={<FolderKanban className="size-4" />}
      title={actionMessage}
      status="success"
    >
      <div className="space-y-2">
        {projects.slice(0, 5).map((project: ProjectsResultType["projects"][number]) => (
          <div
            key={project.id}
            className="p-2 rounded-md border bg-card/50 space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{project.name}</span>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] h-5 gap-1">
                  {statusIcons[project.status]}
                  {project.status}
                </Badge>
                <div
                  className={`size-2 rounded-full ${priorityColors[project.priority] || "bg-gray-400"}`}
                  title={`${project.priority} priority`}
                />
              </div>
            </div>

            {project.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {project.description}
              </p>
            )}

            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1.5 flex-1">
                <span>{project.completedTasks}/{project.totalTasks} tasks</span>
                <Progress
                  value={project.progress}
                  className="h-1 flex-1 max-w-20"
                />
              </div>
              {project.ownerName && (
                <span>Owner: {project.ownerName}</span>
              )}
            </div>
          </div>
        ))}

        {projects.length > 5 && (
          <p className="text-xs text-muted-foreground text-center">
            + {projects.length - 5} more projects
          </p>
        )}

        {projects.length === 0 && (
          <p className="text-xs text-muted-foreground">No projects found.</p>
        )}
      </div>
    </ToolResultCard>
  )
}
