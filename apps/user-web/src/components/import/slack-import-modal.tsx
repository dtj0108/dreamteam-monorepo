"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dreamteam/ui/dialog"
import { Button } from "@dreamteam/ui/button"
import { Checkbox } from "@dreamteam/ui/checkbox"
import { Input } from "@dreamteam/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dreamteam/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@dreamteam/ui/collapsible"
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Hash,
  Lock,
  ChevronDown,
  Info,
} from "lucide-react"
import type { SlackImportFilters, SlackImportResult } from "@/types/slack"

interface SlackChannel {
  id: string
  name: string
  isPrivate: boolean
  isArchived: boolean
  description: string
  memberCount?: number
  isMember?: boolean
}

interface SlackImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  onSuccess: () => void
}

export function SlackImportModal({
  open,
  onOpenChange,
  workspaceId,
  onSuccess,
}: SlackImportModalProps) {
  const [loading, setLoading] = useState(true)
  const [publicChannels, setPublicChannels] = useState<SlackChannel[]>([])
  const [privateChannels, setPrivateChannels] = useState<SlackChannel[]>([])
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dateRange, setDateRange] = useState<"7days" | "30days" | "90days" | "all">("30days")
  const [messageLimit, setMessageLimit] = useState<string>("")
  const [includeThreads, setIncludeThreads] = useState(true)

  // Import state
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<SlackImportResult | null>(null)

  useEffect(() => {
    if (open) {
      fetchChannels()
    }
  }, [open, workspaceId])

  const fetchChannels = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/integrations/slack/channels?workspaceId=${workspaceId}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to fetch channels")
        return
      }

      setPublicChannels(data.publicChannels || [])
      setPrivateChannels(data.privateChannels || [])
    } catch {
      setError("Failed to fetch channels from Slack")
    } finally {
      setLoading(false)
    }
  }

  const toggleChannel = (channelId: string) => {
    const newSelected = new Set(selectedChannels)
    if (newSelected.has(channelId)) {
      newSelected.delete(channelId)
    } else {
      newSelected.add(channelId)
    }
    setSelectedChannels(newSelected)
  }

  const selectAllPublic = () => {
    const newSelected = new Set(selectedChannels)
    publicChannels.forEach((c) => newSelected.add(c.id))
    setSelectedChannels(newSelected)
  }

  const selectAllPrivate = () => {
    const newSelected = new Set(selectedChannels)
    privateChannels.forEach((c) => newSelected.add(c.id))
    setSelectedChannels(newSelected)
  }

  const deselectAll = () => {
    setSelectedChannels(new Set())
  }

  const handleImport = async () => {
    if (selectedChannels.size === 0) {
      setError("Please select at least one channel")
      return
    }

    setIsImporting(true)
    setError(null)

    const filters: SlackImportFilters = {
      dateRange,
      messageLimit: messageLimit ? parseInt(messageLimit, 10) : undefined,
      includeThreads,
    }

    try {
      const res = await fetch("/api/integrations/slack/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          channelIds: Array.from(selectedChannels),
          filters,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Import failed")
        return
      }

      setImportResult(data)
      onSuccess()
    } catch {
      setError("Import failed. Please try again.")
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    if (!isImporting) {
      setSelectedChannels(new Set())
      setImportResult(null)
      setError(null)
      onOpenChange(false)
    }
  }

  const hasFilters = dateRange !== "all" || messageLimit || !includeThreads

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-6 w-6 rounded flex items-center justify-center bg-[#4A154B] text-white text-xs font-bold">
              S
            </div>
            Import from Slack
          </DialogTitle>
          <DialogDescription>
            Select channels to import into DreamTeam.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading channels...
              </span>
            </div>
          ) : importResult ? (
            // Import Results
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Import Complete!</span>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Channels imported:</span>
                  <span className="font-medium">{importResult.channelsImported}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Messages imported:</span>
                  <span className="font-medium">{importResult.messagesImported.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Channel participants:</span>
                  <span className="font-medium">{importResult.usersCreated}</span>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="text-sm text-amber-600">
                  <p className="font-medium">Some issues occurred:</p>
                  <ul className="list-disc list-inside mt-1">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Your imported channels are now available in the Teams section.
              </p>
            </div>
          ) : (
            <>
              {/* Public Channels */}
              {publicChannels.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium flex items-center gap-1">
                      <Hash className="h-4 w-4" />
                      Public Channels ({publicChannels.length})
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6"
                      onClick={selectAllPublic}
                    >
                      Select all
                    </Button>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto border rounded-md p-2">
                    {publicChannels.map((channel) => (
                      <label
                        key={channel.id}
                        className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedChannels.has(channel.id)}
                          onCheckedChange={() => toggleChannel(channel.id)}
                        />
                        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm flex-1">{channel.name}</span>
                        {channel.memberCount && (
                          <span className="text-xs text-muted-foreground">
                            {channel.memberCount} members
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Private Channels */}
              {privateChannels.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium flex items-center gap-1">
                      <Lock className="h-4 w-4" />
                      Private Channels ({privateChannels.length})
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6"
                      onClick={selectAllPrivate}
                    >
                      Select all
                    </Button>
                  </div>
                  {/* Note about private channels requiring manual invite */}
                  {privateChannels.some((c) => !c.isMember) && (
                    <div className="flex items-start gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>
                        Private channels require the bot to be manually invited.
                        In Slack, type <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">/invite @YourAppName</code> in each channel.
                      </span>
                    </div>
                  )}
                  <div className="space-y-1 max-h-40 overflow-y-auto border rounded-md p-2">
                    {privateChannels.map((channel) => (
                      <label
                        key={channel.id}
                        className={`flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded cursor-pointer ${
                          !channel.isMember ? "opacity-60" : ""
                        }`}
                      >
                        <Checkbox
                          checked={selectedChannels.has(channel.id)}
                          onCheckedChange={() => toggleChannel(channel.id)}
                        />
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm flex-1">{channel.name}</span>
                        {!channel.isMember && (
                          <span className="text-xs text-amber-600">Needs invite</span>
                        )}
                        {channel.memberCount && channel.isMember && (
                          <span className="text-xs text-muted-foreground">
                            {channel.memberCount} members
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {publicChannels.length === 0 && privateChannels.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No channels found.</p>
                  <p className="text-sm">
                    Make sure your Slack bot has been invited to channels.
                  </p>
                </div>
              )}

              {/* Selection Summary */}
              {selectedChannels.size > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {selectedChannels.size} channel{selectedChannels.size !== 1 ? "s" : ""} selected
                  </span>
                  <Button variant="ghost" size="sm" className="text-xs h-6" onClick={deselectAll}>
                    Clear selection
                  </Button>
                </div>
              )}

              {/* Filters */}
              <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-8 text-sm"
                  >
                    <span className="flex items-center gap-1">
                      Filters
                      {hasFilters && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 rounded">
                          Active
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        filtersOpen ? "rotate-180" : ""
                      }`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Date Range</label>
                    <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7days">Last 7 days</SelectItem>
                        <SelectItem value="30days">Last 30 days</SelectItem>
                        <SelectItem value="90days">Last 90 days</SelectItem>
                        <SelectItem value="all">All messages</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">
                      Message limit per channel (optional)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g., 1000 (blank = all)"
                      value={messageLimit}
                      onChange={(e) => setMessageLimit(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={includeThreads}
                      onCheckedChange={(checked) => setIncludeThreads(!!checked)}
                    />
                    <span className="text-sm">Include thread replies</span>
                  </label>
                </CollapsibleContent>
              </Collapsible>

              {/* Info Notes */}
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Public channels will be auto-joined by the bot during import.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Only users who sent messages will be imported as placeholder profiles.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>File attachments will appear as [file name] in messages.</span>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          {importResult ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting || loading || selectedChannels.size === 0}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Importing...
                  </>
                ) : hasFilters ? (
                  "Import with Filters"
                ) : (
                  `Import ${selectedChannels.size} Channel${selectedChannels.size !== 1 ? "s" : ""}`
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
