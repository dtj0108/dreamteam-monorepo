"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle, Loader2, Info } from "lucide-react"

interface WorkspaceMember {
  id: string
  profile: {
    id: string
    name: string
    avatar_url: string | null
    is_agent?: boolean
  }
}

interface NotificationsSectionProps {
  agent: {
    id: string
    reports_to: string[]
    reports_to_profiles: {
      id: string
      name: string
      avatar_url: string | null
    }[]
  }
  workspaceId: string | undefined
  onUpdate: (agent: unknown) => void
}

export function NotificationsSection({ agent, workspaceId, onUpdate }: NotificationsSectionProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>(agent.reports_to || [])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Fetch workspace members
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
      } finally {
        setLoadingMembers(false)
      }
    }

    fetchMembers()
  }, [workspaceId])

  // Update selectedIds when agent changes
  useEffect(() => {
    setSelectedIds(agent.reports_to || [])
  }, [agent.reports_to])

  const toggleMember = async (profileId: string) => {
    const newSelectedIds = selectedIds.includes(profileId)
      ? selectedIds.filter(id => id !== profileId)
      : [...selectedIds, profileId]

    setSelectedIds(newSelectedIds)
    setSaving(true)
    setSaved(false)

    try {
      const response = await fetch(`/api/team/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportsTo: newSelectedIds }),
      })

      if (response.ok) {
        const updatedAgent = await response.json()
        onUpdate(updatedAgent)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        // Revert on failure
        setSelectedIds(agent.reports_to || [])
      }
    } catch (error) {
      console.error("Failed to update reports_to:", error)
      setSelectedIds(agent.reports_to || [])
    } finally {
      setSaving(false)
    }
  }

  // Filter out agent profiles from the member list
  const humanMembers = members.filter(m => !m.profile?.is_agent)

  if (loadingMembers) {
    return (
      <div className="space-y-4">
        <div>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="border rounded-lg p-3 space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="size-4" />
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold">Notification Recipients</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saved && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="size-4" />
                Saved
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Select who receives notifications when this agent completes scheduled tasks
        </p>
      </div>

      <div className="space-y-3">
        <Label>Reports To</Label>

        {humanMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
            No team members found
          </p>
        ) : (
          <div className="border rounded-lg p-3 max-h-[300px] overflow-y-auto space-y-1">
            {humanMembers.map(member => {
              const initials = member.profile.name
                .split(" ")
                .map(n => n[0])
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
        <div className="flex gap-3">
          <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-1">How notifications work:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>If recipients are selected above, all of them receive notifications</li>
              <li>Otherwise, the schedule creator receives notifications</li>
              <li>If neither is set, all workspace admins are notified</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
