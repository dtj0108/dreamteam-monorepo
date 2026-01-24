"use client"

import Link from "next/link"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useCurrentWorkspace, type WorkspaceId } from "@/components/workspace-switcher"

interface Suggestion {
  label: string
  href: string
}

const workspaceConfig: Record<WorkspaceId, {
  name: string
  emoji: string
  suggestions: Suggestion[]
}> = {
  finance: {
    name: "Finance",
    emoji: "💰",
    suggestions: [
      { label: "Review pending transactions", href: "/transactions" },
      { label: "Check budget status", href: "/budgets" },
      { label: "View analytics", href: "/analytics" },
    ],
  },
  sales: {
    name: "Sales",
    emoji: "🤝",
    suggestions: [
      { label: "Follow up with leads", href: "/sales/leads" },
      { label: "View opportunities", href: "/sales/opportunities" },
      { label: "Manage contacts", href: "/sales/contacts" },
    ],
  },
  team: {
    name: "Team",
    emoji: "💬",
    suggestions: [
      { label: "Check unread messages", href: "/team" },
      { label: "Review mentions", href: "/team" },
    ],
  },
  projects: {
    name: "Projects",
    emoji: "📋",
    suggestions: [
      { label: "View my tasks", href: "/projects" },
      { label: "Check project status", href: "/projects" },
    ],
  },
  knowledge: {
    name: "Knowledge",
    emoji: "📚",
    suggestions: [
      { label: "Recent pages", href: "/knowledge" },
      { label: "Create new document", href: "/knowledge/new" },
    ],
  },
  agents: {
    name: "Agents",
    emoji: "🤖",
    suggestions: [
      { label: "Browse agents", href: "/agents" },
      { label: "Check pending approvals", href: "/agents/activity/pending" },
    ],
  },
}

interface WorkspaceHeaderProps {
  actions?: React.ReactNode
}

export function WorkspaceHeader({ actions }: WorkspaceHeaderProps) {
  const currentWorkspace = useCurrentWorkspace()
  const config = workspaceConfig[currentWorkspace]

  return (
    <div className="flex items-center justify-between flex-1">
      <div className="flex items-center gap-2">
        <span className="text-lg">{config.emoji}</span>
        <span className="font-semibold text-base">{config.name}</span>
      </div>

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Suggestions</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-2">
            <div className="space-y-1">
              {config.suggestions.map((suggestion, index) => (
                <Link
                  key={index}
                  href={suggestion.href}
                  className="block px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                >
                  {suggestion.label}
                </Link>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {actions}
      </div>
    </div>
  )
}
