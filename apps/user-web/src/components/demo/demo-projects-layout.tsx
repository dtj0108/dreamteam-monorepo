"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useParams } from "next/navigation"
import {
  LayoutGrid,
  ListTodo,
  Columns3,
  List,
  CalendarDays,
  Milestone,
  BookOpen,
  Plus,
  ChevronDown,
  Sparkles,
  Settings,
  MoreHorizontal,
} from "lucide-react"

import { useDemoProjects, useDemoData } from "@/providers"
import { DemoWorkspaceSwitcher } from "./demo-workspace-switcher"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuBadge,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DemoProject } from "@/lib/demo-data"

interface BreadcrumbItemType {
  label: string
  href?: string
}

interface DemoProjectsLayoutProps {
  children: React.ReactNode
  breadcrumbs?: BreadcrumbItemType[]
  title?: string
  actions?: React.ReactNode
  currentProject?: DemoProject | null
}

// Project view tabs when viewing a specific project
const projectViewTabs = [
  { label: "Board", href: "", icon: Columns3 },
  { label: "List", href: "/list", icon: List },
  { label: "Timeline", href: "/timeline", icon: CalendarDays, disabled: true },
  { label: "Calendar", href: "/calendar", icon: CalendarDays, disabled: true },
  { label: "Milestones", href: "/milestones", icon: Milestone, disabled: true },
  { label: "Docs", href: "/docs", icon: BookOpen, disabled: true },
]

function DemoProjectsSidebar() {
  const pathname = usePathname()
  const { user } = useDemoData()
  const { projects, stats } = useDemoProjects()
  const [projectsOpen, setProjectsOpen] = React.useState(true)

  // Check if we're on the all projects or my tasks page
  const isAllProjects = pathname === "/demo/projects"
  const isMyTasks = pathname === "/demo/projects/my-tasks"

  // Extract project ID from pathname if viewing a specific project
  const projectIdMatch = pathname.match(/\/demo\/projects\/([^/]+)/)
  const currentProjectId = projectIdMatch && !["my-tasks"].includes(projectIdMatch[1])
    ? projectIdMatch[1]
    : null

  return (
    <Sidebar collapsible="icon" className="!top-10 !bottom-0 !h-auto">
      <SidebarHeader>
        <DemoWorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="All Projects"
                asChild
                isActive={isAllProjects}
              >
                <Link href="/demo/projects">
                  <LayoutGrid className="size-4" />
                  <span>All Projects</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="My Tasks"
                asChild
                isActive={isMyTasks}
              >
                <Link href="/demo/projects/my-tasks">
                  <ListTodo className="size-4" />
                  <span>My Tasks</span>
                  {stats.overdueTasks > 0 && (
                    <SidebarMenuBadge className="bg-red-100 text-red-600 text-[10px]">
                      {stats.overdueTasks}
                    </SidebarMenuBadge>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Projects List */}
        <SidebarGroup>
          <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen}>
            <div className="flex items-center justify-between px-2 py-1.5">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  {projectsOpen ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronDown className="size-3.5 -rotate-90" />
                  )}
                  Projects
                </button>
              </CollapsibleTrigger>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Plus className="size-4" />
              </button>
            </div>
            <CollapsibleContent>
              <SidebarMenu>
                {projects.map((project) => {
                  const isActive = currentProjectId === project.id
                  return (
                    <SidebarMenuItem key={project.id}>
                      <SidebarMenuButton
                        tooltip={project.name}
                        asChild
                        isActive={isActive}
                      >
                        <Link href={`/demo/projects/${project.id}`}>
                          <div
                            className="size-3 rounded-full shrink-0"
                            style={{ backgroundColor: project.color }}
                          />
                          <span className="truncate">{project.name}</span>
                          <SidebarMenuBadge
                            className={cn(
                              "text-[10px]",
                              project.status === "on_hold" && "bg-amber-100 text-amber-600",
                              project.status === "completed" && "bg-emerald-100 text-emerald-600",
                            )}
                          >
                            {project.progress}%
                          </SidebarMenuBadge>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Stats Summary */}
        <SidebarGroup>
          <SidebarGroupLabel>Quick Stats</SidebarGroupLabel>
          <div className="px-2 py-2 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Active Projects</span>
              <Badge variant="secondary" className="text-[10px]">{stats.active}</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total Tasks</span>
              <Badge variant="secondary" className="text-[10px]">{stats.totalTasks}</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Completed</span>
              <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-600">{stats.completedTasks}</Badge>
            </div>
          </div>
        </SidebarGroup>

        {/* AI Agents Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-cyan-500" />
            <span>Agents</span>
            <Badge variant="outline" className="ml-auto text-[10px] bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-600 border-cyan-200">
              Soon
            </Badge>
          </SidebarGroupLabel>
          <div className="px-2 py-2">
            <p className="text-xs text-muted-foreground">
              AI agents that auto-assign tasks and balance workload.
            </p>
          </div>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-cyan-100 text-cyan-600">
                      {user.name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-cyan-100 text-cyan-600">
                        {user.name.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user.name}</span>
                      <span className="truncate text-xs">{user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/signup">Start Free Trial</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/">Exit Demo</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

// Project header with tabs for specific project views
function ProjectHeader({ project }: { project: DemoProject }) {
  const pathname = usePathname()
  const baseUrl = `/demo/projects/${project.id}`

  // Determine active tab
  const getActiveTab = () => {
    if (pathname.endsWith('/list')) return 'List'
    if (pathname.endsWith('/timeline')) return 'Timeline'
    if (pathname.endsWith('/calendar')) return 'Calendar'
    if (pathname.endsWith('/milestones')) return 'Milestones'
    if (pathname.endsWith('/docs')) return 'Docs'
    return 'Board'
  }

  const activeTab = getActiveTab()

  const getStatusBadge = (status: DemoProject['status']) => {
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

  const getPriorityBadge = (priority: DemoProject['priority']) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="outline" className="border-red-200 text-red-600">Critical</Badge>
      case 'high':
        return <Badge variant="outline" className="border-orange-200 text-orange-600">High</Badge>
      case 'medium':
        return <Badge variant="outline" className="border-blue-200 text-blue-600">Medium</Badge>
      case 'low':
        return <Badge variant="outline" className="border-slate-200 text-slate-600">Low</Badge>
    }
  }

  return (
    <div className="border-b bg-white/80 backdrop-blur-md">
      {/* Project Info Row */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div
            className="size-10 rounded-lg flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: project.color }}
          >
            {project.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{project.name}</h1>
              {getStatusBadge(project.status)}
              {getPriorityBadge(project.priority)}
            </div>
            <p className="text-sm text-muted-foreground">{project.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {project.members.slice(0, 4).map((member) => (
              <Avatar key={member.id} className="size-8 border-2 border-white">
                <AvatarFallback className="text-xs bg-slate-100">
                  {member.name.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            ))}
            {project.members.length > 4 && (
              <div className="size-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs text-muted-foreground">
                +{project.members.length - 4}
              </div>
            )}
          </div>
          <Button variant="outline" size="sm">
            <Plus className="size-4 mr-1" />
            Invite
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="size-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="size-4" />
          </Button>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-1 px-6">
        {projectViewTabs.map((tab) => {
          const isActive = activeTab === tab.label
          const TabIcon = tab.icon
          return (
            <Link
              key={tab.label}
              href={tab.disabled ? '#' : `${baseUrl}${tab.href}`}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
                isActive
                  ? "bg-white border-t border-l border-r text-foreground -mb-px"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-50",
                tab.disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={(e) => tab.disabled && e.preventDefault()}
            >
              <TabIcon className="size-4" />
              {tab.label}
              {tab.disabled && (
                <Badge variant="outline" className="text-[10px] ml-1">Soon</Badge>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function DemoProjectsLayout({
  children,
  breadcrumbs = [],
  title,
  actions,
  currentProject,
}: DemoProjectsLayoutProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex min-h-screen">
        <div className="w-64 bg-sidebar" />
        <div className="flex-1 p-4">{children}</div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <DemoProjectsSidebar />
      <SidebarInset>
        {/* Show project header when viewing a specific project */}
        {currentProject ? (
          <>
            <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-10">
              <div className="flex items-center gap-2 px-4 flex-1">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="/demo/projects">
                        Projects
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{currentProject.name}</BreadcrumbPage>
                    </BreadcrumbItem>
                    {breadcrumbs.map((item, index) => (
                      <React.Fragment key={index}>
                        <BreadcrumbSeparator className="hidden md:block" />
                        <BreadcrumbItem>
                          {item.href ? (
                            <BreadcrumbLink href={item.href}>
                              {item.label}
                            </BreadcrumbLink>
                          ) : (
                            <BreadcrumbPage>{item.label}</BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                      </React.Fragment>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
            <ProjectHeader project={currentProject} />
            <div className="flex flex-1 flex-col p-4 bg-slate-50/50">
              {children}
            </div>
          </>
        ) : (
          <>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4 flex-1">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="/demo/projects">
                        Projects
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {breadcrumbs.map((item, index) => (
                      <React.Fragment key={index}>
                        <BreadcrumbSeparator className="hidden md:block" />
                        <BreadcrumbItem>
                          {item.href ? (
                            <BreadcrumbLink href={item.href}>
                              {item.label}
                            </BreadcrumbLink>
                          ) : (
                            <BreadcrumbPage>{item.label}</BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                      </React.Fragment>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
                {actions && (
                  <div className="ml-auto flex items-center gap-2">
                    {actions}
                  </div>
                )}
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
              {title && (
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                </div>
              )}
              {children}
            </div>
          </>
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}
