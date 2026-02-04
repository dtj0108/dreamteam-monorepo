"use client"

import { useState, useCallback } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  FileSpreadsheet,
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { CSVUploader } from "@/components/import/csv-uploader"
import { LeadColumnMapper } from "@/components/import/lead-column-mapper"
import { LeadPreviewTable, type LeadWithDuplicate } from "@/components/import/lead-preview-table"
import {
  parseCSV,
  detectMultiContactLeadColumnMapping,
  transformToLeadsWithMultipleContacts,
  validateMultiContactLeadMapping,
  createEmptyMultiContactLeadMapping,
  type ParsedCSV,
  type MultiContactLeadColumnMapping,
  type DetectedMultiContactLeadMapping,
} from "@/lib/lead-csv-parser"
import type { LeadDuplicateCheckResult } from "@/lib/lead-duplicate-detector"

type ImportStep = "upload" | "map-columns" | "preview" | "importing" | "complete"

const STEPS: { key: ImportStep; label: string; icon: React.ReactNode }[] = [
  { key: "upload", label: "Upload CSV", icon: <Upload className="h-4 w-4" /> },
  { key: "map-columns", label: "Map Columns", icon: <FileSpreadsheet className="h-4 w-4" /> },
  { key: "preview", label: "Preview", icon: <Check className="h-4 w-4" /> },
]

interface LeadImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
}

export function LeadImportModal({
  open,
  onOpenChange,
  onImportComplete,
}: LeadImportModalProps) {
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload")

  // CSV data
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null)
  const [detectedMapping, setDetectedMapping] = useState<DetectedMultiContactLeadMapping | null>(null)
  const [mapping, setMapping] = useState<MultiContactLeadColumnMapping>(createEmptyMultiContactLeadMapping())
  const [leads, setLeads] = useState<LeadWithDuplicate[]>([])

  // Duplicate detection state
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [previewCollapsed, setPreviewCollapsed] = useState(true)
  const [previewExpanded, setPreviewExpanded] = useState(false)
  const [duplicateCount, setDuplicateCount] = useState(0)
  const [importDuplicates, setImportDuplicates] = useState(false)

  // Import state
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<{
    success: boolean
    imported: number
    failed: number
    skipped_duplicates?: number
    contacts_created?: number
    contacts_for_existing_leads?: number
    errors?: string[]
  } | null>(null)

  const resetState = useCallback(() => {
    setCurrentStep("upload")
    setParsedCSV(null)
    setDetectedMapping(null)
    setMapping(createEmptyMultiContactLeadMapping())
    setLeads([])
    setCheckingDuplicates(false)
    setPreviewCollapsed(true)
    setPreviewExpanded(false)
    setDuplicateCount(0)
    setImportDuplicates(false)
    setImporting(false)
    setImportProgress(0)
    setImportResult(null)
  }, [])

  const handleClose = useCallback(() => {
    onOpenChange(false)
    // Reset after animation
    setTimeout(resetState, 300)
  }, [onOpenChange, resetState])

  const handleFileSelect = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      setParsedCSV(parsed)

      // Auto-detect columns with multi-contact support
      const detected = detectMultiContactLeadColumnMapping(parsed.headers)
      setDetectedMapping(detected)

      // Set initial mapping from detected values
      setMapping({
        name: detected.name,
        website: detected.website,
        industry: detected.industry,
        status: detected.status,
        notes: detected.notes,
        address: detected.address,
        city: detected.city,
        state: detected.state,
        country: detected.country,
        postal_code: detected.postal_code,
        source: detected.source,
        contactSlots: detected.contactSlots,
      })

      setCurrentStep("map-columns")
    }
    reader.readAsText(file)
  }, [])

  const handleMappingComplete = useCallback(async () => {
    if (!parsedCSV) return

    // Transform CSV to leads with multi-contact support
    const parsedLeads = transformToLeadsWithMultipleContacts(parsedCSV.rows, parsedCSV.headers, mapping)

    // Check for duplicates
    setCheckingDuplicates(true)
    try {
      const response = await fetch("/api/leads/check-duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: parsedLeads.map((l) => ({ name: l.name, website: l.website })),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const results: LeadDuplicateCheckResult[] = data.results

        // Merge duplicate info with leads
        const leadsWithDuplicates: LeadWithDuplicate[] = parsedLeads.map((lead, index) => ({
          ...lead,
          duplicateInfo: results[index],
        }))

        setLeads(leadsWithDuplicates)
        setDuplicateCount(data.duplicateCount)
      } else {
        // If duplicate check fails, proceed without duplicate info
        setLeads(parsedLeads)
      }
    } catch (error) {
      console.error("Error checking duplicates:", error)
      setLeads(parsedLeads)
    } finally {
      setCheckingDuplicates(false)
      setCurrentStep("preview")
    }
  }, [parsedCSV, mapping])

  const handleImport = useCallback(async () => {
    setCurrentStep("importing")
    setImporting(true)
    setImportProgress(10)

    try {
      // Filter out invalid leads
      const validLeads = leads.filter((l) => l.isValid)

      // Prepare leads for import with contacts array
      const leadsToImport = validLeads.map((l) => ({
        name: l.name,
        website: l.website,
        industry: l.industry,
        status: l.status,
        notes: l.notes,
        address: l.address,
        city: l.city,
        state: l.state,
        country: l.country,
        postal_code: l.postal_code,
        source: l.source,
        // Use contacts array for multi-contact support
        contacts: l.contacts,
      }))

      setImportProgress(30)

      const response = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: leadsToImport,
          skip_duplicates: !importDuplicates,
        }),
      })

      setImportProgress(90)

      const result = await response.json()

      setImportResult({
        success: response.ok,
        imported: result.imported || 0,
        failed: result.failed || 0,
        skipped_duplicates: result.skipped_duplicates,
        contacts_created: result.contacts_created,
        contacts_for_existing_leads: result.contacts_for_existing_leads,
        errors: result.errors,
      })

      setImportProgress(100)
      setCurrentStep("complete")

      // Refresh parent list
      if (response.ok && result.imported > 0) {
        onImportComplete()
      }
    } catch (error) {
      console.error("Import error:", error)
      setImportResult({
        success: false,
        imported: 0,
        failed: leads.filter((l) => l.isValid).length,
        errors: ["An unexpected error occurred during import"],
      })
      setCurrentStep("complete")
    } finally {
      setImporting(false)
    }
  }, [leads, importDuplicates, onImportComplete])

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case "upload":
        return parsedCSV !== null
      case "map-columns":
        return validateMultiContactLeadMapping(mapping).valid
      case "preview":
        return leads.filter((l) => l.isValid).length > 0
      default:
        return false
    }
  }, [currentStep, parsedCSV, mapping, leads])

  const handleNext = useCallback(() => {
    switch (currentStep) {
      case "upload":
        setCurrentStep("map-columns")
        break
      case "map-columns":
        handleMappingComplete()
        break
      case "preview":
        handleImport()
        break
    }
  }, [currentStep, handleMappingComplete, handleImport])

  const handleBack = useCallback(() => {
    switch (currentStep) {
      case "map-columns":
        setCurrentStep("upload")
        break
      case "preview":
        setCurrentStep("map-columns")
        break
    }
  }, [currentStep])

  const handleRemoveLead = useCallback((index: number) => {
    setLeads((prevLeads) => prevLeads.filter((_, i) => i !== index))
  }, [])

  const getStepIndex = (step: ImportStep): number => {
    const index = STEPS.findIndex((s) => s.key === step)
    return index >= 0 ? index : 0
  }

  const currentStepIndex = getStepIndex(currentStep)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`max-h-[90vh] overflow-y-auto transition-all duration-200 ${
        currentStep === "preview" || currentStep === "importing" || currentStep === "complete"
          ? "max-w-5xl"
          : "max-w-2xl"
      }`}>
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import leads into your CRM
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator - Horizontal Tabs */}
        {currentStep !== "importing" && currentStep !== "complete" && (
          <div className="flex items-center border-b">
            {STEPS.map((step, index) => (
              <div
                key={step.key}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  index < currentStepIndex
                    ? "text-emerald-600 border-emerald-600 dark:text-emerald-400 dark:border-emerald-400"
                    : index === currentStepIndex
                      ? "text-primary border-primary"
                      : "text-muted-foreground border-transparent"
                }`}
              >
                {index < currentStepIndex ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span className={`flex items-center justify-center w-5 h-5 rounded-full border text-xs ${
                    index === currentStepIndex
                      ? "border-primary"
                      : "border-muted-foreground"
                  }`}>
                    {index + 1}
                  </span>
                )}
                <span>{step.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Step Content */}
        <div className="py-2">
          {currentStep === "upload" && (
            <CSVUploader onFileSelect={handleFileSelect} />
          )}

          {currentStep === "map-columns" && parsedCSV && detectedMapping && (
            <div className="space-y-3">
              {/* CSV Preview - Collapsible */}
              <div className="rounded-lg border bg-muted/30">
                <button
                  type="button"
                  onClick={() => setPreviewCollapsed(!previewCollapsed)}
                  className="w-full flex items-center justify-between p-2 text-sm"
                >
                  <span className="font-medium">CSV Preview</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {parsedCSV.headers.length} columns, {parsedCSV.rows.length} rows
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${previewCollapsed ? '' : 'rotate-180'}`} />
                  </div>
                </button>
                {!previewCollapsed && (
                  <div className="px-3 pb-3">
                    {parsedCSV.headers.length > 4 && (
                      <div className="flex justify-end mb-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewExpanded(!previewExpanded)
                          }}
                        >
                          {previewExpanded ? "Show fewer columns" : `Show all ${parsedCSV.headers.length} columns`}
                        </Button>
                      </div>
                    )}
                    <div className="overflow-x-auto max-w-full">
                      <table className="text-xs">
                        <thead>
                          <tr className="border-b">
                            {(previewExpanded ? parsedCSV.headers : parsedCSV.headers.slice(0, 4)).map((h, i) => (
                              <th key={i} className="text-left p-1.5 font-medium whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                            {!previewExpanded && parsedCSV.headers.length > 4 && (
                              <th className="text-left p-1.5 font-medium text-muted-foreground">
                                +{parsedCSV.headers.length - 4} more
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {parsedCSV.rows.slice(0, 2).map((row, i) => (
                            <tr key={i} className="border-b last:border-0">
                              {(previewExpanded ? row : row.slice(0, 4)).map((cell, j) => (
                                <td key={j} className="p-1.5 text-muted-foreground truncate max-w-[120px]">
                                  {cell || "-"}
                                </td>
                              ))}
                              {!previewExpanded && row.length > 4 && (
                                <td className="p-1.5 text-muted-foreground">...</td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <LeadColumnMapper
                headers={parsedCSV.headers}
                detectedMapping={detectedMapping}
                mapping={mapping}
                onMappingChange={setMapping}
              />
            </div>
          )}

          {currentStep === "preview" && (
            <div className="space-y-4">
              {checkingDuplicates ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Checking for duplicates...</p>
                </div>
              ) : (
                <>
                  <LeadPreviewTable leads={leads} onRemove={handleRemoveLead} />

                  {duplicateCount > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg border">
                      <Checkbox
                        id="import-duplicates"
                        checked={importDuplicates}
                        onCheckedChange={(checked) => setImportDuplicates(checked === true)}
                      />
                      <Label htmlFor="import-duplicates" className="text-sm cursor-pointer">
                        Import duplicates anyway ({duplicateCount} found)
                      </Label>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {currentStep === "importing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Importing leads...</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Please wait while we import your leads
                </p>
              </div>
              <Progress value={importProgress} className="w-64" />
            </div>
          )}

          {currentStep === "complete" && importResult && (
            <div className="space-y-6 py-4">
              {importResult.success ? (
                <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <AlertTitle className="text-emerald-700 dark:text-emerald-400">
                    Import Complete!
                  </AlertTitle>
                  <AlertDescription className="text-emerald-600 dark:text-emerald-300">
                    Successfully imported {importResult.imported} lead{importResult.imported !== 1 ? "s" : ""}.
                    {importResult.contacts_created ? ` Created ${importResult.contacts_created} contact${importResult.contacts_created !== 1 ? "s" : ""}.` : ""}
                    {importResult.skipped_duplicates ? ` Skipped ${importResult.skipped_duplicates} duplicate${importResult.skipped_duplicates !== 1 ? "s" : ""}.` : ""}
                    {importResult.failed > 0 && ` Failed to import ${importResult.failed}.`}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-5 w-5" />
                  <AlertTitle>Import Failed</AlertTitle>
                  <AlertDescription>
                    {importResult.errors?.[0] || "An error occurred during import."}
                  </AlertDescription>
                </Alert>
              )}

              {/* Stats */}
              <div className={`grid gap-4 ${importResult.contacts_created ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{importResult.imported}</p>
                  <p className="text-sm text-muted-foreground">Leads</p>
                </div>
                {importResult.contacts_created !== undefined && importResult.contacts_created > 0 && (
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{importResult.contacts_created}</p>
                    <p className="text-sm text-muted-foreground">Contacts</p>
                  </div>
                )}
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{importResult.skipped_duplicates || 0}</p>
                  <p className="text-sm text-muted-foreground">Skipped</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold text-rose-600">{importResult.failed}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={resetState}>
                  Import More
                </Button>
                <Button onClick={handleClose}>
                  View Leads
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        {currentStep !== "importing" && currentStep !== "complete" && (
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === "upload"}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed() || checkingDuplicates}
            >
              {checkingDuplicates ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : currentStep === "preview" ? (
                <>
                  Import {leads.filter((l) => l.isValid).length} Leads
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
