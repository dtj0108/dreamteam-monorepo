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
  SlidersHorizontal,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { CompanySwitcher } from "@/components/company-switcher"
import { ProductSwitcher, useCurrentProduct } from "@/components/product-switcher"
import { GetStartedChecklist } from "@/components/onboarding/get-started-checklist"
import { getLearnHomeHref } from "@/components/learn"
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
      { title: "Notifications", url: "/customize/notifications" },
      { title: "Security", url: "/customize/security" },
      { title: "Billing", url: "/customize/billing" },
    ],
  },
]

// Sales navigation
const salesNav = [
  {
    title: "Inbox",
    url: "/sales/inbox",
    icon: Inbox,
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
    title: "Templates",
    url: "/sales/templates",
    icon: FileText,
    items: [
      { title: "Email", url: "/sales/templates?tab=email" },
      { title: "SMS", url: "/sales/templates?tab=sms" },
    ],
  },
  {
    title: "Conversations",
    url: "/sales/conversations",
    icon: MessageCircle,
  },
  {
    title: "Calls",
    url: "/sales/calls",
    icon: Phone,
    items: [
      { title: "All Calls", url: "/sales/calls" },
      { title: "Voicemail", url: "/sales/calls/voicemail" },
      { title: "Analytics", url: "/sales/calls/analytics" },
    ],
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
      { title: "Messaging", url: "/sales/settings/messaging" },
    ],
  },
  {
    title: "Customize",
    url: "/sales/customize",
    icon: SlidersHorizontal,
  },
]

// Team navigation
const teamNav = [
  {
    title: "Messages",
    url: "/team",
    icon: MessageSquare,
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
  },
  {
    title: "Favorites",
    url: "/knowledge/all?filter=favorites",
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
  },
  {
    title: "Autonomy",
    url: "/agents/autonomy",
    icon: Target,
  },
  {
    title: "My Agents",
    url: "/agents/hired",
    icon: Bot,
  },
  {
    title: "Configurations",
    url: "/agents/configurations",
    icon: Settings2,
  },
  {
    title: "Autonomous Actions",
    url: "/agents/schedules",
    icon: Calendar,
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
    title: "Discover",
    url: "/agents/discover",
    icon: Compass,
  },
]

// Learn navigation
const learnNav = [
  {
    title: "Overview",
    url: "/learn",
    icon: BookOpen,
  },
  {
    title: "Finance Guides",
    url: "/learn/getting-started",
    icon: DollarSign,
  },
  {
    title: "Sales Guides",
    url: "/learn/sales",
    icon: TrendingUp,
  },
  {
    title: "Team Guides",
    url: "/learn/team",
    icon: MessageSquare,
  },
  {
    title: "Projects Guides",
    url: "/learn/projects",
    icon: FolderKanban,
  },
  {
    title: "Knowledge Guides",
    url: "/learn/knowledge",
    icon: FileText,
  },
  {
    title: "Agents Guides",
    url: "/learn/agents",
    icon: Bot,
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

// Helper to check if a nav item is active based on current pathname
function isNavItemActive(url: string, pathname: string): boolean {
  // Exact match for root paths
  if (url === "/" && pathname === "/") return true
  if (url === "/") return false
  // Check if pathname matches or starts with the URL (for nested routes)
  return pathname === url || pathname.startsWith(url + "/")
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const currentProduct = useCurrentProduct()
  const pathname = usePathname()
  const learnHref = getLearnHomeHref(currentProduct)

  // Get navigation items based on current product, with dynamic isActive
  const navItems = React.useMemo(() => {
    let baseNav
    switch (currentProduct) {
      case "sales":
        baseNav = salesNav
        break
      case "team":
        baseNav = teamNav
        break
      case "projects":
        baseNav = projectsNav
        break
      case "knowledge":
        baseNav = knowledgeNav
        break
      case "agents":
        baseNav = agentsNav
        break
      default:
        baseNav = financeNav
    }

    // Calculate isActive dynamically based on current pathname
    return baseNav.map(item => ({
      ...item,
      isActive: isNavItemActive(item.url, pathname)
    }))
  }, [currentProduct, pathname])

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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Learning Center">
              <Link href={learnHref}>
                <BookOpen className="h-4 w-4" />
                <span>Learn</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
