"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  Receipt,
  Target,
  BookOpen,
  CreditCard,
  ArrowDownCircle,
  ArrowUpCircle,
  Gauge,
  Settings2,
  Users,
  Briefcase,
  GitBranch,
  Calendar,
  Hash,
  MessageSquare,
  AtSign,
  Bell,
  Search,
  Inbox,
  CheckCircle,
  Clock,
  Contact,
  MessageCircle,
  BarChart3,
  FolderKanban,
  CheckSquare,
  GanttChart,
  Milestone,
  FileText,
  Star,
  LayoutTemplate,
  DollarSign,
  Phone,
  Bot,
  Compass,
  Activity,
  Package,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { CompanySwitcher } from "@/components/company-switcher"
import { ProductSwitcher, useCurrentProduct } from "@/components/product-switcher"
import { GetStartedChecklist } from "@/components/onboarding/get-started-checklist"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"

// Finance navigation
const financeNav = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    title: "Accounts",
    url: "/accounts",
    icon: Wallet,
    items: [
      { title: "All Accounts", url: "/accounts" },
      { title: "Add Account", url: "/accounts/new" },
    ],
  },
  {
    title: "Transactions",
    url: "/transactions",
    icon: Receipt,
    items: [
      { title: "All Transactions", url: "/transactions" },
      { title: "Add Transaction", url: "/transactions/new" },
      { title: "Import CSV", url: "/transactions/import" },
    ],
  },
  {
    title: "Subscriptions",
    url: "/subscriptions",
    icon: CreditCard,
  },
  {
    title: "Budgets",
    url: "/budgets",
    icon: Target,
  },
  {
    title: "Income",
    url: "/analytics/income",
    icon: ArrowUpCircle,
  },
  {
    title: "Expenses",
    url: "/analytics/expenses",
    icon: ArrowDownCircle,
  },
  {
    title: "KPIs",
    url: "/kpis",
    icon: Gauge,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: TrendingUp,
    items: [
      { title: "Overview", url: "/analytics" },
      { title: "Financial Calendar", url: "/analytics/calendar" },
      { title: "Profit & Loss", url: "/analytics/profit-loss" },
      { title: "Cash Flow", url: "/analytics/cash-flow" },
      { title: "Budget vs Actual", url: "/analytics/budget" },
      { title: "Custom Report", url: "/analytics/custom" },
    ],
  },
  {
    title: "Customize",
    url: "/customize",
    icon: Settings2,
    items: [
      { title: "General", url: "/customize" },
      { title: "Categories", url: "/customize/categories" },
      { title: "Recurring", url: "/customize/recurring" },
    ],
  },
]

// Sales navigation
const salesNav = [
  {
    title: "Inbox",
    url: "/sales/inbox",
    icon: Inbox,
    isActive: true,
  },
  {
    title: "Calendar",
    url: "/sales/calendar",
    icon: Calendar,
  },
  {
    title: "Opportunities",
    url: "/sales/opportunities",
    icon: TrendingUp,
  },
  {
    title: "Leads",
    url: "/sales/leads",
    icon: Users,
  },
  {
    title: "Contacts",
    url: "/sales/contacts",
    icon: Contact,
  },
  {
    title: "Workflows",
    url: "/sales/workflows",
    icon: GitBranch,
  },
  {
    title: "Conversations",
    url: "/sales/conversations",
    icon: MessageCircle,
  },
  {
    title: "Activities",
    url: "/sales/activities",
    icon: Calendar,
  },
  {
    title: "Reports",
    url: "/sales/reports",
    icon: BarChart3,
  },
  {
    title: "Add-ons",
    url: "/sales/add-ons",
    icon: Package,
  },
  {
    title: "Settings",
    url: "/sales/settings/phone-numbers",
    icon: Settings2,
    items: [
      { title: "Phone Numbers", url: "/sales/settings/phone-numbers" },
      { title: "Email & Calendar", url: "/sales/settings/email" },
    ],
  },
]

// Team navigation
const teamNav = [
  {
    title: "Messages",
    url: "/team",
    icon: MessageSquare,
    isActive: true,
  },
  {
    title: "Channels",
    url: "/team/channels",
    icon: Hash,
  },
  {
    title: "Direct Messages",
    url: "/team/dm",
    icon: AtSign,
  },
  {
    title: "Mentions",
    url: "/team/mentions",
    icon: Bell,
  },
  {
    title: "Search",
    url: "/team/search",
    icon: Search,
  },
]

// Projects navigation
const projectsNav = [
  {
    title: "Dashboard",
    url: "/projects/dashboard",
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    title: "All Projects",
    url: "/projects/all",
    icon: FolderKanban,
  },
  {
    title: "My Tasks",
    url: "/projects/my-tasks",
    icon: CheckSquare,
  },
  {
    title: "Timeline",
    url: "/projects/timeline",
    icon: GanttChart,
  },
  {
    title: "Milestones",
    url: "/projects/milestones",
    icon: Milestone,
  },
  {
    title: "Workload",
    url: "/projects/workload",
    icon: Users,
  },
  {
    title: "Reports",
    url: "/projects/reports",
    icon: BarChart3,
  },
]

// Knowledge navigation
const knowledgeNav = [
  {
    title: "All Pages",
    url: "/knowledge",
    icon: FileText,
    isActive: true,
  },
  {
    title: "Favorites",
    url: "/knowledge?filter=favorites",
    icon: Star,
  },
  {
    title: "Templates",
    url: "/knowledge/templates",
    icon: LayoutTemplate,
  },
  {
    title: "Search",
    url: "/knowledge/search",
    icon: Search,
  },
]

// Agents navigation
const agentsNav = [
  {
    title: "Dashboard",
    url: "/agents",
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    title: "Discover",
    url: "/agents/discover",
    icon: Compass,
  },
  {
    title: "My Agents",
    url: "/agents/hired",
    icon: Bot,
  },
  {
    title: "Activity",
    url: "/agents/activity",
    icon: Activity,
    items: [
      { title: "All Activity", url: "/agents/activity" },
      { title: "Pending Approvals", url: "/agents/activity/pending" },
    ],
  },
  {
    title: "Schedules",
    url: "/agents/schedules",
    icon: Calendar,
  },
  {
    title: "Configurations",
    url: "/agents/configurations",
    icon: Settings2,
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name: string
    email: string
    phone?: string
    companyName?: string | null
    avatar?: string
  }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const currentProduct = useCurrentProduct()

  // Get navigation items based on current product
  const navItems = React.useMemo(() => {
    switch (currentProduct) {
      case "sales":
        return salesNav
      case "team":
        return teamNav
      case "projects":
        return projectsNav
      case "knowledge":
        return knowledgeNav
      case "agents":
        return agentsNav
      default:
        return financeNav
    }
  }, [currentProduct])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <CompanySwitcher />
        <ProductSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {currentProduct === "finance" && <GetStartedChecklist />}
        <NavMain items={navItems} />
        {currentProduct === "finance" && <NavProjects />}
      </SidebarContent>
      <SidebarFooter>
        {(currentProduct === "finance" || currentProduct === "projects") && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Learning Center">
                <Link href={currentProduct === "projects" ? "/learn/projects" : "/learn"}>
                  <BookOpen className="h-4 w-4" />
                  <span>Learn</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
