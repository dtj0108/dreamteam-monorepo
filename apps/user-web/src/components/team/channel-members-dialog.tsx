"use client"

import { useState, useEffect, useCallback } from "react"
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
import { Loader2, Search, Users, UserPlus, X, Check } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface ChannelMember {
  id: string
  joined_at: string
  profile: {
    id: string
    name: string
    email: string
    avatar_url?: string | null
  }
}

interface TeamMember {
  id: string
  profile: {
    id: string
    name: string
    email: string
    avatar_url?: string | null
  }
}

interface ChannelMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  channelId: string
  channelName: string
  workspaceId?: string
  currentUserId?: string
  onMembersChange?: () => void
}

export function ChannelMembersDialog({
  open,
  onOpenChange,
  channelId,
  channelName,
  workspaceId,
  currentUserId,
  onMembersChange,
}: ChannelMembersDialogProps) {
  const [members, setMembers] = useState<ChannelMember[]>([])
  const [allWorkspaceMembers, setAllWorkspaceMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAddingMember, setIsAddingMember] = useState<string | null>(null)
  const [isRemovingMember, setIsRemovingMember] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("members")

  const fetchMembers = useCallback(async () => {
    if (!channelId) return

    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`/api/team/channels/${channelId}/members`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch members")
      }

      setMembers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load channel members")
    } finally {
      setIsLoading(false)
    }
  }, [channelId])

  const fetchWorkspaceMembers = useCallback(async () => {
    if (!workspaceId) return

    try {
      const response = await fetch(`/api/team/members?workspaceId=${workspaceId}`)
      const data = await response.json()

      if (response.ok) {
        setAllWorkspaceMembers(data)
      }
    } catch (err) {
      console.error("Failed to fetch workspace members:", err)
    }
  }, [workspaceId])

  useEffect(() => {
    if (open) {
      fetchMembers()
      fetchWorkspaceMembers()
    }
  }, [open, fetchMembers, fetchWorkspaceMembers])

  const handleAddMember = async (profileId: string) => {
    try {
      setIsAddingMember(profileId)
      setError(null)
      
      const response = await fetch(`/api/team/channels/${channelId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add member")
      }

      // Refresh members list
      await fetchMembers()
      onMembersChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member")
    } finally {
      setIsAddingMember(null)
    }
  }

  const handleRemoveMember = async (profileId: string) => {
    try {
      setIsRemovingMember(profileId)
      setError(null)
      
      const response = await fetch(
        `/api/team/channels/${channelId}/members?profileId=${profileId}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to remove member")
      }

      // Refresh members list
      await fetchMembers()
      onMembersChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member")
    } finally {
      setIsRemovingMember(null)
    }
  }

  // Filter members based on search
  const filteredMembers = members.filter((m) => {
    const searchLower = search.toLowerCase()
    return (
      m.profile.name.toLowerCase().includes(searchLower) ||
      m.profile.email.toLowerCase().includes(searchLower)
    )
  })

  // Get members who are not in the channel
  const memberIds = new Set(members.map((m) => m.profile.id))
  const nonMembers = allWorkspaceMembers.filter(
    (m) => !memberIds.has(m.profile.id)
  )
  const filteredNonMembers = nonMembers.filter((m) => {
    const searchLower = search.toLowerCase()
    return (
      m.profile.name.toLowerCase().includes(searchLower) ||
      m.profile.email.toLowerCase().includes(searchLower)
    )
  })

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5" />
            #{channelName} Members
          </DialogTitle>
          <DialogDescription>
            View and manage channel members. {members.length} member{members.length !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members" className="gap-2">
              <Users className="size-4" />
              Members
              <Badge variant="secondary" className="ml-1">{members.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="add" className="gap-2">
              <UserPlus className="size-4" />
              Add Members
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <TabsContent value="members" className="mt-0">
              <ScrollArea className="h-[300px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {members.length === 0
                      ? "No members in this channel"
                      : "No matches found"}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredMembers.map((member) => (
                      <div
                        key={member.profile.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                      >
                        <Avatar className="size-10">
                          <AvatarImage src={member.profile.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(member.profile.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{member.profile.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {member.profile.email}
                          </div>
                        </div>
                        {member.profile.id !== currentUserId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            disabled={isRemovingMember !== null}
                            onClick={() => handleRemoveMember(member.profile.id)}
                          >
                            {isRemovingMember === member.profile.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <X className="size-4" />
                            )}
                          </Button>
                        )}
                        {member.profile.id === currentUserId && (
                          <Badge variant="secondary" className="text-xs">You</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="add" className="mt-0">
              <ScrollArea className="h-[300px]">
                {filteredNonMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {nonMembers.length === 0
                      ? "All workspace members are in this channel"
                      : "No matches found"}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredNonMembers.map((member) => (
                      <div
                        key={member.profile.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                      >
                        <Avatar className="size-10">
                          <AvatarImage src={member.profile.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(member.profile.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{member.profile.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {member.profile.email}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          disabled={isAddingMember !== null}
                          onClick={() => handleAddMember(member.profile.id)}
                        >
                          {isAddingMember === member.profile.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="size-4" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

