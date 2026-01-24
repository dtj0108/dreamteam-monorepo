"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWorkspace } from "@/providers/workspace-provider"
import { 
  ArrowLeft, 
  ArrowRight, 
  Upload, 
  FileSpreadsheet, 
  Check, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AILoadingAnimation } from "@/components/ui/ai-loading-animation"
import { CSVUploader } from "@/components/import/csv-uploader"
import { ColumnMapper } from "@/components/import/column-mapper"
import { PreviewTable, type TransactionWithDuplicate } from "@/components/import/preview-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
// Using API routes instead of direct database queries for proper workspace filtering
import {
  parseCSV,
  detectColumnMapping,
  transformToTransactions,
  validateMapping,
  type ParsedCSV,
  type ColumnMapping,
  type DetectedMapping,
  type ParsedTransaction,
} from "@/lib/csv-parser"
import type { Account } from "@/lib/types"

type ImportStep = "select-account" | "upload" | "map-columns" | "preview" | "importing" | "complete"

const STEPS: { key: ImportStep; label: string; icon: React.ReactNode }[] = [
  { key: "select-account", label: "Select Account", icon: <FileSpreadsheet className="h-4 w-4" /> },
  { key: "upload", label: "Upload CSV", icon: <Upload className="h-4 w-4" /> },
  { key: "map-columns", label: "Map Columns", icon: <FileSpreadsheet className="h-4 w-4" /> },
  { key: "preview", label: "Preview", icon: <Check className="h-4 w-4" /> },
]

export default function ImportTransactionsPage() {
  const router = useRouter()
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const [currentStep, setCurrentStep] = useState<ImportStep>("select-account")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [loading, setLoading] = useState(true)

  // CSV data
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null)
  const [detectedMapping, setDetectedMapping] = useState<DetectedMapping | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: null,
    amount: null,
    description: null,
    notes: null,
    debit: null,
    credit: null,
  })
  const [transactions, setTransactions] = useState<TransactionWithDuplicate[]>([])

  // Duplicate detection state
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
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
    errors?: string[]
  } | null>(null)

  // Auto-categorization state
  const [categorizing, setCategorizing] = useState(false)
  const [categorizeError, setCategorizeError] = useState<string | null>(null)
  const [categorizeProgress, setCategorizeProgress] = useState({ current: 0, total: 0 })

  useEffect(() => {
    // Wait for workspace to be loaded before fetching
    if (workspaceLoading) return

    async function loadAccounts() {
      try {
        const res = await fetch('/api/accounts', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setAccounts(data.accounts || [])
        }
      } catch (error) {
        console.error("Failed to load accounts:", error)
      } finally {
        setLoading(false)
      }
    }
    loadAccounts()
  }, [workspaceLoading, currentWorkspace?.id])

  const handleFileSelect = useCallback((file: File, content: string) => {
    const parsed = parseCSV(content)
    setParsedCSV(parsed)

    // Auto-detect column mappings
    const detected = detectColumnMapping(parsed.headers)
    setDetectedMapping(detected)
    setMapping({
      date: detected.date,
      amount: detected.amount,
      description: detected.description,
      notes: detected.notes,
      debit: detected.debit,
      credit: detected.credit,
    })

    // Auto-advance to mapping step
    setCurrentStep("map-columns")
  }, [])

  const handleMappingChange = useCallback((newMapping: ColumnMapping) => {
    setMapping(newMapping)

    // Re-transform transactions with new mapping
    if (parsedCSV) {
      const transformed = transformToTransactions(
        parsedCSV.rows,
        parsedCSV.headers,
        newMapping
      )
      setTransactions(transformed)
    }
  }, [parsedCSV])

  const handlePreview = useCallback(async () => {
    if (!parsedCSV || !selectedAccountId) return

    const transformed = transformToTransactions(
      parsedCSV.rows,
      parsedCSV.headers,
      mapping
    )
    setTransactions(transformed)
    setCurrentStep("preview")
    
    // Check for duplicates
    setCheckingDuplicates(true)
    try {
      const validTransactions = transformed.filter(t => t.isValid)
      if (validTransactions.length === 0) {
        setCheckingDuplicates(false)
        return
      }
      
      const response = await fetch("/api/transactions/check-duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: selectedAccountId,
          transactions: validTransactions.map(t => ({
            date: t.date,
            amount: t.amount,
            description: t.description,
          })),
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setDuplicateCount(data.duplicateCount)
        
        // Update transactions with duplicate info
        let validIndex = 0
        const updatedTransactions = transformed.map(t => {
          if (!t.isValid) return t
          const duplicateInfo = data.results[validIndex]
          validIndex++
          return { ...t, duplicateInfo }
        })
        setTransactions(updatedTransactions)
      }
    } catch (error) {
      console.error("Failed to check duplicates:", error)
    } finally {
      setCheckingDuplicates(false)
    }
  }, [parsedCSV, mapping, selectedAccountId])

  const handleAutoCategorize = async () => {
    if (transactions.length === 0) return

    setCategorizing(true)
    setCategorizeError(null)

    try {
      // Get descriptions from valid transactions
      const validTransactions = transactions.filter((t) => t.isValid)
      const descriptions = validTransactions.map((t) => t.description)
      
      // Set initial progress
      setCategorizeProgress({ current: 0, total: descriptions.length })
      
      // Simulate progress updates while waiting for API
      const progressInterval = setInterval(() => {
        setCategorizeProgress((prev) => ({
          ...prev,
          current: Math.min(prev.current + Math.ceil(prev.total * 0.1), prev.total - 1),
        }))
      }, 300)

      const response = await fetch("/api/transactions/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptions }),
      })

      clearInterval(progressInterval)
      setCategorizeProgress({ current: descriptions.length, total: descriptions.length })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Categorization failed")
      }

      // Update transactions with suggested categories
      const suggestions = result.suggestions as Array<{
        description: string
        categoryId: string | null
        categoryName: string | null
      }>

      let suggestionIndex = 0
      const updatedTransactions = transactions.map((t) => {
        if (!t.isValid) return t
        
        const suggestion = suggestions[suggestionIndex]
        suggestionIndex++
        
        return {
          ...t,
          categoryId: suggestion?.categoryId || null,
          categoryName: suggestion?.categoryName || null,
        }
      })

      setTransactions(updatedTransactions)
    } catch (error) {
      console.error("Categorization error:", error)
      setCategorizeError(error instanceof Error ? error.message : "Failed to categorize")
    } finally {
      setCategorizing(false)
      setCategorizeProgress({ current: 0, total: 0 })
    }
  }

  const handleImport = async () => {
    if (!selectedAccountId || transactions.length === 0) return

    setImporting(true)
    setCurrentStep("importing")
    setImportProgress(10)

    try {
      // Filter only valid transactions, and optionally exclude duplicates
      let validTransactions = transactions.filter((t) => t.isValid)
      
      if (!importDuplicates) {
        validTransactions = validTransactions.filter((t) => !t.duplicateInfo?.isDuplicate)
      }

      setImportProgress(30)

      const response = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: selectedAccountId,
          skip_duplicates: !importDuplicates,
          transactions: validTransactions.map((t) => ({
            date: t.date,
            amount: t.amount,
            description: t.description,
            notes: t.notes,
            category_id: t.categoryId,
          })),
        }),
      })

      setImportProgress(80)

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Import failed")
      }

      setImportProgress(100)
      setImportResult({
        success: true,
        imported: result.imported,
        failed: result.failed,
        skipped_duplicates: result.skipped_duplicates,
        errors: result.errors,
      })
      setCurrentStep("complete")
    } catch (error) {
      console.error("Import error:", error)
      setImportResult({
        success: false,
        imported: 0,
        failed: transactions.filter((t) => t.isValid).length,
        errors: [error instanceof Error ? error.message : "Import failed"],
      })
      setCurrentStep("complete")
    } finally {
      setImporting(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case "select-account":
        return !!selectedAccountId
      case "upload":
        return !!parsedCSV
      case "map-columns":
        return validateMapping(mapping).valid
      case "preview":
        return transactions.some((t) => t.isValid)
      default:
        return false
    }
  }

  const goNext = () => {
    switch (currentStep) {
      case "select-account":
        setCurrentStep("upload")
        break
      case "upload":
        setCurrentStep("map-columns")
        break
      case "map-columns":
        handlePreview()
        break
      case "preview":
        handleImport()
        break
    }
  }

  const goBack = () => {
    switch (currentStep) {
      case "upload":
        setCurrentStep("select-account")
        break
      case "map-columns":
        setCurrentStep("upload")
        break
      case "preview":
        setCurrentStep("map-columns")
        break
    }
  }

  const getStepIndex = (step: ImportStep) => {
    const idx = STEPS.findIndex((s) => s.key === step)
    return idx >= 0 ? idx : STEPS.length
  }

  const currentStepIndex = getStepIndex(currentStep)

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId)

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Transactions", href: "/transactions" },
        { label: "Import" },
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Import Transactions</h1>
          <p className="text-muted-foreground">
            Upload a CSV file to bulk import transactions into an account
          </p>
        </div>

        {/* Progress Steps */}
        {currentStep !== "importing" && currentStep !== "complete" && (
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => (
              <div key={step.key} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    currentStepIndex === index
                      ? "bg-primary text-primary-foreground"
                      : currentStepIndex > index
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {currentStepIndex > index ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.icon
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className="w-8 h-px bg-border mx-2" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step Content */}
        {currentStep === "select-account" && (
          <Card>
            <CardHeader>
              <CardTitle>Select Target Account</CardTitle>
              <CardDescription>
                Choose the account where transactions will be imported
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="h-10 bg-muted animate-pulse rounded-md" />
              ) : accounts.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No accounts found</AlertTitle>
                  <AlertDescription>
                    You need to create an account before importing transactions.
                    <Button
                      variant="link"
                      className="p-0 h-auto ml-1"
                      onClick={() => router.push("/accounts/new")}
                    >
                      Create an account
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="account">Account</Label>
                  <Select
                    value={selectedAccountId}
                    onValueChange={setSelectedAccountId}
                  >
                    <SelectTrigger id="account" className="w-full">
                      <SelectValue placeholder="Select an account..." />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <span>{account.name}</span>
                            {account.institution && (
                              <span className="text-muted-foreground">
                                ({account.institution})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep === "upload" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Selected Account</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{selectedAccount?.name}</p>
                {selectedAccount?.institution && (
                  <p className="text-sm text-muted-foreground">
                    {selectedAccount.institution}
                  </p>
                )}
              </CardContent>
            </Card>

            <CSVUploader onFileSelect={handleFileSelect} />
          </div>
        )}

        {currentStep === "map-columns" && parsedCSV && detectedMapping && (
          <div className="space-y-4">
            {/* Sample Data Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">CSV Preview</CardTitle>
                <CardDescription>
                  Found {parsedCSV.headers.length} columns and {parsedCSV.rows.length} rows
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="text-sm w-full">
                    <thead>
                      <tr className="border-b">
                        {parsedCSV.headers.map((header, i) => (
                          <th
                            key={i}
                            className="px-3 py-2 text-left font-medium text-muted-foreground"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedCSV.rows.slice(0, 3).map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b last:border-0">
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-3 py-2 truncate max-w-[200px]"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedCSV.rows.length > 3 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Showing 3 of {parsedCSV.rows.length} rows
                  </p>
                )}
              </CardContent>
            </Card>

            <ColumnMapper
              headers={parsedCSV.headers}
              detectedMapping={detectedMapping}
              mapping={mapping}
              onMappingChange={handleMappingChange}
            />
          </div>
        )}

        {currentStep === "preview" && (
          <div className="space-y-4">
            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertTitle>Ready to Import</AlertTitle>
              <AlertDescription>
                Importing to <strong>{selectedAccount?.name}</strong>. Only valid
                transactions will be imported. Review the preview below.
              </AlertDescription>
            </Alert>

            {/* Duplicate Warning */}
            {checkingDuplicates ? (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertTitle>Checking for duplicates...</AlertTitle>
                <AlertDescription>
                  Comparing transactions against existing records in this account.
                </AlertDescription>
              </Alert>
            ) : duplicateCount > 0 ? (
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 dark:text-amber-200">
                  {duplicateCount} possible duplicate{duplicateCount !== 1 ? 's' : ''} found
                </AlertTitle>
                <AlertDescription className="text-amber-700 dark:text-amber-300">
                  These transactions may already exist in your account. By default, they will be skipped during import.
                  <div className="flex items-center gap-2 mt-3">
                    <Checkbox
                      id="import-duplicates"
                      checked={importDuplicates}
                      onCheckedChange={(checked) => setImportDuplicates(checked === true)}
                    />
                    <label 
                      htmlFor="import-duplicates" 
                      className="text-sm font-medium cursor-pointer"
                    >
                      Import duplicates anyway
                    </label>
                  </div>
                </AlertDescription>
              </Alert>
            ) : null}

            {/* Auto-categorize Section */}
            {categorizing ? (
              <AILoadingAnimation
                currentItem={categorizeProgress.current}
                totalItems={categorizeProgress.total}
                message="AI is categorizing..."
                className="min-h-[200px]"
              />
            ) : (
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">AI Auto-Categorization</h4>
                      <p className="text-sm text-muted-foreground">
                        Use AI to automatically categorize your transactions
                      </p>
                    </div>
                    <Button
                      onClick={handleAutoCategorize}
                      disabled={transactions.filter((t) => t.isValid).length === 0}
                      variant="outline"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Auto-Categorize
                    </Button>
                  </div>
                  {categorizeError && (
                    <div className="mt-3 text-sm text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {categorizeError}
                    </div>
                  )}
                  {transactions.some((t) => t.categoryId) && (
                    <div className="mt-3 text-sm text-emerald-600 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {transactions.filter((t) => t.categoryId).length} transactions categorized
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <PreviewTable transactions={transactions} maxRows={20} />
          </div>
        )}

        {currentStep === "importing" && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="text-center">
                  <h3 className="font-semibold text-lg">Importing Transactions</h3>
                  <p className="text-muted-foreground">
                    Please wait while we import your transactions...
                  </p>
                </div>
                <div className="w-full max-w-xs">
                  <Progress value={importProgress} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === "complete" && importResult && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                {importResult.success ? (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-lg">Import Complete!</h3>
                      <p className="text-muted-foreground">
                        Successfully imported {importResult.imported} transaction
                        {importResult.imported !== 1 ? "s" : ""} to{" "}
                        {selectedAccount?.name}
                      </p>
                      {(importResult.skipped_duplicates ?? 0) > 0 && (
                        <p className="text-sm text-amber-600 mt-1">
                          {importResult.skipped_duplicates} duplicate
                          {importResult.skipped_duplicates !== 1 ? "s" : ""} skipped
                        </p>
                      )}
                      {importResult.failed > 0 && (
                        <p className="text-sm text-destructive mt-1">
                          {importResult.failed} row
                          {importResult.failed !== 1 ? "s" : ""} failed due to
                          errors
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                      <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-lg">Import Failed</h3>
                      <p className="text-muted-foreground">
                        {importResult.errors?.[0] || "An error occurred during import"}
                      </p>
                    </div>
                  </>
                )}

                <div className="flex gap-3 mt-4">
                  <Button variant="outline" onClick={() => router.push("/transactions")}>
                    View Transactions
                  </Button>
                  <Button onClick={() => {
                    setCurrentStep("select-account")
                    setParsedCSV(null)
                    setTransactions([])
                    setImportResult(null)
                    setDuplicateCount(0)
                    setImportDuplicates(false)
                  }}>
                    Import More
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        {currentStep !== "importing" && currentStep !== "complete" && (
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={goBack}
              disabled={currentStep === "select-account"}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={goNext} disabled={!canProceed()}>
              {currentStep === "preview" ? (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {
                    importDuplicates 
                      ? transactions.filter((t) => t.isValid).length
                      : transactions.filter((t) => t.isValid && !t.duplicateInfo?.isDuplicate).length
                  } Transactions
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
      </div>
    </DashboardLayout>
  )
}

