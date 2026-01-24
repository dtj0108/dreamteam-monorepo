"use client"

import { useState } from "react"
import Link from "next/link"
import { useProjects, type Project, type ProjectStatus, type Department } from "@/providers/projects-provider"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  Plus,
  Search,
  Grid3X3,
  List,
  MoreHorizontal,
  Calendar,
  Users,
  FolderKanban,
  Loader2,
  Archive,
  Trash2,
  Edit,
  Settings,
  Building2,
  Briefcase,
  Folder,
  Target,
  Lightbulb,
  Rocket,
  Shield,
  GripVertical,
} from "lucide-react"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { DepartmentManager } from "@/components/projects/department-manager"
import { ProjectsPageSkeleton } from "@/components/projects/skeletons"

const departmentIconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  "building-2": Building2,
  "briefcase": Briefcase,
  "users": Users,
  "folder": Folder,
  "target": Target,
  "lightbulb": Lightbulb,
  "rocket": Rocket,
  "shield": Shield,
}

function DepartmentIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const Icon = departmentIconMap[name] || Building2
  return <Icon className={className} style={style} />
}

const statusColors: Record<ProjectStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  on_hold: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  completed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  archived: "bg-gray-500/10 text-gray-600 border-gray-500/20",
}

const priorityColors = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
}

function ProjectCard({ project, onArchive, onDelete, dragHandleProps }: {
  project: Project
  onArchive: () => void
  onDelete: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
}) {
  const memberAvatars = project.project_members?.slice(0, 4) || []
  const remainingMembers = (project.project_members?.length || 0) - 4

  return (
    <Card className="group hover:shadow-md transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {dragHandleProps && (
              <button
                {...dragHandleProps}
                className="cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity touch-none"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: project.color + "20" }}
            >
              <FolderKanban className="w-5 h-5" style={{ color: project.color }} />
            </div>
            <div>
              <CardTitle className="text-base">
                <Link
                  href={`/projects/${project.id}`}
                  className="hover:underline"
                >
                  {project.name}
                </Link>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {project.totalTasks || 0} tasks
              </CardDescription>
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
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.id}/settings`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Project
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
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
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={statusColors[project.status]}>
            {project.status.replace("_", " ")}
          </Badge>
          <Badge variant="secondary" className={priorityColors[project.priority]}>
            {project.priority}
          </Badge>
          {project.department && (
            <Badge
              variant="outline"
              className="gap-1"
              style={{
                borderColor: project.department.color + "40",
                backgroundColor: project.department.color + "10",
                color: project.department.color,
              }}
            >
              <DepartmentIcon name={project.department.icon} className="w-3 h-3" />
              {project.department.name}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{project.progress || 0}%</span>
          </div>
          <Progress value={project.progress || 0} className="h-2" />
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
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

          {project.target_end_date && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(project.target_end_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ProjectListRow({ project, onArchive, onDelete, dragHandleProps }: {
  project: Project
  onArchive: () => void
  onDelete: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
}) {
  const memberAvatars = project.project_members?.slice(0, 3) || []

  return (
    <div className="group flex items-center gap-4 p-4 border-b hover:bg-muted/50 transition-colors">
      {dragHandleProps && (
        <button
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover:opacity-100 transition-opacity touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: project.color + "20" }}
      >
        <FolderKanban className="w-5 h-5" style={{ color: project.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <Link
          href={`/projects/${project.id}`}
          className="font-medium hover:underline"
        >
          {project.name}
        </Link>
        {project.description && (
          <p className="text-sm text-muted-foreground truncate">
            {project.description}
          </p>
        )}
      </div>

      <Badge variant="outline" className={statusColors[project.status]}>
        {project.status.replace("_", " ")}
      </Badge>

      <div className="w-32 flex items-center gap-2">
        <Progress value={project.progress || 0} className="h-2 flex-1" />
        <span className="text-xs font-medium w-8">{project.progress || 0}%</span>
      </div>

      <div className="flex -space-x-2 w-20">
        {memberAvatars.map((member) => (
          <Avatar key={member.id} className="w-6 h-6 border-2 border-background">
            <AvatarImage src={member.user?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {member.user?.name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>

      <div className="text-sm text-muted-foreground w-24 text-right">
        {project.target_end_date
          ? new Date(project.target_end_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : "No date"
        }
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
          <DropdownMenuItem asChild>
            <Link href={`/projects/${project.id}/settings`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onArchive}>
            <Archive className="mr-2 h-4 w-4" />
            Archive
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
  )
}

// Sortable wrapper for ProjectCard (grid view)
function SortableProjectCard({ project, onArchive, onDelete }: {
  project: Project
  onArchive: () => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <ProjectCard
        project={project}
        onArchive={onArchive}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

// Sortable wrapper for ProjectListRow (list view)
function SortableProjectListRow({ project, onArchive, onDelete }: {
  project: Project
  onArchive: () => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative" as const,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <ProjectListRow
        project={project}
        onArchive={onArchive}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

export default function ProjectsAllPage() {
  const { projects, departments, loading, updateProject, deleteProject, reorderProjects } = useProjects()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDepartmentManager, setShowDepartmentManager] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.description?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || project.status === statusFilter
    const matchesDepartment = departmentFilter === "all" ||
      (departmentFilter === "none" ? !project.department_id : project.department_id === departmentFilter)
    return matchesSearch && matchesStatus && matchesDepartment
  })

  const handleArchive = async (project: Project) => {
    await updateProject(project.id, { status: "archived" })
  }

  const handleDelete = async (project: Project) => {
    if (confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      await deleteProject(project.id)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      const oldIndex = filteredProjects.findIndex(p => p.id === active.id)
      const newIndex = filteredProjects.findIndex(p => p.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(filteredProjects, oldIndex, newIndex)
        await reorderProjects(newOrder.map(p => p.id))
      }
    }
  }

  const activeProject = activeId ? filteredProjects.find(p => p.id === activeId) : null

  // Only show skeleton on first load (no cached data)
  // If we have cached projects, render them instantly while refreshing in background
  if (loading && projects.length === 0) {
    return <ProjectsPageSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage and track your team&apos;s projects
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Department Tabs */}
      {departments.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setDepartmentFilter("all")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              departmentFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            All Departments
          </button>
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => setDepartmentFilter(dept.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                departmentFilter === dept.id
                  ? "text-white"
                  : "bg-muted hover:bg-muted/80"
              }`}
              style={{
                backgroundColor: departmentFilter === dept.id ? dept.color : undefined,
                color: departmentFilter === dept.id ? "white" : undefined,
              }}
            >
              <DepartmentIcon name={dept.icon} className="w-3.5 h-3.5" />
              {dept.name}
              <span className="text-xs opacity-70">
                ({projects.filter(p => p.department_id === dept.id).length})
              </span>
            </button>
          ))}
          <button
            onClick={() => setDepartmentFilter("none")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              departmentFilter === "none"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            Uncategorized
            <span className="ml-1 text-xs opacity-70">
              ({projects.filter(p => !p.department_id).length})
            </span>
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 ml-1"
            onClick={() => setShowDepartmentManager(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      )}

      {departments.length === 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDepartmentManager(true)}
          className="self-start"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Departments
        </Button>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="on_hold">On Hold</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center border rounded-lg">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="rounded-r-none"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="rounded-l-none"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      {projects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FolderKanban className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{projects.length}</p>
                <p className="text-sm text-muted-foreground">Total Projects</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <FolderKanban className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {projects.filter(p => p.status === "active").length}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {projects.reduce((sum, p) => sum + (p.totalTasks || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {new Set(projects.flatMap(p => p.project_members?.map(m => m.user?.id) || [])).size}
                </p>
                <p className="text-sm text-muted-foreground">Team Members</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Projects Grid/List */}
      {filteredProjects.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No projects found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {projects.length === 0
                ? "Get started by creating your first project."
                : "Try adjusting your search or filters."
              }
            </p>
            {projects.length === 0 && (
              <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredProjects.map(p => p.id)}
            strategy={viewMode === "grid" ? rectSortingStrategy : verticalListSortingStrategy}
          >
            {viewMode === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
                  <SortableProjectCard
                    key={project.id}
                    project={project}
                    onArchive={() => handleArchive(project)}
                    onDelete={() => handleDelete(project)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <div className="divide-y">
                  <div className="flex items-center gap-4 p-4 text-sm font-medium text-muted-foreground bg-muted/50">
                    <div className="w-8" />
                    <div className="w-10" />
                    <div className="flex-1">Project</div>
                    <div className="w-24">Status</div>
                    <div className="w-32">Progress</div>
                    <div className="w-20">Team</div>
                    <div className="w-24 text-right">Due Date</div>
                    <div className="w-8" />
                  </div>
                  {filteredProjects.map((project) => (
                    <SortableProjectListRow
                      key={project.id}
                      project={project}
                      onArchive={() => handleArchive(project)}
                      onDelete={() => handleDelete(project)}
                    />
                  ))}
                </div>
              </Card>
            )}
          </SortableContext>

          {/* Drag Overlay - shows the item being dragged */}
          <DragOverlay>
            {activeProject ? (
              viewMode === "grid" ? (
                <div className="opacity-80">
                  <ProjectCard
                    project={activeProject}
                    onArchive={() => {}}
                    onDelete={() => {}}
                  />
                </div>
              ) : (
                <div className="opacity-80 bg-background border rounded-lg">
                  <ProjectListRow
                    project={activeProject}
                    onArchive={() => {}}
                    onDelete={() => {}}
                  />
                </div>
              )
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {/* Department Manager Dialog */}
      <DepartmentManager
        open={showDepartmentManager}
        onOpenChange={setShowDepartmentManager}
      />
    </div>
  )
}
