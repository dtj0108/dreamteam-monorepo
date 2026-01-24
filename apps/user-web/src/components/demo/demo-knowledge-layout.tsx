"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronRight,
  FileText,
  Star,
  Search,
  Tag,
  PenTool,
  BookOpen,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { useDemoData, useDemoKnowledge } from "@/providers/demo-provider"
import type { DemoKnowledgePage } from "@/lib/demo-data"
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

interface BreadcrumbItemType {
  label: string
  href?: string
}

interface DemoKnowledgeLayoutProps {
  children: React.ReactNode
  breadcrumbs?: BreadcrumbItemType[]
  title?: string
  actions?: React.ReactNode
  noPadding?: boolean
}

function DemoKnowledgeSidebar() {
  const pathname = usePathname()
  const { user } = useDemoData()
  const { pages, folders, whiteboards, favoritePages } = useDemoKnowledge()

  const [favoritesOpen, setFavoritesOpen] = useState(true)
  const [categoriesOpen, setCategoriesOpen] = useState(true)
  const [whiteboardsOpen, setWhiteboardsOpen] = useState(true)
  const [pagesOpen, setPagesOpen] = useState(true)

  // Get root-level pages (no parent)
  const rootPages = pages.filter(p => !p.parentId)

  // Check if a page is active
  const isActive = (pageId: string) => pathname === `/demo/knowledge/${pageId}`

  // Get page count for a folder/category
  const getPageCount = (folderId: string) => {
    return pages.filter(p => p.folderId === folderId).length
  }

  return (
    <Sidebar collapsible="icon" className="!top-10 !bottom-0 !h-auto">
      <SidebarHeader>
        <DemoWorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Knowledge Base</SidebarGroupLabel>
          <SidebarMenu>
            {/* Search */}
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Search" asChild>
                <Link href="/demo/knowledge/search">
                  <Search className="size-4" />
                  <span>Search</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* All Pages */}
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="All Pages" asChild>
                <Link href="/demo/knowledge/all">
                  <FileText className="size-4" />
                  <span>All Pages</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Whiteboards */}
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Whiteboards" asChild>
                <Link href="/demo/knowledge/whiteboards">
                  <PenTool className="size-4" />
                  <span>Whiteboards</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Favorites Section */}
        {favoritePages.length > 0 && (
          <SidebarGroup>
            <Collapsible open={favoritesOpen} onOpenChange={setFavoritesOpen}>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="cursor-pointer hover:bg-accent rounded-md transition-colors">
                  <ChevronRight
                    className={cn(
                      "size-3.5 mr-1 transition-transform",
                      favoritesOpen && "rotate-90"
                    )}
                  />
                  <Star className="size-3.5 mr-1 text-yellow-500" />
                  Favorites
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenu>
                  {favoritePages.map((page) => (
                    <SidebarMenuItem key={page.id}>
                      <SidebarMenuButton tooltip={page.title} asChild>
                        <Link href={`/demo/knowledge/${page.id}`}>
                          <span className="text-base">{page.icon || "📄"}</span>
                          <span className="truncate">{page.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Categories Section */}
        <SidebarGroup>
          <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-accent rounded-md transition-colors">
                <ChevronRight
                  className={cn(
                    "size-3.5 mr-1 transition-transform",
                    categoriesOpen && "rotate-90"
                  )}
                />
                <Tag className="size-3.5 mr-1" />
                Categories
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenu>
                {folders.map((folder) => (
                  <SidebarMenuItem key={folder.id}>
                    <SidebarMenuButton tooltip={folder.name} asChild>
                      <Link href={`/demo/knowledge/all?category=${folder.id}`}>
                        <span
                          className="size-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: folder.color || "#6b7280" }}
                        />
                        <span className="truncate flex-1">{folder.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {getPageCount(folder.id)}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Whiteboards Section */}
        <SidebarGroup>
          <Collapsible open={whiteboardsOpen} onOpenChange={setWhiteboardsOpen}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-accent rounded-md transition-colors">
                <ChevronRight
                  className={cn(
                    "size-3.5 mr-1 transition-transform",
                    whiteboardsOpen && "rotate-90"
                  )}
                />
                <PenTool className="size-3.5 mr-1" />
                Whiteboards
                <span className="ml-auto text-xs text-muted-foreground">
                  {whiteboards.length}
                </span>
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenu>
                {whiteboards.length === 0 ? (
                  <div className="px-2 py-2 text-center text-sm text-muted-foreground">
                    No whiteboards yet.
                  </div>
                ) : (
                  whiteboards.map((whiteboard) => (
                    <SidebarMenuItem key={whiteboard.id}>
                      <SidebarMenuButton tooltip={whiteboard.title} asChild>
                        <Link href={`/demo/knowledge/whiteboards/${whiteboard.id}`}>
                          <span className="text-base">{whiteboard.icon}</span>
                          <span className="truncate">{whiteboard.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Pages Tree Section */}
        <SidebarGroup>
          <Collapsible open={pagesOpen} onOpenChange={setPagesOpen}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-accent rounded-md transition-colors">
                <ChevronRight
                  className={cn(
                    "size-3.5 mr-1 transition-transform",
                    pagesOpen && "rotate-90"
                  )}
                />
                <BookOpen className="size-3.5 mr-1" />
                Pages
                <span className="ml-auto text-xs text-muted-foreground">
                  {pages.length}
                </span>
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenu>
                {rootPages.length === 0 ? (
                  <div className="px-2 py-2 text-center text-sm text-muted-foreground">
                    No pages yet.
                  </div>
                ) : (
                  rootPages.map((page) => (
                    <PageTreeItem
                      key={page.id}
                      page={page}
                      pages={pages}
                      isActive={isActive}
                    />
                  ))
                )}
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
                    <AvatarFallback className="rounded-lg bg-purple-100 text-purple-600">
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
                      <AvatarFallback className="rounded-lg bg-purple-100 text-purple-600">
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

interface PageTreeItemProps {
  page: DemoKnowledgePage
  pages: DemoKnowledgePage[]
  isActive: (id: string) => boolean
  depth?: number
}

function PageTreeItem({ page, pages, isActive, depth = 0 }: PageTreeItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const childPages = pages.filter(p => p.parentId === page.id)
  const hasChildren = childPages.length > 0

  if (!hasChildren) {
    return (
      <SidebarMenuItem style={{ paddingLeft: depth * 12 }}>
        <SidebarMenuButton
          tooltip={page.title}
          asChild
          isActive={isActive(page.id)}
        >
          <Link href={`/demo/knowledge/${page.id}`}>
            <span className="text-base">{page.icon || "📄"}</span>
            <span className="truncate">{page.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
      <SidebarMenuItem style={{ paddingLeft: depth * 12 }}>
        <div className="flex items-center">
          <CollapsibleTrigger asChild>
            <button className="p-1 hover:bg-accent rounded cursor-pointer">
              <ChevronRight
                className={cn(
                  "size-3 transition-transform",
                  isOpen && "rotate-90"
                )}
              />
            </button>
          </CollapsibleTrigger>
          <SidebarMenuButton
            tooltip={page.title}
            asChild
            isActive={isActive(page.id)}
            className="flex-1"
          >
            <Link href={`/demo/knowledge/${page.id}`}>
              <span className="text-base">{page.icon || "📄"}</span>
              <span className="truncate">{page.title}</span>
            </Link>
          </SidebarMenuButton>
        </div>
        <CollapsibleContent>
          {childPages.map((child) => (
            <PageTreeItem
              key={child.id}
              page={child}
              pages={pages}
              isActive={isActive}
              depth={depth + 1}
            />
          ))}
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function DemoKnowledgeLayout({
  children,
  breadcrumbs = [],
  title,
  actions,
  noPadding = false,
}: DemoKnowledgeLayoutProps) {
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
      <DemoKnowledgeSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 flex-1">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/demo/knowledge">
                    Knowledge Demo
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
        <div className={cn(
          "flex flex-1 flex-col",
          noPadding ? "" : "gap-4 p-4 pt-0"
        )}>
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
