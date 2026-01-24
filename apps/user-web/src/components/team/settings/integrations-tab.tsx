"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@dreamteam/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@dreamteam/ui/card"
import { Badge } from "@dreamteam/ui/badge"
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
import { Loader2, Upload, Plug, Trash2, Download, CheckCircle, ExternalLink, MessageSquare } from "lucide-react"
import { CRM_PROVIDERS, CRM_PROVIDER_IDS, type CRMProvider, type CRMIntegration } from "@/types/crm"
import { ApiKeyModal } from "@/components/import/api-key-modal"
import { CRMImportModal } from "@/components/import/crm-import-modal"
import { CSVImportModal } from "@/components/import/csv-import-modal"
import { SlackConnectModal } from "@/components/import/slack-connect-modal"
import { SlackImportModal } from "@/components/import/slack-import-modal"

interface SlackIntegrationStatus {
  connected: boolean
  id?: string
  slackTeamName?: string
  lastSyncAt?: string
}

interface IntegrationsTabProps {
  workspaceId: string
  isOwner: boolean
  isAdmin: boolean
}

export function IntegrationsTab({ workspaceId, isOwner, isAdmin }: IntegrationsTabProps) {
  const [integrations, setIntegrations] = useState<CRMIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null)

  // Slack integration state
  const [slackStatus, setSlackStatus] = useState<SlackIntegrationStatus>({ connected: false })
  const [disconnectingSlack, setDisconnectingSlack] = useState(false)

  // Modal states
  const [csvModalOpen, setCsvModalOpen] = useState(false)
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<CRMProvider | null>(null)
  const [slackConnectModalOpen, setSlackConnectModalOpen] = useState(false)
  const [slackImportModalOpen, setSlackImportModalOpen] = useState(false)

  const canManage = isOwner || isAdmin

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch(`/api/integrations/crm?workspaceId=${workspaceId}`)
      if (res.ok) {
        const data = await res.json()
        setIntegrations(data)
      }
    } catch (error) {
      console.error("Failed to fetch integrations:", error)
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  const fetchSlackStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/integrations/slack?workspaceId=${workspaceId}`)
      if (res.ok) {
        const data = await res.json()
        setSlackStatus(data)
      }
    } catch (error) {
      console.error("Failed to fetch Slack status:", error)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchIntegrations()
    fetchSlackStatus()
  }, [fetchIntegrations, fetchSlackStatus])

  const handleConnectClick = (provider: CRMProvider) => {
    setSelectedProvider(provider)
    setApiKeyModalOpen(true)
  }

  const handleImportClick = (provider: CRMProvider) => {
    setSelectedProvider(provider)
    setImportModalOpen(true)
  }

  const handleDisconnect = async (integrationId: string) => {
    setDisconnectingId(integrationId)
    try {
      const res = await fetch(`/api/integrations/crm/disconnect/${integrationId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setIntegrations((prev) => prev.filter((i) => i.id !== integrationId))
      }
    } catch (error) {
      console.error("Failed to disconnect:", error)
    } finally {
      setDisconnectingId(null)
    }
  }

  const handleDisconnectSlack = async () => {
    setDisconnectingSlack(true)
    try {
      const res = await fetch(`/api/integrations/slack?workspaceId=${workspaceId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setSlackStatus({ connected: false })
      }
    } catch (error) {
      console.error("Failed to disconnect Slack:", error)
    } finally {
      setDisconnectingSlack(false)
    }
  }

  const getIntegrationForProvider = (provider: CRMProvider) => {
    return integrations.find((i) => i.provider === provider)
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
      {/* Import Options */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* CSV Upload Card */}
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setCsvModalOpen(true)}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Upload className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">CSV Upload</CardTitle>
                <CardDescription className="text-xs">Works with any CRM</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Export your data from any CRM as CSV and import it here. Supports leads, contacts, opportunities, and tasks.
            </p>
            <Button size="sm" variant="outline" className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Upload CSV
            </Button>
          </CardContent>
        </Card>

        {/* Direct CRM Connection Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Plug className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-base">Connect CRM</CardTitle>
                <CardDescription className="text-xs">Pull data directly</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Connect your CRM with an API key and import data directly without exporting CSV files.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CRM_PROVIDER_IDS.map((providerId) => {
                const provider = CRM_PROVIDERS[providerId]
                const integration = getIntegrationForProvider(providerId)

                return (
                  <Button
                    key={providerId}
                    size="sm"
                    variant={integration ? "secondary" : "outline"}
                    onClick={() => integration ? handleImportClick(providerId) : handleConnectClick(providerId)}
                    disabled={!canManage && !integration}
                    className="justify-start"
                  >
                    <div
                      className="h-4 w-4 rounded mr-2 flex items-center justify-center text-white text-[8px] font-bold shrink-0"
                      style={{ backgroundColor: provider.color }}
                    >
                      {provider.name.slice(0, 1)}
                    </div>
                    {provider.name}
                    {integration && <CheckCircle className="h-3 w-3 ml-1 text-green-600 shrink-0" />}
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Slack Import Card */}
        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => slackStatus.connected ? setSlackImportModalOpen(true) : setSlackConnectModalOpen(true)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base">Import from Slack</CardTitle>
                <CardDescription className="text-xs">Channels & messages</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Import channels and conversation history from your Slack workspace into Teams.
            </p>
            <Button
              size="sm"
              variant={slackStatus.connected ? "secondary" : "outline"}
              className="w-full"
              disabled={!canManage && !slackStatus.connected}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {slackStatus.connected ? (
                <>
                  Import from Slack
                  <CheckCircle className="h-3 w-3 ml-1 text-green-600" />
                </>
              ) : (
                "Connect Slack"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Connected Integrations */}
      {integrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connected CRMs</CardTitle>
            <CardDescription>
              Your connected CRM integrations. Click Import to pull data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {integrations.map((integration) => {
                const provider = CRM_PROVIDERS[integration.provider]
                const isDisconnecting = disconnectingId === integration.id

                return (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: provider.color }}
                      >
                        {provider.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {provider.name}
                          <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                            Connected
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {integration.external_account_name || "Connected"}
                          {integration.last_sync_at && (
                            <> · Last import: {new Date(integration.last_sync_at).toLocaleDateString()}</>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleImportClick(integration.provider)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Import
                      </Button>

                      {canManage && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive"
                              disabled={isDisconnecting}
                            >
                              {isDisconnecting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disconnect {provider.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove the connection to your {provider.name} account.
                                Your imported data will remain in DreamTeam.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDisconnect(integration.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Disconnect
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Slack */}
      {slackStatus.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connected Slack</CardTitle>
            <CardDescription>
              Your Slack workspace connection. Click Import to pull channels and messages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded flex items-center justify-center bg-[#4A154B] text-white text-xs font-bold">
                  SL
                </div>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {slackStatus.slackTeamName || "Slack Workspace"}
                    <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                      Connected
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {slackStatus.lastSyncAt && (
                      <>Last import: {new Date(slackStatus.lastSyncAt).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setSlackImportModalOpen(true)}>
                  <Download className="h-4 w-4 mr-1" />
                  Import
                </Button>

                {canManage && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={disconnectingSlack}
                      >
                        {disconnectingSlack ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Slack?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove the connection to your Slack workspace.
                          Your imported channels and messages will remain in DreamTeam.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDisconnectSlack}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How to import your data</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <div>
            <p className="font-medium text-foreground">Option 1: CSV Upload (Any CRM)</p>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>Export your data from your current CRM as CSV</li>
              <li>Click Upload CSV and select your file</li>
              <li>Map columns and preview your data</li>
              <li>Import leads, contacts, opportunities, or tasks</li>
            </ol>
          </div>
          <div>
            <p className="font-medium text-foreground">Option 2: Direct CRM Connection</p>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>Click your CRM and enter your API key</li>
              <li>Select what data to import</li>
              <li>Data is pulled directly - no CSV needed</li>
            </ol>
          </div>
          <div>
            <p className="font-medium text-foreground">Option 3: Slack Import</p>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>Connect your Slack workspace with a bot token</li>
              <li>Select channels to import</li>
              <li>Messages and threads are imported to Teams</li>
            </ol>
          </div>
          <p className="text-xs mt-4 flex items-center gap-1 flex-wrap">
            <ExternalLink className="h-3 w-3" />
            Need help?{" "}
            <a href="https://developer.close.com/" target="_blank" rel="noopener noreferrer" className="underline">
              Close
            </a>
            {" · "}
            <a href="https://developers.pipedrive.com/" target="_blank" rel="noopener noreferrer" className="underline">
              Pipedrive
            </a>
            {" · "}
            <a href="https://developers.hubspot.com/" target="_blank" rel="noopener noreferrer" className="underline">
              HubSpot
            </a>
            {" · "}
            <a href="https://developers.freshworks.com/crm/" target="_blank" rel="noopener noreferrer" className="underline">
              Freshsales
            </a>
            {" · "}
            <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="underline">
              Slack Apps
            </a>
          </p>
        </CardContent>
      </Card>

      {/* Modals */}
      <CSVImportModal
        open={csvModalOpen}
        onOpenChange={setCsvModalOpen}
        onImportComplete={() => {}}
      />

      <ApiKeyModal
        open={apiKeyModalOpen}
        onOpenChange={setApiKeyModalOpen}
        provider={selectedProvider}
        workspaceId={workspaceId}
        onSuccess={() => {
          fetchIntegrations()
          setApiKeyModalOpen(false)
        }}
      />

      <CRMImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        provider={selectedProvider}
        workspaceId={workspaceId}
        onSuccess={() => {
          fetchIntegrations()
        }}
      />

      <SlackConnectModal
        open={slackConnectModalOpen}
        onOpenChange={setSlackConnectModalOpen}
        workspaceId={workspaceId}
        onSuccess={() => {
          fetchSlackStatus()
          setSlackConnectModalOpen(false)
        }}
      />

      <SlackImportModal
        open={slackImportModalOpen}
        onOpenChange={setSlackImportModalOpen}
        workspaceId={workspaceId}
        onSuccess={() => {
          fetchSlackStatus()
        }}
      />
    </div>
  )
}
