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
import { Label } from "@dreamteam/ui/label"
import { Loader2, CheckCircle, AlertCircle, Users, Building2, DollarSign, ChevronDown, Filter } from "lucide-react"
import { CRM_PROVIDERS, type CRMProvider, type CRMDataCounts, type CRMImportResult, type CRMImportFilters } from "@/types/crm"

interface CRMImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: CRMProvider | null
  workspaceId: string
  onSuccess: () => void
}

export function CRMImportModal({
  open,
  onOpenChange,
  provider,
  workspaceId,
  onSuccess,
}: CRMImportModalProps) {
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState<CRMDataCounts | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Import options
  const [importLeads, setImportLeads] = useState(true)
  const [importContacts, setImportContacts] = useState(true)
  const [importOpportunities, setImportOpportunities] = useState(true)
  const [skipDuplicates, setSkipDuplicates] = useState(true)

  // Filter options
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [createdAfter, setCreatedAfter] = useState<string>("")
  const [importLimit, setImportLimit] = useState<string>("")
  const [includeActiveOpps, setIncludeActiveOpps] = useState(true)
  const [includeWonOpps, setIncludeWonOpps] = useState(true)
  const [includeLostOpps, setIncludeLostOpps] = useState(false)

  // Import state
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<CRMImportResult | null>(null)

  const config = provider ? CRM_PROVIDERS[provider] : null

  // Fetch counts when modal opens
  useEffect(() => {
    if (open && provider) {
      fetchCounts()
    }
  }, [open, provider])

  const fetchCounts = async () => {
    if (!provider) return

    setLoading(true)
    setError(null)
    setCounts(null)

    try {
      const res = await fetch(`/api/integrations/crm/${provider}/data?workspaceId=${workspaceId}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to fetch data")
        return
      }

      setCounts(data)
    } catch {
      setError("Failed to connect to CRM")
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!provider) return

    setIsImporting(true)
    setError(null)

    try {
      // Build filters object
      const filters: CRMImportFilters = {}
      if (createdAfter) {
        filters.createdAfter = createdAfter
      }
      if (importLimit && parseInt(importLimit) > 0) {
        filters.limit = parseInt(importLimit)
      }
      // Build opportunity status filter
      const oppStatuses: string[] = []
      if (includeActiveOpps) oppStatuses.push("active")
      if (includeWonOpps) oppStatuses.push("won")
      if (includeLostOpps) oppStatuses.push("lost")
      if (oppStatuses.length > 0 && oppStatuses.length < 3) {
        filters.opportunityStatuses = oppStatuses
      }

      const res = await fetch(`/api/integrations/crm/${provider}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          options: {
            leads: importLeads,
            contacts: importContacts,
            opportunities: importOpportunities,
            skipDuplicates,
            filters: Object.keys(filters).length > 0 ? filters : undefined,
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Check for errors array (from catch block) or error string (from early returns)
        const errorMessage = data.errors?.[0] || data.error || "Import failed"
        setError(errorMessage)
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
    setLoading(true)
    setCounts(null)
    setError(null)
    setImportResult(null)
    setImportLeads(true)
    setImportContacts(true)
    setImportOpportunities(true)
    // Reset filters
    setFiltersOpen(false)
    setCreatedAfter("")
    setImportLimit("")
    setIncludeActiveOpps(true)
    setIncludeWonOpps(true)
    setIncludeLostOpps(false)
    onOpenChange(false)
  }

  // Calculate total, accounting for limit if set
  // Note: If contacts are embedded (contactsNote present), we count them as "included" even if count is 0
  const limit = importLimit ? parseInt(importLimit) : 0
  const contactsToCount = importContacts ? (counts?.contacts || (counts?.contactsNote ? 1 : 0)) : 0
  const rawTotal =
    (importLeads && counts?.leads ? counts.leads : 0) +
    contactsToCount +
    (importOpportunities && counts?.opportunities ? counts.opportunities : 0)
  const totalSelected = limit > 0 ? Math.min(rawTotal, limit) : rawTotal
  const hasFilters = createdAfter || importLimit || !includeActiveOpps || !includeWonOpps || includeLostOpps

  if (!provider || !config) return null

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
            Import from {config.name}
          </DialogTitle>
          <DialogDescription>
            Select what data to import into DreamTeam.
          </DialogDescription>
        </DialogHeader>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center gap-3 py-6">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive text-center">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchCounts}>
              Try Again
            </Button>
          </div>
        )}

        {/* Import Result */}
        {importResult && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Import Complete</span>
            </div>

            <div className="space-y-2 text-sm">
              {importResult.leads && (
                <div className="flex justify-between">
                  <span>Leads</span>
                  <span className="text-muted-foreground">
                    {importResult.leads.imported} imported
                    {importResult.leads.skipped > 0 && `, ${importResult.leads.skipped} skipped`}
                  </span>
                </div>
              )}
              {importResult.contacts && (
                <div className="flex justify-between">
                  <span>Contacts</span>
                  <span className="text-muted-foreground">
                    {importResult.contacts.imported} imported
                    {importResult.contacts.skipped > 0 && `, ${importResult.contacts.skipped} skipped`}
                  </span>
                </div>
              )}
              {importResult.opportunities && (
                <div className="flex justify-between">
                  <span>Opportunities</span>
                  <span className="text-muted-foreground">
                    {importResult.opportunities.imported} imported
                    {importResult.opportunities.skipped > 0 && `, ${importResult.opportunities.skipped} skipped`}
                  </span>
                </div>
              )}
            </div>

            {importResult.errors.length > 0 && (
              <div className="rounded-lg bg-destructive/10 p-3">
                <p className="text-sm font-medium text-destructive mb-1">
                  {importResult.errors.length} errors occurred:
                </p>
                <ul className="text-xs text-destructive/80 list-disc list-inside">
                  {importResult.errors.slice(0, 3).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {importResult.errors.length > 3 && (
                    <li>...and {importResult.errors.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Selection Options */}
        {counts && !importResult && !loading && (
          <div className="space-y-4">
            <div className="space-y-3">
              {/* Leads */}
              <label className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={importLeads}
                    onCheckedChange={(checked) => setImportLeads(!!checked)}
                    disabled={isImporting || (counts.leads ?? 0) === 0}
                  />
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Leads</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {(counts.leads ?? 0).toLocaleString()} found
                </span>
              </label>

              {/* Contacts */}
              <label className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={importContacts}
                    onCheckedChange={(checked) => setImportContacts(!!checked)}
                    disabled={isImporting || ((counts.contacts ?? 0) === 0 && !counts.contactsNote)}
                  />
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium">Contacts</span>
                    {counts.contactsNote && (
                      <p className="text-xs text-muted-foreground">{counts.contactsNote}</p>
                    )}
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">
                  {counts.contactsNote ? "Embedded" : `${(counts.contacts ?? 0).toLocaleString()} found`}
                </span>
              </label>

              {/* Opportunities */}
              <label className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={importOpportunities}
                    onCheckedChange={(checked) => setImportOpportunities(!!checked)}
                    disabled={isImporting || (counts.opportunities ?? 0) === 0}
                  />
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Opportunities</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {(counts.opportunities ?? 0).toLocaleString()} found
                </span>
              </label>
            </div>

            {/* Skip Duplicates Option */}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={skipDuplicates}
                onCheckedChange={(checked) => setSkipDuplicates(!!checked)}
                disabled={isImporting}
              />
              <span>Skip duplicate leads (matching name or website)</span>
            </label>

            {/* Filters Section */}
            <div className="border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between p-2 h-auto"
                disabled={isImporting}
                onClick={() => setFiltersOpen(!filtersOpen)}
                type="button"
              >
                <div className="flex items-center gap-2 text-sm">
                  <Filter className="h-4 w-4" />
                  <span>Filters</span>
                  {hasFilters && (
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  )}
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
              </Button>

              {filtersOpen && (
                <div className="pt-3 space-y-4">
                  {/* Date Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="createdAfter" className="text-sm">
                      Only import records created after
                    </Label>
                    <Input
                      id="createdAfter"
                      type="date"
                      value={createdAfter}
                      onChange={(e) => setCreatedAfter(e.target.value)}
                      disabled={isImporting}
                      className="w-full"
                    />
                  </div>

                  {/* Limit Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="importLimit" className="text-sm">
                      Maximum records to import (leave empty for all)
                    </Label>
                    <Input
                      id="importLimit"
                      type="number"
                      placeholder="e.g., 1000"
                      value={importLimit}
                      onChange={(e) => setImportLimit(e.target.value)}
                      disabled={isImporting}
                      min={1}
                      className="w-full"
                    />
                  </div>

                  {/* Opportunity Status Filter */}
                  {importOpportunities && (counts.opportunities ?? 0) > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">Opportunity status to include</Label>
                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={includeActiveOpps}
                            onCheckedChange={(checked) => setIncludeActiveOpps(!!checked)}
                            disabled={isImporting}
                          />
                          <span>Active</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={includeWonOpps}
                            onCheckedChange={(checked) => setIncludeWonOpps(!!checked)}
                            disabled={isImporting}
                          />
                          <span>Won</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={includeLostOpps}
                            onCheckedChange={(checked) => setIncludeLostOpps(!!checked)}
                            disabled={isImporting}
                          />
                          <span>Lost</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filter summary when filters are active */}
        {hasFilters && counts && !importResult && !loading && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 mx-1">
            <span className="font-medium">Filters active:</span>
            {createdAfter && <span> Created after {new Date(createdAfter).toLocaleDateString()}</span>}
            {importLimit && <span> · Max {parseInt(importLimit).toLocaleString()} records</span>}
            {(!includeActiveOpps || !includeWonOpps || includeLostOpps) && (
              <span> · Opportunity status filtered</span>
            )}
          </div>
        )}

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
                disabled={isImporting || loading || !counts || totalSelected === 0}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Importing...
                  </>
                ) : hasFilters ? (
                  `Import with Filters`
                ) : (
                  `Import ${totalSelected.toLocaleString()} Records`
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
