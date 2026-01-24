"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { ChevronsUpDown, Check } from "lucide-react"

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

type DemoWorkspaceId = "finance" | "sales" | "team" | "projects" | "knowledge"

const demoWorkspaces: {
  id: DemoWorkspaceId
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
    href: "/demo",
    matchPaths: ["/demo", "/demo/accounts", "/demo/transactions", "/demo/subscriptions", "/demo/budgets", "/demo/analytics", "/demo/kpis", "/demo/goals"],
  },
  {
    id: "sales",
    name: "Sales",
    description: "Pipeline & customers",
    emoji: "🤝",
    href: "/demo/sales",
    matchPaths: ["/demo/sales"],
  },
  {
    id: "team",
    name: "Team",
    description: "Team communication",
    emoji: "💬",
    href: "/demo/team",
    matchPaths: ["/demo/team"],
  },
  {
    id: "projects",
    name: "Projects",
    description: "Project management",
    emoji: "📋",
    href: "/demo/projects",
    matchPaths: ["/demo/projects"],
  },
  {
    id: "knowledge",
    name: "Knowledge",
    description: "Docs & wiki",
    emoji: "📚",
    href: "/demo/knowledge",
    matchPaths: ["/demo/knowledge"],
  },
]

export function useCurrentDemoWorkspace(): DemoWorkspaceId {
  const pathname = usePathname()

  if (pathname.startsWith("/demo/sales")) return "sales"
  if (pathname.startsWith("/demo/team")) return "team"
  if (pathname.startsWith("/demo/projects")) return "projects"
  if (pathname.startsWith("/demo/knowledge")) return "knowledge"
  return "finance"
}

export function DemoWorkspaceSwitcher() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const currentWorkspaceId = useCurrentDemoWorkspace()

  const activeWorkspace = demoWorkspaces.find(w => w.id === currentWorkspaceId) || demoWorkspaces[0]

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
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
                  CloudSync Demo
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
              Demo Products
            </DropdownMenuLabel>
            {demoWorkspaces.map((workspace) => {
              const isActive = workspace.id === currentWorkspaceId

              return (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => router.push(workspace.href)}
                  className="gap-2 p-2 cursor-pointer"
                >
                  <div className="flex size-6 items-center justify-center rounded-md bg-muted text-base">
                    {workspace.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">
                      {workspace.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {workspace.description}
                    </div>
                  </div>
                  {isActive && <Check className="size-4 text-primary" />}
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Switch with ⌘1-5
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

