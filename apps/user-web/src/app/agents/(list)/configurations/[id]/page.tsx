"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sparkles, ArrowLeft, Loader2, CheckCircle } from "lucide-react"

interface Agent {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  reports_to: string[]
  reports_to_profiles: {
    id: string
    name: string
    avatar_url: string | null
  }[]
}

interface WorkspaceMember {
  id: string
  profile: {
    id: string
    name: string
    avatar_url: string | null
    is_agent?: boolean
  }
}

export default function AgentConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: agentId } = use(params)
  const { user } = useUser()
  const workspaceId = user?.workspaceId
  const [agent, setAgent] = useState<Agent | null>(null)
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch agent details
  useEffect(() => {
    async function fetchAgent() {
      try {
        const response = await fetch(`/api/team/agents/${agentId}`)
        if (response.ok) {
          const data = await response.json()
          setAgent(data)
          setSelectedIds(data.reports_to || [])
        }
      } catch (error) {
        console.error("Failed to fetch agent:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAgent()
  }, [agentId])

  // Fetch workspace members for the checkbox list
  useEffect(() => {
    async function fetchMembers() {
      if (!workspaceId) return

      try {
        const response = await fetch(`/api/team/members?workspaceId=${workspaceId}`)
        if (response.ok) {
          const data = await response.json()
          setMembers(data)
        }
      } catch (error) {
        console.error("Failed to fetch members:", error)
      }
    }

    fetchMembers()
  }, [workspaceId])

  const toggleMember = async (profileId: string) => {
    const newSelectedIds = selectedIds.includes(profileId)
      ? selectedIds.filter((id) => id !== profileId)
      : [...selectedIds, profileId]

    setSelectedIds(newSelectedIds)
    setSaving(true)
    setSaved(false)

    try {
      const response = await fetch(`/api/team/agents/${agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportsTo: newSelectedIds }),
      })

      if (response.ok) {
        const updatedAgent = await response.json()
        setAgent(updatedAgent)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        // Revert on failure
        setSelectedIds(selectedIds)
      }
    } catch (error) {
      console.error("Failed to update reports_to:", error)
      // Revert on failure
      setSelectedIds(selectedIds)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="h-48 bg-muted rounded max-w-2xl" />
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="flex-1">
        <div className="text-center py-12">
          <Sparkles className="size-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Agent not found</p>
        </div>
      </div>
    )
  }

  // Filter out agent profiles from the member list
  const humanMembers = members.filter((m) => !m.profile?.is_agent)

  return (
    <div className="flex-1 max-w-2xl">
      {/* Back link */}
      <Link
        href="/agents/configurations"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="size-4" />
        Back to Configurations
      </Link>

      {/* Agent header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="size-14 rounded-lg bg-muted flex items-center justify-center text-2xl">
          {agent.avatar_url || <Sparkles className="size-6 text-muted-foreground" />}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{agent.name}</h1>
          {agent.description && (
            <p className="text-muted-foreground">{agent.description}</p>
          )}
        </div>
      </div>

      {/* Configuration card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Notification Recipients</CardTitle>
              <CardDescription>
                Select who receives notifications when this agent completes scheduled tasks.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {saving && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
              {saved && <CheckCircle className="size-4 text-green-500" />}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Reports To</Label>
            <p className="text-sm text-muted-foreground mb-3">
              These people will receive DM notifications when the agent completes or fails scheduled tasks.
            </p>

            {humanMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No team members found
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-3">
                {humanMembers.map((member) => {
                  const initials = member.profile.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                  const isSelected = selectedIds.includes(member.profile.id)

                  return (
                    <label
                      key={member.profile.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleMember(member.profile.id)}
                        disabled={saving}
                      />
                      <Avatar className="size-8">
                        <AvatarImage src={member.profile.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-sm font-medium">{member.profile.name}</span>
                    </label>
                  )
                })}
              </div>
            )}

            {selectedIds.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedIds.length} {selectedIds.length === 1 ? "person" : "people"} selected
              </p>
            )}
          </div>

          {/* Info about fallback behavior */}
          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            <p className="font-medium mb-1">How notifications work:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>If recipients are selected above, all of them receive notifications</li>
              <li>Otherwise, the schedule creator receives notifications</li>
              <li>If neither is set, all workspace admins are notified</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
