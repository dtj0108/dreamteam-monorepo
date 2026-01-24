"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronsUpDown, Check, Plus, Users } from "lucide-react"
import { useWorkspace, type Workspace } from "@/providers/workspace-provider"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

function getWorkspaceInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function WorkspaceAvatar({ workspace, size = "md" }: { workspace: Workspace; size?: "sm" | "md" }) {
  const sizeClasses = size === "sm" ? "size-6" : "size-8"

  return (
    <Avatar className={`${sizeClasses} rounded-lg`}>
      {workspace.avatarUrl && (
        <AvatarImage src={workspace.avatarUrl} alt={workspace.name} />
      )}
      <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-medium">
        {getWorkspaceInitials(workspace.name)}
      </AvatarFallback>
    </Avatar>
  )
}

export function CompanySwitcher() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { currentWorkspace, workspaces, isLoading, switchWorkspace } = useWorkspace()

  const handleSwitchWorkspace = async (workspaceId: string) => {
    try {
      await switchWorkspace(workspaceId)
    } catch (error) {
      console.error("Failed to switch workspace:", error)
    }
  }

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="pointer-events-none">
            <Skeleton className="size-8 rounded-lg" />
            <div className="grid flex-1 gap-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (!currentWorkspace) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            onClick={() => router.push("/workspaces/new")}
            className="cursor-pointer"
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10">
              <Plus className="size-4 text-primary" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Create Workspace</span>
              <span className="truncate text-xs text-muted-foreground">
                Get started
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <WorkspaceAvatar workspace={currentWorkspace} />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {currentWorkspace.name}
                </span>
                <span className="truncate text-xs text-muted-foreground capitalize">
                  {currentWorkspace.role}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Workspaces
            </DropdownMenuLabel>
            {workspaces.map((workspace) => {
              const isActive = workspace.id === currentWorkspace.id

              return (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => handleSwitchWorkspace(workspace.id)}
                  className="gap-2 p-2 cursor-pointer"
                >
                  <WorkspaceAvatar workspace={workspace} size="sm" />
                  <div className="flex-1">
                    <div className="font-medium">{workspace.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {workspace.role}
                    </div>
                  </div>
                  {isActive && <Check className="size-4 text-primary" />}
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/workspaces/new")}
              className="gap-2 p-2 cursor-pointer"
            >
              <div className="flex size-6 items-center justify-center rounded-md bg-muted">
                <Plus className="size-4" />
              </div>
              <div className="font-medium">Create workspace</div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/workspaces/join")}
              className="gap-2 p-2 cursor-pointer"
            >
              <div className="flex size-6 items-center justify-center rounded-md bg-muted">
                <Users className="size-4" />
              </div>
              <div className="font-medium">Join workspace</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
