"use client"

import { useState, useEffect } from "react"
import { Button } from "@dreamteam/ui/button"
import { Input } from "@dreamteam/ui/input"
import { Label } from "@dreamteam/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dreamteam/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@dreamteam/ui/dialog"
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
import { Badge } from "@dreamteam/ui/badge"
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  created_at: string
  last_used_at: string | null
  expires_at: string | null
  is_revoked: boolean
  revoked_at: string | null
  created_by: { id: string; name: string } | null
  revoked_by: { id: string; name: string } | null
}

interface ApiKeysTabProps {
  workspaceId: string
  isOwner: boolean
  isAdmin: boolean
}

export function ApiKeysTab({ workspaceId, isOwner, isAdmin }: ApiKeysTabProps) {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const canManage = isOwner || isAdmin

  useEffect(() => {
    fetchKeys()
  }, [workspaceId])

  async function fetchKeys() {
    try {
      const res = await fetch(`/api/team/api-keys?workspaceId=${workspaceId}`)
      if (res.ok) {
        const data = await res.json()
        setKeys(data)
      }
    } catch (error) {
      console.error("Failed to fetch API keys:", error)
    } finally {
      setLoading(false)
    }
  }

  async function createKey() {
    if (!newKeyName.trim()) return

    setCreating(true)
    try {
      const res = await fetch("/api/team/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name: newKeyName.trim(),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setNewKeyValue(data.key)
        setDialogOpen(false)
        setSuccessDialogOpen(true)
        setNewKeyName("")
        fetchKeys() // Refresh the list
      } else {
        const error = await res.json()
        console.error("Failed to create API key:", error)
      }
    } catch (error) {
      console.error("Failed to create API key:", error)
    } finally {
      setCreating(false)
    }
  }

  async function revokeKey(keyId: string) {
    setRevokingId(keyId)
    try {
      const res = await fetch(`/api/team/api-keys/${keyId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        fetchKeys() // Refresh the list
      } else {
        const error = await res.json()
        console.error("Failed to revoke API key:", error)
      }
    } catch (error) {
      console.error("Failed to revoke API key:", error)
    } finally {
      setRevokingId(null)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function closeSuccessDialog() {
    setSuccessDialogOpen(false)
    setNewKeyValue(null)
    setShowKey(false)
    setCopied(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const activeKeys = keys.filter((k) => !k.is_revoked)
  const revokedKeys = keys.filter((k) => k.is_revoked)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">API Keys</h3>
          <p className="text-sm text-muted-foreground">
            Manage API keys for programmatic access to your workspace
          </p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>
                  Create a new API key for programmatic access. The key will
                  only be shown once.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="key-name">Key Name</Label>
                  <Input
                    id="key-name"
                    placeholder="e.g., Production API Key"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    A descriptive name to identify this key
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createKey}
                  disabled={!newKeyName.trim() || creating}
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Key"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Success Dialog - Show new key */}
      <Dialog open={successDialogOpen} onOpenChange={closeSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              API Key Created
            </DialogTitle>
            <DialogDescription>
              Copy your API key now. You won&apos;t be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm font-mono break-all">
                  {showKey ? newKeyValue : "•".repeat(40)}
                </code>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => newKeyValue && copyToClipboard(newKeyValue)}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Store this key securely. It will not be shown again.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={closeSuccessDialog}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Active Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            Active Keys
            {activeKeys.length > 0 && (
              <Badge variant="secondary">{activeKeys.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Keys that can be used to access the API
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No active API keys</p>
              {canManage && (
                <p className="text-sm mt-1">
                  Create a key to start using the API
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {activeKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{key.name}</span>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded">
                        {key.key_prefix}...
                      </code>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created{" "}
                      {formatDistanceToNow(new Date(key.created_at), {
                        addSuffix: true,
                      })}
                      {key.created_by && ` by ${key.created_by.name}`}
                      {key.last_used_at && (
                        <>
                          {" · "}Last used{" "}
                          {formatDistanceToNow(new Date(key.last_used_at), {
                            addSuffix: true,
                          })}
                        </>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={revokingId === key.id}
                        >
                          {revokingId === key.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will immediately revoke the key &quot;
                            {key.name}&quot;. Any applications using this key
                            will lose access.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => revokeKey(key.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Revoke Key
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoked Keys (if any) */}
      {revokedKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
              <Key className="h-4 w-4" />
              Revoked Keys
              <Badge variant="outline">{revokedKeys.length}</Badge>
            </CardTitle>
            <CardDescription>
              Keys that have been revoked and can no longer be used
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {revokedKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/50 opacity-60"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium line-through">
                        {key.name}
                      </span>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded">
                        {key.key_prefix}...
                      </code>
                      <Badge variant="destructive" className="text-xs">
                        Revoked
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Revoked{" "}
                      {key.revoked_at &&
                        formatDistanceToNow(new Date(key.revoked_at), {
                          addSuffix: true,
                        })}
                      {key.revoked_by && ` by ${key.revoked_by.name}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Using API Keys</CardTitle>
          <CardDescription>
            Include your API key in the Authorization header
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg">
            <code className="text-sm font-mono">
              Authorization: Bearer sk_live_...
            </code>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            API keys provide full access to all workspace resources. Keep them
            secure and never share them publicly.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
