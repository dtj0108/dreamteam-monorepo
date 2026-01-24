"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Loader2, MessageSquare, Search } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TeamMember {
  id: string
  profile: {
    id: string
    name: string
    email: string
    avatar_url?: string | null
    is_agent?: boolean
    linked_agent_id?: string | null
  }
}

interface StartDMDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId?: string
  currentUserId?: string
  onStartDM: (participantId: string) => Promise<void>
}

export function StartDMDialog({
  open,
  onOpenChange,
  workspaceId,
  currentUserId,
  onStartDM,
}: StartDMDialogProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStarting, setIsStarting] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = async () => {
    if (!workspaceId) return

    try {
      setIsLoading(true)
      setError(null)
      // Exclude agents - agent interactions happen in the Agents section, not DMs
      const response = await fetch(`/api/team/members?workspaceId=${workspaceId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch members")
      }

      // Filter out current user - must have currentUserId to filter properly
      if (currentUserId) {
        setMembers(data.filter((m: TeamMember) => m.profile.id !== currentUserId))
      } else {
        // If no currentUserId yet, show all members (will re-fetch when available)
        setMembers(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team members")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open && workspaceId && currentUserId) {
      fetchMembers()
    }
  }, [open, workspaceId, currentUserId])

  const handleStartDM = async (participantId: string) => {
    try {
      setIsStarting(participantId)
      setError(null)
      await onStartDM(participantId)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start conversation")
    } finally {
      setIsStarting(null)
    }
  }

  const filteredMembers = members.filter((m) => {
    const searchLower = search.toLowerCase()
    return (
      m.profile.name.toLowerCase().includes(searchLower) ||
      m.profile.email.toLowerCase().includes(searchLower)
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="size-5" />
            Start a conversation
          </DialogTitle>
          <DialogDescription>
            Choose a team member to start a direct message conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {members.length === 0
                  ? "No other team members found"
                  : "No matches found"}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredMembers.map((member) => {
                  const initials = member.profile.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)

                  return (
                    <Button
                      key={member.profile.id}
                      variant="ghost"
                      className="w-full justify-start gap-3 h-auto py-3"
                      disabled={isStarting !== null}
                      onClick={() => handleStartDM(member.profile.id)}
                    >
                      <Avatar className="size-10">
                        <AvatarImage src={member.profile.avatar_url || undefined} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <span className="font-medium">{member.profile.name}</span>
                        <div className="text-xs text-muted-foreground">
                          {member.profile.email}
                        </div>
                      </div>
                      {isStarting === member.profile.id && (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                    </Button>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

