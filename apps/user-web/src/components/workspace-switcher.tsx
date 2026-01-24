"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { ChevronsUpDown, Check, Lock } from "lucide-react"
import { useUser, type ProductId } from "@/hooks/use-user"

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
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

const workspaces: {
  id: ProductId
  name: string
  description: string
  emoji: string
  href: string
  matchPaths: string[]
}[] = [
  {
    id: "finance",
    name: "Finance",
    description: "Financial management",
    emoji: "💰",
    href: "/finance",
    matchPaths: ["/finance", "/dashboard", "/accounts", "/transactions", "/subscriptions", "/budgets", "/analytics", "/kpis", "/goals"],
  },
  {
    id: "sales",
    name: "Sales",
    description: "Pipeline & customers",
    emoji: "🤝",
    href: "/sales",
    matchPaths: ["/sales"],
  },
  {
    id: "team",
    name: "Team",
    description: "Team communication",
    emoji: "💬",
    href: "/team",
    matchPaths: ["/team"],
  },
  {
    id: "projects",
    name: "Projects",
    description: "Project management",
    emoji: "📋",
    href: "/projects",
    matchPaths: ["/projects"],
  },
  {
    id: "knowledge",
    name: "Knowledge",
    description: "Documentation & SOPs",
    emoji: "📚",
    href: "/knowledge",
    matchPaths: ["/knowledge"],
  },
]

export type WorkspaceId = ProductId

export function useCurrentWorkspace(): WorkspaceId {
  const pathname = usePathname()

  if (pathname.startsWith("/sales")) return "sales"
  if (pathname.startsWith("/team")) return "team"
  if (pathname.startsWith("/projects") || pathname.startsWith("/learn/projects")) return "projects"
  if (pathname.startsWith("/knowledge")) return "knowledge"
  if (pathname.startsWith("/agents")) return "agents"
  return "finance"
}

export function WorkspaceSwitcher() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const currentWorkspaceId = useCurrentWorkspace()
  const { user } = useUser()
  const [showTutorial, setShowTutorial] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem("workspace-tutorial-dismissed")
    if (!dismissed) {
      const timer = setTimeout(() => setShowTutorial(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const dismissTutorial = () => {
    localStorage.setItem("workspace-tutorial-dismissed", "true")
    setShowTutorial(false)
  }

  // Get user's allowed products (default to all if not set)
  const allowedProducts = user?.allowedProducts || ["finance", "sales", "team", "projects", "knowledge"]

  // Filter workspaces based on user's access
  const accessibleWorkspaces = workspaces.filter(w => allowedProducts.includes(w.id))

  // If current workspace is not accessible, show the first accessible one
  const activeWorkspace = accessibleWorkspaces.find(w => w.id === currentWorkspaceId)
    || accessibleWorkspaces[0]
    || workspaces[0]

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Popover open={showTutorial}>
          <DropdownMenu>
            <PopoverAnchor asChild>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted text-lg">
                    {activeWorkspace.emoji}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {activeWorkspace.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.workspaceName || "dreamteam.ai"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
            </PopoverAnchor>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuItem
              onClick={() => router.push("/")}
              className="gap-2 p-2 cursor-pointer"
            >
              <div className="flex size-6 items-center justify-center rounded-md bg-muted text-base">
                🏠
              </div>
              <div className="flex-1">
                <div className="font-medium">Home</div>
                <div className="text-xs text-muted-foreground">Back to hub</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Products
            </DropdownMenuLabel>
            {workspaces.map((workspace) => {
              const isActive = workspace.id === currentWorkspaceId
              const hasAccess = allowedProducts.includes(workspace.id)

              return (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => hasAccess && router.push(workspace.href)}
                  className={`gap-2 p-2 ${hasAccess ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                  disabled={!hasAccess}
                >
                  <div className={`flex size-6 items-center justify-center rounded-md ${hasAccess ? "bg-muted" : "bg-muted"} text-base`}>
                    {hasAccess ? workspace.emoji : <Lock className="size-3 text-muted-foreground" />}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${!hasAccess && "text-muted-foreground"}`}>
                      {workspace.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {hasAccess ? workspace.description : "No access"}
                    </div>
                  </div>
                  {isActive && hasAccess && <Check className="size-4 text-primary" />}
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Switch with ⌘1-5
            </div>
          </DropdownMenuContent>
          </DropdownMenu>
          <PopoverContent side="right" align="start" className="w-64">
            <div className="space-y-3">
              <p className="font-medium">Switch Workspaces</p>
              <p className="text-sm text-muted-foreground">
                You can switch between Finance, Sales, Team, and other workspaces here.
              </p>
              <Button size="sm" onClick={dismissTutorial}>Got it</Button>
            </div>
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
