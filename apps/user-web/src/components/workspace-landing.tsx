"use client"

import { FeatureCard } from "@/components/home/feature-card"
import { type WorkspaceId } from "@/components/workspace-switcher"

interface QuickLink {
  emoji: string
  label: string
  description: string
  href: string
}

const workspaceConfig: Record<WorkspaceId, {
  name: string
  emoji: string
  description: string
  quickLinks: QuickLink[]
}> = {
  finance: {
    name: "Finance",
    emoji: "💰",
    description: "Track accounts, manage transactions, set budgets",
    quickLinks: [
      { emoji: "💳", label: "View Accounts", description: "Manage all your accounts", href: "/accounts" },
      { emoji: "💰", label: "Transactions", description: "View and add transactions", href: "/transactions" },
      { emoji: "📊", label: "Budgets", description: "Track spending by category", href: "/budgets" },
      { emoji: "📈", label: "Analytics", description: "Financial reports and insights", href: "/analytics" },
    ],
  },
  sales: {
    name: "Sales",
    emoji: "🤝",
    description: "Manage leads, track deals, automate workflows",
    quickLinks: [
      { emoji: "🎯", label: "Opportunities", description: "Track deals through stages", href: "/sales/opportunities" },
      { emoji: "👤", label: "Add Lead", description: "Capture new opportunities", href: "/sales/leads" },
      { emoji: "👥", label: "Contacts", description: "Manage relationships", href: "/sales/contacts" },
    ],
  },
  team: {
    name: "Team",
    emoji: "💬",
    description: "Chat with your team and collaborate",
    quickLinks: [
      { emoji: "💬", label: "Messages", description: "Chat with your team", href: "/team/messages" },
      { emoji: "#️⃣", label: "Channels", description: "Browse team channels", href: "/team/channels" },
      { emoji: "✉️", label: "Direct Messages", description: "Private conversations", href: "/team/dm" },
    ],
  },
  projects: {
    name: "Projects",
    emoji: "📋",
    description: "Organize tasks and track milestones",
    quickLinks: [
      { emoji: "📁", label: "Projects", description: "View all projects", href: "/projects/all" },
      { emoji: "✅", label: "Tasks", description: "Create and manage tasks", href: "/projects/my-tasks" },
      { emoji: "📅", label: "Timeline", description: "See project schedule", href: "/projects/timeline" },
      { emoji: "🚩", label: "Milestones", description: "Track key deliverables", href: "/projects/milestones" },
    ],
  },
  knowledge: {
    name: "Knowledge",
    emoji: "📚",
    description: "Build your knowledge base with docs and templates",
    quickLinks: [
      { emoji: "📄", label: "Pages", description: "Browse all documents", href: "/knowledge/all" },
      { emoji: "➕", label: "New Document", description: "Create a page", href: "/knowledge/new" },
      { emoji: "🎨", label: "New Whiteboard", description: "Create a whiteboard", href: "/knowledge/whiteboards/new" },
      { emoji: "📋", label: "Templates", description: "Start from a template", href: "/knowledge/templates" },
      { emoji: "🔍", label: "Search", description: "Find anything", href: "/knowledge/search" },
    ],
  },
  agents: {
    name: "Agents",
    emoji: "🤖",
    description: "Discover and use AI agents to automate your work",
    quickLinks: [
      { emoji: "🔍", label: "Browse Agents", description: "Discover available agents", href: "/agents" },
      { emoji: "💬", label: "My Agents", description: "Chat with your hired agents", href: "/agents" },
      { emoji: "📊", label: "Activity", description: "View agent activity", href: "/agents/activity" },
      { emoji: "📅", label: "Schedules", description: "Manage scheduled tasks", href: "/agents/schedules" },
    ],
  },
}

interface WorkspaceLandingProps {
  workspace: WorkspaceId
}

export function WorkspaceLanding({ workspace }: WorkspaceLandingProps) {
  const config = workspaceConfig[workspace]

  return (
    <div className="space-y-6 pl-4">
      {/* Workspace Title */}
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-lg bg-muted flex items-center justify-center">
          <span className="text-2xl">{config.emoji}</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{config.name}</h1>
          <p className="text-muted-foreground">{config.description}</p>
        </div>
      </div>

      {/* Quick Links Grid */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {config.quickLinks.map((link) => (
          <FeatureCard
            key={link.href + link.label}
            emoji={link.emoji}
            title={link.label}
            description={link.description}
            href={link.href}
          />
        ))}
      </div>
    </div>
  )
}
