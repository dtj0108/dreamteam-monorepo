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
import { CRM_PROVIDERS, type CRMProvider } from "@/types/crm"

interface ApiKeyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: CRMProvider | null
  workspaceId: string
  onSuccess: () => void
}

export function ApiKeyModal({
  open,
  onOpenChange,
  provider,
  workspaceId,
  onSuccess,
}: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("")
  const [subdomain, setSubdomain] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!provider) return null

  const config = CRM_PROVIDERS[provider]
  const needsSubdomain = provider === "freshsales"

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError("Please enter your API key")
      return
    }

    if (needsSubdomain && !subdomain.trim()) {
      setError("Please enter your Freshsales subdomain")
      return
    }

    setIsConnecting(true)
    setError(null)

    // For Freshsales, combine subdomain and API key
    const finalApiKey = needsSubdomain
      ? `${subdomain.trim()}:${apiKey.trim()}`
      : apiKey.trim()

    try {
      const res = await fetch("/api/integrations/crm/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          workspaceId,
          apiKey: finalApiKey,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to connect")
        return
      }

      setSuccess(true)
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
    setApiKey("")
    setSubdomain("")
    setError(null)
    setSuccess(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="h-6 w-6 rounded flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: config.color }}
            >
              {config.name.slice(0, 2).toUpperCase()}
            </div>
            Connect to {config.name}
          </DialogTitle>
          <DialogDescription>
            Enter your {config.name} API key to import your data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Subdomain Input (Freshsales only) */}
          {needsSubdomain && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Freshsales Subdomain</label>
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  placeholder="mycompany"
                  value={subdomain}
                  onChange={(e) => {
                    setSubdomain(e.target.value)
                    setError(null)
                  }}
                  disabled={isConnecting || success}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">.freshsales.io</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Your subdomain is the first part of your Freshsales URL
              </p>
            </div>
          )}

          {/* API Key Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <Input
              type="password"
              placeholder={config.apiKeyPlaceholder}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value)
                setError(null)
              }}
              disabled={isConnecting || success}
            />
          </div>

          {/* Instructions */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <p className="text-sm font-medium">How to find your API key:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              {config.apiKeyInstructions.map((instruction, i) => (
                <li key={i}>{instruction}</li>
              ))}
            </ol>
            <a
              href={config.settingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
            >
              Open {config.name} Settings
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
              Connected successfully!
            </div>
          )}

          {/* Security Note */}
          <p className="text-xs text-muted-foreground">
            Your API key is encrypted and stored securely. We only use it to import your data.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isConnecting}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={isConnecting || success || !apiKey.trim() || (needsSubdomain && !subdomain.trim())}>
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
