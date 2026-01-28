"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Activity,
  Clock,
  Compass,
  Calendar,
  Sparkles,
  Target,
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { AgentWithHireStatus } from "@/lib/types/agents"

interface AgentsSidebarProps {
  myAgents: AgentWithHireStatus[]
  pendingCount: number
  isLoading?: boolean
  onHireAgent?: () => void
}

export function AgentsSidebar({
  myAgents,
  pendingCount,
  isLoading,
  onHireAgent,
}: AgentsSidebarProps) {
  const [agentsOpen, setAgentsOpen] = useLocalStorage("agents-my-agents-open", true)
  const [activityOpen, setActivityOpen] = useLocalStorage("agents-activity-open", true)
  const pathname = usePathname()

  // Check if a path is active
  const isActive = (path: string) => pathname === path
  const isAgentActive = (id: string) => pathname === `/agents/${id}`

  return (
    <div className="w-64 shrink-0 border-r bg-muted/30 flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* My Agents Section */}
          <Collapsible open={agentsOpen} onOpenChange={setAgentsOpen} suppressHydrationWarning>
            <div className="flex items-center justify-between px-2 py-1.5">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  {agentsOpen ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                  My Agents
                </button>
              </CollapsibleTrigger>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={onHireAgent}
                title="Hire new agent"
              >
                <Plus className="size-4" />
              </Button>
            </div>

            <CollapsibleContent>
              <div className="space-y-0.5">
                {isLoading ? (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                    Loading...
                  </div>
                ) : myAgents.length > 0 ? (
                  myAgents.map((agent) => (
                    <Link
                      key={agent.id}
                      href={`/agents/${agent.localAgentId || agent.id}`}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                        isAgentActive(agent.localAgentId || agent.id)
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="size-6 rounded-md bg-muted flex items-center justify-center text-base">
                        {agent.avatar_url ? (
                          <span>{agent.avatar_url}</span>
                        ) : (
                          <Sparkles className="size-3 text-muted-foreground" />
                        )}
                      </div>
                      <span className="truncate flex-1">{agent.name}</span>
                    </Link>
                  ))
                ) : (
                  <Link
                    href="/agents"
                    className="w-full flex items-center gap-2 px-2 py-3 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Plus className="size-4" />
                    <span>Hire your first agent</span>
                  </Link>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Activity Section */}
          <Collapsible open={activityOpen} onOpenChange={setActivityOpen} className="mt-4" suppressHydrationWarning>
            <div className="flex items-center justify-between px-2 py-1.5">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  {activityOpen ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                  Activity
                </button>
              </CollapsibleTrigger>
              {pendingCount > 0 && (
                <Badge variant="destructive" className="size-5 p-0 flex items-center justify-center text-[10px]">
                  {pendingCount}
                </Badge>
              )}
            </div>

            <CollapsibleContent>
              <div className="space-y-0.5">
                <Link
                  href="/agents/activity"
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                    isActive("/agents/activity")
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Activity className="size-4" />
                  <span>All Activity</span>
                </Link>

                <Link
                  href="/agents/activity/pending"
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                    isActive("/agents/activity/pending")
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Clock className="size-4" />
                  <span className="flex-1">Pending Approval</span>
                  {pendingCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {pendingCount}
                    </Badge>
                  )}
                </Link>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Schedules Link */}
          <div className="mt-4">
            <Link
              href="/agents/schedules"
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                isActive("/agents/schedules")
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className="size-4" />
              <span>Schedules</span>
            </Link>
          </div>

          {/* Autonomy Link */}
          <div className="mt-1">
            <Link
              href="/agents/autonomy"
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                isActive("/agents/autonomy")
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Target className="size-4" />
              <span>Autonomy</span>
            </Link>
          </div>

          {/* Discover Link */}
          <div className="mt-4 pt-4 border-t">
            <Link
              href="/agents"
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                isActive("/agents")
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Compass className="size-4" />
              <span>Discover Agents</span>
            </Link>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
