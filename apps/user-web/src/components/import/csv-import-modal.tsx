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
  Building2,
  User,
  Briefcase,
  ListTodo,
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
import { GenericColumnMapper, type FieldConfig } from "@/components/import/generic-column-mapper"
import { LeadColumnMapper } from "@/components/import/lead-column-mapper"
import { LeadPreviewTable, type LeadWithDuplicate } from "@/components/import/lead-preview-table"
import {
  GenericPreviewTable,
  type ParsedContactEntity,
  type ParsedOpportunityEntity,
  type ParsedTaskEntity,
} from "@/components/import/generic-preview-table"
import {
  parseCSV,
  detectLeadColumnMapping,
  transformToLeads,
  validateLeadMapping,
  createEmptyLeadMapping,
  type ParsedCSV,
  type LeadColumnMapping,
  type DetectedLeadMapping,
} from "@/lib/lead-csv-parser"
import {
  detectContactColumnMapping,
  transformToContacts,
  validateContactMapping,
  createEmptyContactMapping,
  type ContactColumnMapping,
  type DetectedContactMapping,
} from "@/lib/contact-csv-parser"
import {
  detectOpportunityColumnMapping,
  transformToOpportunities,
  validateOpportunityMapping,
  createEmptyOpportunityMapping,
  type OpportunityColumnMapping,
  type DetectedOpportunityMapping,
} from "@/lib/opportunity-csv-parser"
import {
  detectTaskColumnMapping,
  transformToTasks,
  validateTaskMapping,
  createEmptyTaskMapping,
  type TaskColumnMapping,
  type DetectedTaskMapping,
} from "@/lib/task-csv-parser"
import {
  matchLeadsByName,
  getUniqueLeadNames,
  buildLeadMatchMap,
  type LeadMatchResult,
} from "@/lib/lead-matcher"
import type { LeadDuplicateCheckResult } from "@/lib/lead-duplicate-detector"

type DataType = "leads" | "contacts" | "opportunities" | "tasks"
type ImportStep = "select-type" | "upload" | "map-columns" | "preview" | "importing" | "complete"

const DATA_TYPES: { key: DataType; label: string; description: string; icon: typeof Building2 }[] = [
  { key: "leads", label: "Leads", description: "Companies and organizations you want to track", icon: Building2 },
  { key: "contacts", label: "Contacts", description: "People associated with your leads", icon: User },
  { key: "opportunities", label: "Opportunities", description: "Deals and sales opportunities", icon: Briefcase },
  { key: "tasks", label: "Tasks", description: "To-do items linked to leads", icon: ListTodo },
]

const STEPS_WITH_TYPE: { key: ImportStep; label: string; icon: React.ReactNode }[] = [
  { key: "select-type", label: "Data Type", icon: <FileSpreadsheet className="h-4 w-4" /> },
  { key: "upload", label: "Upload CSV", icon: <Upload className="h-4 w-4" /> },
  { key: "map-columns", label: "Map Columns", icon: <FileSpreadsheet className="h-4 w-4" /> },
  { key: "preview", label: "Preview", icon: <Check className="h-4 w-4" /> },
]

// Field configurations for each entity type
const CONTACT_FIELDS: FieldConfig[] = [
  { key: 'lead_name', label: 'Company/Lead Name', description: 'The company or lead this contact belongs to (required)', required: true, group: 'required' },
  { key: 'first_name', label: 'First Name', description: 'Contact\'s first name (required)', required: true, group: 'required' },
  { key: 'last_name', label: 'Last Name', description: 'Contact\'s last name', required: false, group: 'primary' },
  { key: 'email', label: 'Email', description: 'Contact\'s email address', required: false, group: 'primary' },
  { key: 'phone', label: 'Phone', description: 'Contact\'s phone number', required: false, group: 'primary' },
  { key: 'title', label: 'Job Title', description: 'Contact\'s job title or position', required: false, group: 'primary' },
  { key: 'notes', label: 'Notes', description: 'Additional notes about the contact', required: false, group: 'other' },
]

const OPPORTUNITY_FIELDS: FieldConfig[] = [
  { key: 'lead_name', label: 'Company/Lead Name', description: 'The company or lead this opportunity belongs to (required)', required: true, group: 'required' },
  { key: 'name', label: 'Deal Name', description: 'The name of the opportunity or deal (required)', required: true, group: 'required' },
  { key: 'value', label: 'Value', description: 'Monetary value of the deal', required: false, group: 'primary' },
  { key: 'probability', label: 'Probability', description: 'Win probability (0-100%)', required: false, group: 'primary' },
  { key: 'expected_close_date', label: 'Close Date', description: 'Expected closing date', required: false, group: 'primary' },
  { key: 'status', label: 'Status', description: 'Deal status (active, won, lost)', required: false, group: 'primary' },
  { key: 'notes', label: 'Notes', description: 'Additional notes', required: false, group: 'other' },
]

const TASK_FIELDS: FieldConfig[] = [
  { key: 'lead_name', label: 'Company/Lead Name', description: 'The company or lead this task belongs to (required)', required: true, group: 'required' },
  { key: 'title', label: 'Task Title', description: 'The title or name of the task (required)', required: true, group: 'required' },
  { key: 'description', label: 'Description', description: 'Task description or details', required: false, group: 'primary' },
  { key: 'due_date', label: 'Due Date', description: 'When the task is due', required: false, group: 'primary' },
]

interface CSVImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
  defaultDataType?: DataType
}

export function CSVImportModal({
  open,
  onOpenChange,
  onImportComplete,
  defaultDataType,
}: CSVImportModalProps) {
  const [currentStep, setCurrentStep] = useState<ImportStep>(defaultDataType ? "upload" : "select-type")
  const [dataType, setDataType] = useState<DataType>(defaultDataType || "leads")

  // CSV data
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null)

  // Lead-specific state
  const [detectedLeadMapping, setDetectedLeadMapping] = useState<DetectedLeadMapping | null>(null)
  const [leadMapping, setLeadMapping] = useState<LeadColumnMapping>(createEmptyLeadMapping())
  const [leads, setLeads] = useState<LeadWithDuplicate[]>([])
  const [duplicateCount, setDuplicateCount] = useState(0)
  const [importDuplicates, setImportDuplicates] = useState(false)

  // Contact-specific state
  const [detectedContactMapping, setDetectedContactMapping] = useState<DetectedContactMapping | null>(null)
  const [contactMapping, setContactMapping] = useState<ContactColumnMapping>(createEmptyContactMapping())
  const [contacts, setContacts] = useState<ParsedContactEntity[]>([])

  // Opportunity-specific state
  const [detectedOpportunityMapping, setDetectedOpportunityMapping] = useState<DetectedOpportunityMapping | null>(null)
  const [opportunityMapping, setOpportunityMapping] = useState<OpportunityColumnMapping>(createEmptyOpportunityMapping())
  const [opportunities, setOpportunities] = useState<ParsedOpportunityEntity[]>([])

  // Task-specific state
  const [detectedTaskMapping, setDetectedTaskMapping] = useState<DetectedTaskMapping | null>(null)
  const [taskMapping, setTaskMapping] = useState<TaskColumnMapping>(createEmptyTaskMapping())
  const [tasks, setTasks] = useState<ParsedTaskEntity[]>([])

  // Shared state
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [unmatchedCount, setUnmatchedCount] = useState(0)

  // Import state
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<{
    success: boolean
    imported: number
    failed: number
    skipped_duplicates?: number
    skipped_unmatched?: number
    errors?: string[]
    unmatched_leads?: string[]
  } | null>(null)

  const resetState = useCallback(() => {
    setCurrentStep(defaultDataType ? "upload" : "select-type")
    setDataType(defaultDataType || "leads")
    setParsedCSV(null)
    setDetectedLeadMapping(null)
    setLeadMapping(createEmptyLeadMapping())
    setLeads([])
    setDuplicateCount(0)
    setImportDuplicates(false)
    setDetectedContactMapping(null)
    setContactMapping(createEmptyContactMapping())
    setContacts([])
    setDetectedOpportunityMapping(null)
    setOpportunityMapping(createEmptyOpportunityMapping())
    setOpportunities([])
    setDetectedTaskMapping(null)
    setTaskMapping(createEmptyTaskMapping())
    setTasks([])
    setCheckingDuplicates(false)
    setUnmatchedCount(0)
    setImporting(false)
    setImportProgress(0)
    setImportResult(null)
  }, [defaultDataType])

  const handleClose = useCallback(() => {
    onOpenChange(false)
    setTimeout(resetState, 300)
  }, [onOpenChange, resetState])

  const handleFileSelect = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      setParsedCSV(parsed)

      // Auto-detect columns based on data type
      if (dataType === "leads") {
        const detected = detectLeadColumnMapping(parsed.headers)
        setDetectedLeadMapping(detected)
        setLeadMapping({
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
        })
      } else if (dataType === "contacts") {
        const detected = detectContactColumnMapping(parsed.headers)
        setDetectedContactMapping(detected)
        setContactMapping({
          lead_name: detected.lead_name,
          first_name: detected.first_name,
          last_name: detected.last_name,
          email: detected.email,
          phone: detected.phone,
          title: detected.title,
          notes: detected.notes,
        })
      } else if (dataType === "opportunities") {
        const detected = detectOpportunityColumnMapping(parsed.headers)
        setDetectedOpportunityMapping(detected)
        setOpportunityMapping({
          lead_name: detected.lead_name,
          name: detected.name,
          value: detected.value,
          probability: detected.probability,
          expected_close_date: detected.expected_close_date,
          status: detected.status,
          notes: detected.notes,
        })
      } else if (dataType === "tasks") {
        const detected = detectTaskColumnMapping(parsed.headers)
        setDetectedTaskMapping(detected)
        setTaskMapping({
          lead_name: detected.lead_name,
          title: detected.title,
          description: detected.description,
          due_date: detected.due_date,
        })
      }

      setCurrentStep("map-columns")
    }
    reader.readAsText(file)
  }, [dataType])

  const handleMappingComplete = useCallback(async () => {
    if (!parsedCSV) return

    setCheckingDuplicates(true)

    try {
      if (dataType === "leads") {
        // Lead import - check for duplicates
        const parsedLeads = transformToLeads(parsedCSV.rows, parsedCSV.headers, leadMapping)

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
          const leadsWithDuplicates: LeadWithDuplicate[] = parsedLeads.map((lead, index) => ({
            ...lead,
            duplicateInfo: results[index],
          }))
          setLeads(leadsWithDuplicates)
          setDuplicateCount(data.duplicateCount)
        } else {
          setLeads(parsedLeads)
        }
      } else {
        // For contacts, opportunities, tasks - match lead names
        const response = await fetch("/api/leads?limit=10000", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })

        let existingLeads: { id: string; name: string }[] = []
        if (response.ok) {
          const data = await response.json()
          existingLeads = (data.leads || data || []).map((l: { id: string; name: string }) => ({
            id: l.id,
            name: l.name || '',
          }))
        }

        if (dataType === "contacts") {
          const parsedContacts = transformToContacts(parsedCSV.rows, parsedCSV.headers, contactMapping)
          const uniqueLeadNames = getUniqueLeadNames(parsedContacts.map((c) => c.lead_name))
          const matchResults = matchLeadsByName(uniqueLeadNames, existingLeads, 85)
          const matchMap = buildLeadMatchMap(matchResults)

          const contactsWithMatches: ParsedContactEntity[] = parsedContacts.map((contact) => ({
            ...contact,
            leadMatchResult: matchMap.get(contact.lead_name?.toLowerCase().trim() || ''),
          }))

          setContacts(contactsWithMatches)
          setUnmatchedCount(contactsWithMatches.filter((c) => !c.leadMatchResult?.matchedLead).length)
        } else if (dataType === "opportunities") {
          const parsedOpportunities = transformToOpportunities(parsedCSV.rows, parsedCSV.headers, opportunityMapping)
          const uniqueLeadNames = getUniqueLeadNames(parsedOpportunities.map((o) => o.lead_name))
          const matchResults = matchLeadsByName(uniqueLeadNames, existingLeads, 85)
          const matchMap = buildLeadMatchMap(matchResults)

          const opportunitiesWithMatches: ParsedOpportunityEntity[] = parsedOpportunities.map((opp) => ({
            ...opp,
            leadMatchResult: matchMap.get(opp.lead_name?.toLowerCase().trim() || ''),
          }))

          setOpportunities(opportunitiesWithMatches)
          setUnmatchedCount(opportunitiesWithMatches.filter((o) => !o.leadMatchResult?.matchedLead).length)
        } else if (dataType === "tasks") {
          const parsedTasks = transformToTasks(parsedCSV.rows, parsedCSV.headers, taskMapping)
          const uniqueLeadNames = getUniqueLeadNames(parsedTasks.map((t) => t.lead_name))
          const matchResults = matchLeadsByName(uniqueLeadNames, existingLeads, 85)
          const matchMap = buildLeadMatchMap(matchResults)

          const tasksWithMatches: ParsedTaskEntity[] = parsedTasks.map((task) => ({
            ...task,
            leadMatchResult: matchMap.get(task.lead_name?.toLowerCase().trim() || ''),
          }))

          setTasks(tasksWithMatches)
          setUnmatchedCount(tasksWithMatches.filter((t) => !t.leadMatchResult?.matchedLead).length)
        }
      }
    } catch (error) {
      console.error("Error during mapping:", error)
      // Continue with what we have
      if (dataType === "leads") {
        setLeads(transformToLeads(parsedCSV.rows, parsedCSV.headers, leadMapping))
      } else if (dataType === "contacts") {
        setContacts(transformToContacts(parsedCSV.rows, parsedCSV.headers, contactMapping))
      } else if (dataType === "opportunities") {
        setOpportunities(transformToOpportunities(parsedCSV.rows, parsedCSV.headers, opportunityMapping))
      } else if (dataType === "tasks") {
        setTasks(transformToTasks(parsedCSV.rows, parsedCSV.headers, taskMapping))
      }
    } finally {
      setCheckingDuplicates(false)
      setCurrentStep("preview")
    }
  }, [parsedCSV, dataType, leadMapping, contactMapping, opportunityMapping, taskMapping])

  const handleImport = useCallback(async () => {
    setCurrentStep("importing")
    setImporting(true)
    setImportProgress(10)

    try {
      let apiEndpoint = ""
      let payload: unknown = {}

      if (dataType === "leads") {
        apiEndpoint = "/api/leads/import"
        const validLeads = leads.filter((l) => l.isValid)
        payload = {
          leads: validLeads.map((l) => ({
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
          })),
          skip_duplicates: !importDuplicates,
        }
      } else if (dataType === "contacts") {
        apiEndpoint = "/api/contacts/import"
        const validContacts = contacts.filter((c) => c.isValid && c.leadMatchResult?.matchedLead)
        payload = {
          contacts: validContacts.map((c) => ({
            lead_name: c.lead_name,
            first_name: c.first_name,
            last_name: c.last_name,
            email: c.email,
            phone: c.phone,
            title: c.title,
            notes: c.notes,
          })),
        }
      } else if (dataType === "opportunities") {
        apiEndpoint = "/api/opportunities/import"
        const validOpportunities = opportunities.filter((o) => o.isValid && o.leadMatchResult?.matchedLead)
        payload = {
          opportunities: validOpportunities.map((o) => ({
            lead_name: o.lead_name,
            name: o.name,
            value: o.value,
            probability: o.probability,
            expected_close_date: o.expected_close_date,
            status: o.status,
            notes: o.notes,
          })),
        }
      } else if (dataType === "tasks") {
        apiEndpoint = "/api/tasks/import"
        const validTasks = tasks.filter((t) => t.isValid && t.leadMatchResult?.matchedLead)
        payload = {
          tasks: validTasks.map((t) => ({
            lead_name: t.lead_name,
            title: t.title,
            description: t.description,
            due_date: t.due_date,
          })),
        }
      }

      setImportProgress(30)

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      setImportProgress(90)

      const result = await response.json()

      setImportResult({
        success: response.ok,
        imported: result.imported || 0,
        failed: result.failed || 0,
        skipped_duplicates: result.skipped_duplicates,
        skipped_unmatched: result.skipped_unmatched,
        errors: result.errors,
        unmatched_leads: result.unmatched_leads,
      })

      setImportProgress(100)
      setCurrentStep("complete")

      if (response.ok && result.imported > 0) {
        onImportComplete()
      }
    } catch (error) {
      console.error("Import error:", error)
      const totalItems = dataType === "leads" ? leads.filter((l) => l.isValid).length
        : dataType === "contacts" ? contacts.filter((c) => c.isValid).length
        : dataType === "opportunities" ? opportunities.filter((o) => o.isValid).length
        : tasks.filter((t) => t.isValid).length

      setImportResult({
        success: false,
        imported: 0,
        failed: totalItems,
        errors: ["An unexpected error occurred during import"],
      })
      setCurrentStep("complete")
    } finally {
      setImporting(false)
    }
  }, [dataType, leads, contacts, opportunities, tasks, importDuplicates, onImportComplete])

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case "select-type":
        return true
      case "upload":
        return parsedCSV !== null
      case "map-columns":
        if (dataType === "leads") return validateLeadMapping(leadMapping).valid
        if (dataType === "contacts") return validateContactMapping(contactMapping).valid
        if (dataType === "opportunities") return validateOpportunityMapping(opportunityMapping).valid
        if (dataType === "tasks") return validateTaskMapping(taskMapping).valid
        return false
      case "preview":
        if (dataType === "leads") return leads.filter((l) => l.isValid).length > 0
        if (dataType === "contacts") return contacts.filter((c) => c.isValid && c.leadMatchResult?.matchedLead).length > 0
        if (dataType === "opportunities") return opportunities.filter((o) => o.isValid && o.leadMatchResult?.matchedLead).length > 0
        if (dataType === "tasks") return tasks.filter((t) => t.isValid && t.leadMatchResult?.matchedLead).length > 0
        return false
      default:
        return false
    }
  }, [currentStep, parsedCSV, dataType, leadMapping, contactMapping, opportunityMapping, taskMapping, leads, contacts, opportunities, tasks])

  const handleNext = useCallback(() => {
    switch (currentStep) {
      case "select-type":
        setCurrentStep("upload")
        break
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
      case "upload":
        if (!defaultDataType) setCurrentStep("select-type")
        break
      case "map-columns":
        setCurrentStep("upload")
        break
      case "preview":
        setCurrentStep("map-columns")
        break
    }
  }, [currentStep, defaultDataType])

  const getStepIndex = (step: ImportStep): number => {
    const index = STEPS_WITH_TYPE.findIndex((s) => s.key === step)
    return index >= 0 ? index : 0
  }

  const currentStepIndex = getStepIndex(currentStep)
  const dataTypeInfo = DATA_TYPES.find((t) => t.key === dataType)

  const getValidCount = () => {
    if (dataType === "leads") return leads.filter((l) => l.isValid).length
    if (dataType === "contacts") return contacts.filter((c) => c.isValid && c.leadMatchResult?.matchedLead).length
    if (dataType === "opportunities") return opportunities.filter((o) => o.isValid && o.leadMatchResult?.matchedLead).length
    if (dataType === "tasks") return tasks.filter((t) => t.isValid && t.leadMatchResult?.matchedLead).length
    return 0
  }

  // Determine modal width based on current step
  const getModalWidth = () => {
    if (currentStep === "select-type" || currentStep === "upload") return "max-w-lg"
    if (currentStep === "importing" || currentStep === "complete") return "max-w-md"
    return "max-w-3xl" // map-columns and preview need more space
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`${getModalWidth()} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>Import {dataTypeInfo?.label || 'Data'} from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import {dataTypeInfo?.label.toLowerCase() || 'data'} into your CRM
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator - Horizontal Tabs */}
        {currentStep !== "importing" && currentStep !== "complete" && (
          <div className="flex items-center border-b overflow-x-auto">
            {STEPS_WITH_TYPE.filter((s) => defaultDataType ? s.key !== "select-type" : true).map((step, index) => {
              const actualIndex = defaultDataType ? index : index
              const adjustedStepIndex = defaultDataType && currentStepIndex > 0 ? currentStepIndex - 1 : currentStepIndex
              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                    actualIndex < adjustedStepIndex
                      ? "text-emerald-600 border-emerald-600 dark:text-emerald-400 dark:border-emerald-400"
                      : actualIndex === adjustedStepIndex
                        ? "text-primary border-primary"
                        : "text-muted-foreground border-transparent"
                  }`}
                >
                  {actualIndex < adjustedStepIndex ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <span className={`flex items-center justify-center w-5 h-5 rounded-full border text-xs shrink-0 ${
                      actualIndex === adjustedStepIndex
                        ? "border-primary"
                        : "border-muted-foreground"
                    }`}>
                      {actualIndex + 1}
                    </span>
                  )}
                  <span>{step.label}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Step Content */}
        <div className="py-3">
          {currentStep === "select-type" && (
            <div className="grid grid-cols-2 gap-3">
              {DATA_TYPES.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.key}
                    onClick={() => setDataType(type.key)}
                    className={`flex flex-col items-start gap-1.5 p-3 rounded-lg border-2 text-left transition-colors ${
                      dataType === type.key
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/50"
                    }`}
                  >
                    <div className={`p-1.5 rounded-md ${dataType === type.key ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {currentStep === "upload" && (
            <CSVUploader onFileSelect={handleFileSelect} />
          )}

          {currentStep === "map-columns" && parsedCSV && (
            <div className="space-y-4">
              {/* CSV Preview */}
              <div className="rounded-lg border p-4 bg-muted/30">
                <h4 className="text-sm font-medium mb-2">CSV Preview (first 3 rows)</h4>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="border-b">
                        {parsedCSV.headers.map((h, i) => (
                          <th key={i} className="text-left p-2 font-medium">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedCSV.rows.slice(0, 3).map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          {row.map((cell, j) => (
                            <td key={j} className="p-2 text-muted-foreground truncate max-w-[150px]">
                              {cell || "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Column Mapper */}
              {dataType === "leads" && detectedLeadMapping && (
                <LeadColumnMapper
                  headers={parsedCSV.headers}
                  detectedMapping={detectedLeadMapping}
                  mapping={leadMapping}
                  onMappingChange={setLeadMapping}
                />
              )}
              {dataType === "contacts" && detectedContactMapping && (
                <GenericColumnMapper
                  headers={parsedCSV.headers}
                  detectedMapping={detectedContactMapping}
                  mapping={contactMapping}
                  onMappingChange={setContactMapping}
                  fieldConfig={CONTACT_FIELDS}
                  title="Map Contact Columns"
                />
              )}
              {dataType === "opportunities" && detectedOpportunityMapping && (
                <GenericColumnMapper
                  headers={parsedCSV.headers}
                  detectedMapping={detectedOpportunityMapping}
                  mapping={opportunityMapping}
                  onMappingChange={setOpportunityMapping}
                  fieldConfig={OPPORTUNITY_FIELDS}
                  title="Map Opportunity Columns"
                />
              )}
              {dataType === "tasks" && detectedTaskMapping && (
                <GenericColumnMapper
                  headers={parsedCSV.headers}
                  detectedMapping={detectedTaskMapping}
                  mapping={taskMapping}
                  onMappingChange={setTaskMapping}
                  fieldConfig={TASK_FIELDS}
                  title="Map Task Columns"
                />
              )}
            </div>
          )}

          {currentStep === "preview" && (
            <div className="space-y-4">
              {checkingDuplicates ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {dataType === "leads" ? "Checking for duplicates..." : "Matching to existing leads..."}
                  </p>
                </div>
              ) : (
                <>
                  {dataType === "leads" && <LeadPreviewTable leads={leads} />}
                  {dataType === "contacts" && (
                    <GenericPreviewTable entities={contacts} entityType="contact" />
                  )}
                  {dataType === "opportunities" && (
                    <GenericPreviewTable entities={opportunities} entityType="opportunity" />
                  )}
                  {dataType === "tasks" && (
                    <GenericPreviewTable entities={tasks} entityType="task" />
                  )}

                  {dataType === "leads" && duplicateCount > 0 && (
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
                <h3 className="text-lg font-semibold">Importing {dataTypeInfo?.label.toLowerCase()}...</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Please wait while we import your {dataTypeInfo?.label.toLowerCase()}
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
                    Successfully imported {importResult.imported} {dataTypeInfo?.label.toLowerCase()}.
                    {importResult.skipped_duplicates ? ` Skipped ${importResult.skipped_duplicates} duplicate${importResult.skipped_duplicates !== 1 ? "s" : ""}.` : ""}
                    {importResult.skipped_unmatched ? ` Skipped ${importResult.skipped_unmatched} with unmatched leads.` : ""}
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
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{importResult.imported}</p>
                  <p className="text-sm text-muted-foreground">Imported</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">
                    {(importResult.skipped_duplicates || 0) + (importResult.skipped_unmatched || 0)}
                  </p>
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
                  Done
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
              disabled={currentStep === "upload" && !!defaultDataType || currentStep === "select-type"}
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
                  {dataType === "leads" ? "Checking..." : "Matching..."}
                </>
              ) : currentStep === "preview" ? (
                <>
                  Import {getValidCount()} {dataTypeInfo?.label}
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
