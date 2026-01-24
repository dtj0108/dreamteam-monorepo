"use client"

import * as React from "react"
import Link from "next/link"
import { useDemoProjects } from "@/providers"
import { DemoProjectsLayout } from "@/components/demo/demo-projects-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Plus,
  CalendarDays,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderKanban,
  TrendingUp,
} from "lucide-react"
import { format } from "date-fns"
import type { DemoProject } from "@/lib/demo-data"

function getStatusBadge(status: DemoProject['status']) {
  switch (status) {
    case 'active':
      return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">Active</Badge>
    case 'on_hold':
      return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">On Hold</Badge>
    case 'completed':
      return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">Completed</Badge>
    case 'archived':
      return <Badge className="bg-gray-500/10 text-gray-600 hover:bg-gray-500/20">Archived</Badge>
  }
}

function getPriorityBadge(priority: DemoProject['priority']) {
  switch (priority) {
    case 'critical':
      return <Badge variant="outline" className="border-red-200 text-red-600 text-[10px]">Critical</Badge>
    case 'high':
      return <Badge variant="outline" className="border-orange-200 text-orange-600 text-[10px]">High</Badge>
    case 'medium':
      return <Badge variant="outline" className="border-blue-200 text-blue-600 text-[10px]">Medium</Badge>
    case 'low':
      return <Badge variant="outline" className="border-slate-200 text-slate-600 text-[10px]">Low</Badge>
  }
}

function ProjectCard({ project }: { project: DemoProject }) {
  return (
    <Link href={`/demo/projects/${project.id}`}>
      <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200 bg-white/80 backdrop-blur-md border-white/60 dark:bg-white/[0.08] dark:border-white/10">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="size-10 rounded-lg flex items-center justify-center text-white font-semibold shadow-sm"
                style={{ backgroundColor: project.color }}
              >
                {project.name.charAt(0)}
              </div>
              <div>
                <CardTitle className="text-base group-hover:text-cyan-600 transition-colors">
                  {project.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {project.description}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status & Priority */}
          <div className="flex items-center gap-2">
            {getStatusBadge(project.status)}
            {getPriorityBadge(project.priority)}
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-1.5" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{project.completedTasks} / {project.totalTasks} tasks</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            {/* Due date */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="size-3" />
              <span>
                {project.target_end_date
                  ? format(new Date(project.target_end_date), "MMM d")
                  : "No deadline"}
              </span>
            </div>

            {/* Team members */}
            <div className="flex items-center gap-1">
              <div className="flex -space-x-2">
                {project.members.slice(0, 3).map((member) => (
                  <Avatar key={member.id} className="size-6 border-2 border-white">
                    <AvatarFallback className="text-[8px] bg-slate-100">
                      {member.name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {project.members.length > 3 && (
                  <div className="size-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] text-muted-foreground">
                    +{project.members.length - 3}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
}: {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ElementType
  iconColor: string
}) {
  return (
    <Card className="bg-white/80 backdrop-blur-md border-white/60">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`size-9 rounded-lg flex items-center justify-center ${iconColor}`}>
            <Icon className="size-4 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DemoProjectsPage() {
  const { projects, stats, teamWorkload } = useDemoProjects()

  const activeProjects = projects.filter(p => p.status === 'active')
  const onHoldProjects = projects.filter(p => p.status === 'on_hold')
  const completedProjects = projects.filter(p => p.status === 'completed')

  return (
    <DemoProjectsLayout
      title="All Projects"
      actions={
        <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="mr-2 size-4" />
          New Project
        </Button>
      }
    >
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Active Projects"
          value={stats.active}
          subtitle={`${stats.onHold} on hold`}
          icon={FolderKanban}
          iconColor="bg-cyan-500"
        />
        <StatsCard
          title="Total Tasks"
          value={stats.totalTasks}
          subtitle={`${stats.completedTasks} completed`}
          icon={CheckCircle2}
          iconColor="bg-emerald-500"
        />
        <StatsCard
          title="Overdue Tasks"
          value={stats.overdueTasks}
          icon={AlertCircle}
          iconColor={stats.overdueTasks > 0 ? "bg-red-500" : "bg-slate-400"}
        />
        <StatsCard
          title="Team Members"
          value={teamWorkload.length}
          subtitle="working on tasks"
          icon={Users}
          iconColor="bg-blue-500"
        />
      </div>

      {/* Active Projects */}
      {activeProjects.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="size-4 text-emerald-500" />
            <h2 className="font-semibold">Active Projects</h2>
            <Badge variant="secondary" className="text-xs">{activeProjects.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}

      {/* On Hold Projects */}
      {onHoldProjects.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="size-4 text-amber-500" />
            <h2 className="font-semibold">On Hold</h2>
            <Badge variant="secondary" className="text-xs">{onHoldProjects.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {onHoldProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Projects */}
      {completedProjects.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="size-4 text-blue-500" />
            <h2 className="font-semibold">Completed</h2>
            <Badge variant="secondary" className="text-xs">{completedProjects.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}

      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderKanban className="size-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No projects yet</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Create your first project to get started
          </p>
          <Button className="mt-4 bg-cyan-600 hover:bg-cyan-700">
            <Plus className="mr-2 size-4" />
            Create Project
          </Button>
        </div>
      )}
    </DemoProjectsLayout>
  )
}
