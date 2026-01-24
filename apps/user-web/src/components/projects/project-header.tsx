"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type Project, type ProjectStatus, useProjects } from "@/providers/projects-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FolderKanban,
  MoreHorizontal,
  Plus,
  Settings,
  Users,
  Archive,
  Trash2,
  Calendar,
  LayoutGrid,
  List,
  GanttChart,
  CalendarDays,
  Milestone,
  BookOpen,
  Bot,
} from "lucide-react"
import { GenerateInstructionsDialog } from "./generate-instructions-dialog"
import { usePathname } from "next/navigation"

const statusColors: Record<ProjectStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  on_hold: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  completed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  archived: "bg-gray-500/10 text-gray-600 border-gray-500/20",
}

interface ProjectHeaderProps {
  project: Project
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { updateProject, deleteProject } = useProjects()
  const [showInstructionsDialog, setShowInstructionsDialog] = useState(false)
  const memberAvatars = project.project_members?.slice(0, 5) || []
  const remainingMembers = (project.project_members?.length || 0) - 5

  // Determine current view from pathname
  const getActiveView = () => {
    if (pathname.includes("/list")) return "list"
    if (pathname.includes("/timeline")) return "timeline"
    if (pathname.includes("/calendar")) return "calendar"
    if (pathname.includes("/milestones")) return "milestones"
    if (pathname.includes("/knowledge")) return "knowledge"
    return "board"
  }

  const handleViewChange = (view: string) => {
    if (view === "board") {
      router.push(`/projects/${project.id}`)
    } else {
      router.push(`/projects/${project.id}/${view}`)
    }
  }

  const handleArchive = async () => {
    await updateProject(project.id, { status: "archived" })
  }

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      await deleteProject(project.id)
      router.push("/projects")
    }
  }

  return (
    <div className="space-y-4">
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: project.color + "20" }}
          >
            <FolderKanban className="w-6 h-6" style={{ color: project.color }} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge variant="outline" className={statusColors[project.status]}>
                {project.status.replace("_", " ")}
              </Badge>
            </div>
            {project.description && (
              <p className="text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${project.id}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleArchive}>
                <Archive className="mr-2 h-4 w-4" />
                Archive Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {memberAvatars.map((member) => (
              <Avatar key={member.id} className="w-7 h-7 border-2 border-background">
                <AvatarImage src={member.user?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {member.user?.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
            ))}
            {remainingMembers > 0 && (
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                +{remainingMembers}
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-7">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Invite
          </Button>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {project.target_end_date ? (
            <span>
              Due {new Date(project.target_end_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          ) : (
            <span>No due date</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">Progress</span>
          <Progress value={project.progress || 0} className="w-32 h-2" />
          <span className="font-medium">{project.progress || 0}%</span>
        </div>

        <div className="text-muted-foreground">
          {project.completedTasks || 0} / {project.totalTasks || 0} tasks completed
        </div>
      </div>

      {/* Views tabs */}
      <div className="flex items-center gap-2">
        <Tabs value={getActiveView()} onValueChange={handleViewChange}>
          <TabsList>
            <TabsTrigger value="board" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Board
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              List
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <GanttChart className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="milestones" className="gap-2">
              <Milestone className="h-4 w-4" />
              Milestones
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Knowledge
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInstructionsDialog(true)}
          className="gap-2"
        >
          <Bot className="h-4 w-4" />
          Claude Instructions
        </Button>
      </div>

      <GenerateInstructionsDialog
        projectId={project.id}
        projectName={project.name}
        open={showInstructionsDialog}
        onOpenChange={setShowInstructionsDialog}
      />
    </div>
  )
}

