"use client"

import * as React from "react"
import Link from "next/link"
import {
  Hash,
  MessageSquare,
  Users,
  AtSign,
  Search,
  ChevronDown,
  Plus,
  Lock,
} from "lucide-react"

import { useDemoTeam, useDemoData } from "@/providers"
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
import { cn } from "@/lib/utils"

interface BreadcrumbItemType {
  label: string
  href?: string
}

interface DemoTeamLayoutProps {
  children: React.ReactNode
  breadcrumbs?: BreadcrumbItemType[]
  title?: string
  actions?: React.ReactNode
}

function DemoTeamSidebar() {
  const { user } = useDemoData()
  const { channels, dmConversations, unreadCount } = useDemoTeam()
  const [channelsOpen, setChannelsOpen] = React.useState(true)
  const [dmsOpen, setDmsOpen] = React.useState(true)

  return (
    <Sidebar collapsible="icon" className="!top-10 !bottom-0 !h-auto">
      <SidebarHeader>
        <DemoWorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {/* Quick Actions */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Search" asChild>
                <Link href="/demo/team/search">
                  <Search className="size-4" />
                  <span>Search</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Mentions" asChild>
                <Link href="/demo/team/mentions">
                  <AtSign className="size-4" />
                  <span>Mentions</span>
                  {unreadCount.total > 0 && (
                    <SidebarMenuBadge>{unreadCount.total}</SidebarMenuBadge>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Channels */}
        <SidebarGroup>
          <Collapsible open={channelsOpen} onOpenChange={setChannelsOpen}>
            <div className="flex items-center justify-between px-2 py-1.5">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  {channelsOpen ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronDown className="size-3.5 -rotate-90" />
                  )}
                  Channels
                </button>
              </CollapsibleTrigger>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Plus className="size-4" />
              </button>
            </div>
            <CollapsibleContent>
              <SidebarMenu>
                {channels.map((channel) => (
                  <SidebarMenuItem key={channel.id}>
                    <SidebarMenuButton tooltip={channel.name} asChild>
                      <Link href={`/demo/team/channels?id=${channel.id}`}>
                        {channel.isPrivate ? (
                          <Lock className="size-4 text-muted-foreground" />
                        ) : (
                          <Hash className="size-4 text-muted-foreground" />
                        )}
                        <span className={cn(channel.unreadCount > 0 && "font-semibold")}>
                          {channel.name}
                        </span>
                        {channel.unreadCount > 0 && (
                          <SidebarMenuBadge>{channel.unreadCount}</SidebarMenuBadge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Direct Messages */}
        <SidebarGroup>
          <Collapsible open={dmsOpen} onOpenChange={setDmsOpen}>
            <div className="flex items-center justify-between px-2 py-1.5">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  {dmsOpen ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronDown className="size-3.5 -rotate-90" />
                  )}
                  Direct Messages
                </button>
              </CollapsibleTrigger>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Plus className="size-4" />
              </button>
            </div>
            <CollapsibleContent>
              <SidebarMenu>
                {dmConversations.map((dm) => (
                  <SidebarMenuItem key={dm.id}>
                    <SidebarMenuButton tooltip={dm.participantName} asChild>
                      <Link href={`/demo/team/dm?id=${dm.id}`}>
                        <div className="relative">
                          <Avatar className="size-5">
                            <AvatarFallback className="text-[10px]">
                              {dm.participantName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          {dm.participantStatus === "online" && (
                            <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-1 ring-background" />
                          )}
                        </div>
                        <span className={cn(dm.unreadCount > 0 && "font-semibold")}>
                          {dm.participantName}
                        </span>
                        {dm.unreadCount > 0 && (
                          <SidebarMenuBadge>{dm.unreadCount}</SidebarMenuBadge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </CollapsibleContent>
          </Collapsible>
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
                    <AvatarFallback className="rounded-lg bg-orange-100 text-orange-600">
                      {user.name.split(' ').map(n => n[0]).join('')}
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
                      <AvatarFallback className="rounded-lg bg-orange-100 text-orange-600">
                        {user.name.split(' ').map(n => n[0]).join('')}
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

export function DemoTeamLayout({ 
  children, 
  breadcrumbs = [],
  title,
  actions,
}: DemoTeamLayoutProps) {
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
      <DemoTeamSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 flex-1">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/demo/team">
                    Team Demo
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
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 min-h-0">
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

