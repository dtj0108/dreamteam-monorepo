"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Settings, ChevronRight } from "lucide-react"

interface AgentWithConfig {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  is_active: boolean
  reports_to: string[]
  reports_to_profiles: {
    id: string
    name: string
    avatar_url: string | null
  }[]
}

export default function AgentConfigurationsPage() {
  const router = useRouter()
  const { user } = useUser()
  const workspaceId = user?.workspaceId
  const [agents, setAgents] = useState<AgentWithConfig[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAgents() {
      if (!workspaceId) return

      try {
        const response = await fetch(`/api/team/agents?workspaceId=${workspaceId}`)
        if (response.ok) {
          const data = await response.json()
          setAgents(data)
        }
      } catch (error) {
        console.error("Failed to fetch agents:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAgents()
  }, [workspaceId])

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Settings className="size-6" />
          Agent Configurations
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure notification settings and preferences for your agents.
        </p>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Sparkles className="size-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No agents found</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Agent</TableHead>
                <TableHead>Reports To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow
                  key={agent.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/agents/configurations/${agent.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-md bg-muted flex items-center justify-center text-lg">
                        {agent.avatar_url || <Sparkles className="size-4 text-muted-foreground" />}
                      </div>
                      <div>
                        <div className="font-medium">{agent.name}</div>
                        {agent.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {agent.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {agent.reports_to_profiles && agent.reports_to_profiles.length > 0 ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        {agent.reports_to_profiles.slice(0, 3).map((profile) => (
                          <div key={profile.id} className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5">
                            <Avatar className="size-4">
                              <AvatarFallback className="text-[8px]">
                                {profile.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{profile.name.split(" ")[0]}</span>
                          </div>
                        ))}
                        {agent.reports_to_profiles.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{agent.reports_to_profiles.length - 3} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not configured</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={agent.is_active ? "default" : "secondary"}>
                      {agent.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
