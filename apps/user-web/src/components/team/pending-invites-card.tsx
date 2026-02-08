"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { UserPlus, Clock, Trash2, Loader2, Shield, User, Mail } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export interface PendingInvite {
  id: string
  email?: string | null
  role: "admin" | "member"
  created_at: string
  expires_at?: string | null
  inviter?: {
    id: string
    name: string
  }
}

interface PendingInvitesCardProps {
  invites: PendingInvite[]
  isLoading?: boolean
  canInvite?: boolean
  onGenerateInvite?: (role: "admin" | "member", email: string) => Promise<void>
  onRevokeInvite?: (inviteId: string) => Promise<void>
}

export function PendingInvitesCard({
  invites,
  isLoading = false,
  canInvite = false,
  onGenerateInvite,
  onRevokeInvite,
}: PendingInvitesCardProps) {
  const [role, setRole] = useState<"admin" | "member">("member")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!onGenerateInvite) return
    const trimmedEmail = email.trim()
    if (!trimmedEmail) return

    setIsSubmitting(true)
    setError(null)

    try {
      await onGenerateInvite(role, trimmedEmail)
      setRole("member")
      setEmail("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate invite")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRevoke = async (inviteId: string) => {
    if (!onRevokeInvite) return
    setRevokingId(inviteId)
    try {
      await onRevokeInvite(inviteId)
    } finally {
      setRevokingId(null)
    }
  }

  const isExpired = (expiresAt?: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-sky-600" />
          <CardTitle>Invite Team Members</CardTitle>
        </div>
        <CardDescription>
          Invite team members by email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Generate Invite Form */}
        {canInvite && (
          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="teammate@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="w-36 space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as "admin" | "member")}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">
                      <div className="flex items-center gap-2">
                        <User className="size-3" />
                        Member
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="size-3" />
                        Admin
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGenerate} disabled={isSubmitting || !email.trim()}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <Mail className="size-4 mr-2" />
                )}
                Send Invite
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {/* Pending Invites List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Active Invites ({invites.filter(i => !isExpired(i.expires_at)).length})
          </h4>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : invites.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg bg-muted/30">
              No active invites
            </p>
          ) : (
            <div className="space-y-2">
              {invites.map((invite) => {
                const expired = isExpired(invite.expires_at)
                return (
                  <div
                    key={invite.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${expired ? "opacity-60" : ""}`}
                  >
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                      <Mail className="size-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {invite.email && (
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Mail className="size-3 text-muted-foreground" />
                          <span className="text-sm font-medium truncate">{invite.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {expired ? (
                          <span className="text-destructive">Expired</span>
                        ) : invite.expires_at ? (
                          <span>
                            Expires{" "}
                            {formatDistanceToNow(new Date(invite.expires_at), {
                              addSuffix: true,
                            })}
                          </span>
                        ) : (
                          <span>
                            Created{" "}
                            {formatDistanceToNow(new Date(invite.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        invite.role === "admin"
                          ? "border-blue-500 text-blue-500"
                          : "border-gray-500 text-gray-500"
                      }
                    >
                      {invite.role === "admin" ? (
                        <Shield className="size-3 mr-1" />
                      ) : (
                        <User className="size-3 mr-1" />
                      )}
                      {invite.role}
                    </Badge>
                    {canInvite && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRevoke(invite.id)}
                        disabled={revokingId === invite.id}
                      >
                        {revokingId === invite.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
