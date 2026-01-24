"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dreamteam/ui/dialog"
import { Button } from "@dreamteam/ui/button"
import { Input } from "@dreamteam/ui/input"
import { Loader2, ExternalLink, CheckCircle, AlertCircle } from "lucide-react"

interface SlackConnectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  onSuccess: () => void
}

export function SlackConnectModal({
  open,
  onOpenChange,
  workspaceId,
  onSuccess,
}: SlackConnectModalProps) {
  const [token, setToken] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [teamName, setTeamName] = useState<string | null>(null)

  const handleConnect = async () => {
    if (!token.trim()) {
      setError("Please enter your Slack bot token")
      return
    }

    if (!token.startsWith("xoxb-") && !token.startsWith("xoxp-")) {
      setError("Invalid token format. Token should start with xoxb- or xoxp-")
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const res = await fetch("/api/integrations/slack/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          token: token.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to connect")
        return
      }

      setSuccess(true)
      setTeamName(data.slackTeamName)
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 1500)
    } catch {
      setError("Failed to connect. Please try again.")
    } finally {
      setIsConnecting(false)
    }
  }

  const handleClose = () => {
    setToken("")
    setError(null)
    setSuccess(false)
    setTeamName(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-6 w-6 rounded flex items-center justify-center bg-[#4A154B] text-white text-xs font-bold">
              S
            </div>
            Connect to Slack
          </DialogTitle>
          <DialogDescription>
            Enter your Slack bot token to import channels and messages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Token Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Slack Bot Token</label>
            <Input
              type="password"
              placeholder="xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => {
                setToken(e.target.value)
                setError(null)
              }}
              disabled={isConnecting || success}
            />
            <p className="text-xs text-muted-foreground">
              Starts with xoxb- (bot token) or xoxp- (user token)
            </p>
          </div>

          {/* Instructions */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <p className="text-sm font-medium">How to get your token (2 min):</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Click "Create an App" → "From scratch"</li>
              <li>Name it anything (e.g., "DreamTeam Import")</li>
              <li><strong>Select your existing workspace</strong> from the dropdown</li>
              <li>Go to "OAuth & Permissions" in the sidebar</li>
              <li>Under "Scopes", add: channels:read, channels:history, channels:join, groups:read, groups:history, users:read</li>
              <li>Click "Install to Workspace" at the top</li>
              <li>Copy the "Bot User OAuth Token" and paste above</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2 italic">
              Note: You're not creating a new Slack - just a private app to access your existing workspace's data.
            </p>
            <a
              href="https://api.slack.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
            >
              Open Slack API
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Connected to {teamName}!
            </div>
          )}

          {/* Security Note */}
          <p className="text-xs text-muted-foreground">
            Your token is encrypted and stored securely. We only use it to import your data.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isConnecting}>
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={isConnecting || success || !token.trim()}
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Verifying...
              </>
            ) : success ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Connected
              </>
            ) : (
              "Connect & Verify"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
