"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { ProductSwitcher } from "./product-switcher"
import { FinanceSidebar } from "./finance-sidebar"
import { CRMSidebar } from "./crm-sidebar"
import { MessagingSidebar } from "./messaging-sidebar"
import { 
  SidebarProvider, 
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbList, 
  BreadcrumbPage 
} from "@/components/ui/breadcrumb"
import type { SessionUser } from "@/lib/session"

interface SuiteLayoutProps {
  children: React.ReactNode
  user: SessionUser
}

export function SuiteLayout({ children, user }: SuiteLayoutProps) {
  const pathname = usePathname()
  
  // Determine which sidebar to show based on route
  const currentProduct = React.useMemo(() => {
    if (pathname.startsWith("/crm")) return "crm"
    if (pathname.startsWith("/messaging")) return "messaging"
    return "finance"
  }, [pathname])

  // Get current page title for breadcrumb
  const pageTitle = React.useMemo(() => {
    const segments = pathname.split("/").filter(Boolean)
    if (segments.length === 0) return "Dashboard"
    const last = segments[segments.length - 1]
    return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ")
  }, [pathname])

  return (
    <SidebarProvider>
      {currentProduct === "finance" && <FinanceSidebar user={user} />}
      {currentProduct === "crm" && <CRMSidebar user={user} />}
      {currentProduct === "messaging" && <MessagingSidebar user={user} />}
      
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <ProductSwitcher />
          <Separator orientation="vertical" className="h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

