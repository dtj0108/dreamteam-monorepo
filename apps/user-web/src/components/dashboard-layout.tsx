"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { WorkspaceHeader } from "@/components/workspace-header"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useUser } from "@/hooks/use-user"

interface DashboardLayoutProps {
  children: React.ReactNode
  breadcrumbs?: { label: string; href?: string }[] // kept for backwards compatibility
  title?: string
  actions?: React.ReactNode
  noPadding?: boolean
  defaultCollapsed?: boolean
}

export function DashboardLayout({
  children,
  title,
  actions,
  noPadding = false,
  defaultCollapsed = false,
}: DashboardLayoutProps) {
  const { user } = useUser()

  // Default user for when still loading or no user - sidebar renders immediately
  const displayUser = user || {
    name: "",
    email: "",
    phone: "",
  }

  return (
    <SidebarProvider defaultOpen={!defaultCollapsed}>
      <AppSidebar user={displayUser} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 relative z-10">
          <div className="flex items-center gap-2 px-4 flex-1">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <WorkspaceHeader actions={actions} />
          </div>
        </header>
        <div className={noPadding ? "flex-1 flex flex-col min-h-0 overflow-hidden" : "flex flex-1 flex-col min-h-0 gap-4 p-4 pt-0 overflow-y-auto"}>
          {title && (
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            </div>
          )}
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
