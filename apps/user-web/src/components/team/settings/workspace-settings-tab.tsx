"use client"

import { useState, useEffect } from "react"
import { Button } from "@dreamteam/ui/button"
import { Input } from "@dreamteam/ui/input"
import { Label } from "@dreamteam/ui/label"
import { Textarea } from "@dreamteam/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@dreamteam/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@dreamteam/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@dreamteam/ui/alert-dialog"
import { Building2, Loader2, Trash2 } from "lucide-react"
import type { WorkspaceSettings } from "@/types/team-settings"

interface WorkspaceSettingsTabProps {
  workspaceId: string
  isOwner: boolean
}

export function WorkspaceSettingsTab({ workspaceId, isOwner }: WorkspaceSettingsTabProps) {
  const [workspace, setWorkspace] = useState<WorkspaceSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    fetchWorkspace()
  }, [workspaceId])

  useEffect(() => {
    if (workspace) {
      const nameChanged = name !== workspace.name
      const descChanged = description !== (workspace.description || "")
      setHasChanges(nameChanged || descChanged)
    }
  }, [name, description, workspace])

  async function fetchWorkspace() {
    try {
      const res = await fetch(`/api/team/workspace?workspaceId=${workspaceId}`)
      if (res.ok) {
        const data = await res.json()
        setWorkspace(data)
        setName(data.name || "")
        setDescription(data.description || "")
      }
    } catch (error) {
      console.error("Failed to fetch workspace:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!hasChanges) return

    setSaving(true)
    try {
      const res = await fetch("/api/team/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, name, description }),
      })

      if (res.ok) {
        const updated = await res.json()
        setWorkspace(updated)
        setHasChanges(false)
      }
    } catch (error) {
      console.error("Failed to save workspace:", error)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    if (workspace) {
      setName(workspace.name || "")
      setDescription(workspace.description || "")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Workspace Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Workspace Settings</CardTitle>
          <CardDescription>
            Manage your workspace name, description, and branding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={workspace?.avatar_url || undefined} />
              <AvatarFallback className="text-lg">
                <Building2 className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">Workspace Avatar</p>
              <p className="text-xs text-muted-foreground">
                Avatar support coming soon
              </p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace Name</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter workspace name"
              disabled={!isOwner}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="workspace-description">Description</Label>
            <Textarea
              id="workspace-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your workspace..."
              rows={3}
              disabled={!isOwner}
            />
            <p className="text-xs text-muted-foreground">
              A brief description of what this workspace is for
            </p>
          </div>

          {/* Save/Cancel Buttons */}
          {isOwner && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={!hasChanges || saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          )}

          {!isOwner && (
            <p className="text-sm text-muted-foreground">
              Only the workspace owner can edit these settings
            </p>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone - Owner Only */}
      {isOwner && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions that affect your entire workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <div>
                <p className="font-medium">Delete Workspace</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this workspace and all its data
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Workspace?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      workspace &ldquo;{workspace?.name}&rdquo; and remove all associated data
                      including members, channels, and messages.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        // TODO: Implement workspace deletion
                        console.log("Delete workspace:", workspaceId)
                      }}
                    >
                      Delete Workspace
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
