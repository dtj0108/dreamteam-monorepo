"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
import { useProjects } from "@/providers/projects-provider"
import { ProjectHeader } from "@/components/projects/project-header"
import { KanbanBoard } from "@/components/projects/kanban-board"
import { ProjectDetailSkeleton } from "@/components/projects/skeletons"

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.id as string
  const { currentProject, loading, fetchProject, fetchTasks } = useProjects()

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId)
      fetchTasks(projectId)
    }
  }, [projectId, fetchProject, fetchTasks])

  // Only show skeleton on first load (no cached data)
  // If we have the cached project, render it instantly while refreshing in background
  if (loading && !currentProject) {
    return <ProjectDetailSkeleton />
  }

  // Still waiting for initial data
  if (!currentProject) {
    return <ProjectDetailSkeleton />
  }

  return (
    <div className="space-y-6">
      <ProjectHeader project={currentProject} />
      <KanbanBoard projectId={projectId} />
    </div>
  )
}

