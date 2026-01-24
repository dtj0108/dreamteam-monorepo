"use client"

import { useEffect, useState } from "react"
import { Check, AlertCircle, Sparkles } from "lucide-react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ColumnMapping, DetectedMapping } from "@/lib/csv-parser"

interface ColumnMapperProps {
  headers: string[]
  detectedMapping: DetectedMapping
  mapping: ColumnMapping
  onMappingChange: (mapping: ColumnMapping) => void
}

const NONE_VALUE = "__none__"

const REQUIRED_FIELDS: (keyof ColumnMapping)[] = ['date', 'description']
const AMOUNT_FIELDS: (keyof ColumnMapping)[] = ['amount', 'debit', 'credit']
const OPTIONAL_FIELDS: (keyof ColumnMapping)[] = ['notes']

const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  date: 'Date',
  amount: 'Amount',
  description: 'Description',
  notes: 'Notes',
  debit: 'Debit (Outgoing)',
  credit: 'Credit (Incoming)',
}

const FIELD_DESCRIPTIONS: Record<keyof ColumnMapping, string> = {
  date: 'Transaction date',
  amount: 'Single amount column (positive = income, negative = expense)',
  description: 'Transaction description or merchant name',
  notes: 'Additional notes or reference (optional)',
  debit: 'Outgoing/expense amounts (use instead of Amount)',
  credit: 'Incoming/deposit amounts (use instead of Amount)',
}

export function ColumnMapper({
  headers,
  detectedMapping,
  mapping,
  onMappingChange,
}: ColumnMapperProps) {
  const [useDebitCredit, setUseDebitCredit] = useState(false)

  // Check if debit/credit columns were detected
  useEffect(() => {
    if (detectedMapping.debit || detectedMapping.credit) {
      setUseDebitCredit(true)
    }
  }, [detectedMapping])

  const handleFieldChange = (field: keyof ColumnMapping, value: string) => {
    onMappingChange({
      ...mapping,
      [field]: value === NONE_VALUE ? null : value,
    })
  }

  const isAutoDetected = (field: keyof ColumnMapping) => {
    return detectedMapping[field] === mapping[field] && mapping[field] !== null
  }

  const renderFieldSelect = (field: keyof ColumnMapping, required: boolean = false) => {
    const currentValue = mapping[field]
    const autoDetected = isAutoDetected(field)

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={`field-${field}`} className="flex items-center gap-2">
            {FIELD_LABELS[field]}
            {required && <span className="text-destructive">*</span>}
          </Label>
          {autoDetected && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Sparkles className="h-3 w-3" />
              Auto-detected
            </Badge>
          )}
        </div>
        <Select
          value={currentValue || NONE_VALUE}
          onValueChange={(value) => handleFieldChange(field, value)}
        >
          <SelectTrigger id={`field-${field}`}>
            <SelectValue placeholder="Select column..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>
              <span className="text-muted-foreground">None</span>
            </SelectItem>
            {headers.map((header) => (
              <SelectItem key={header} value={header}>
                {header}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {FIELD_DESCRIPTIONS[field]}
        </p>
      </div>
    )
  }

  // Validation
  const hasAmountMapping = mapping.amount !== null || (mapping.debit !== null || mapping.credit !== null)
  const hasRequiredFields = mapping.date !== null && mapping.description !== null && hasAmountMapping

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Map Columns</CardTitle>
        <CardDescription>
          We've auto-detected your columns. Review and adjust if needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Required Fields */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Required Fields
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            {renderFieldSelect('date', true)}
            {renderFieldSelect('description', true)}
          </div>
        </div>

        {/* Amount Fields */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Amount Fields
            </h4>
            <button
              type="button"
              onClick={() => {
                setUseDebitCredit(!useDebitCredit)
                if (!useDebitCredit) {
                  // Switching to debit/credit, clear amount
                  onMappingChange({ ...mapping, amount: null })
                } else {
                  // Switching to single amount, clear debit/credit
                  onMappingChange({ ...mapping, debit: null, credit: null })
                }
              }}
              className="text-xs text-primary hover:underline"
            >
              {useDebitCredit ? 'Use single Amount column' : 'Use separate Debit/Credit columns'}
            </button>
          </div>
          
          {useDebitCredit ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {renderFieldSelect('debit', false)}
              {renderFieldSelect('credit', false)}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {renderFieldSelect('amount', true)}
            </div>
          )}
        </div>

        {/* Optional Fields */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Optional Fields
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            {renderFieldSelect('notes', false)}
          </div>
        </div>

        {/* Validation Status */}
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          hasRequiredFields 
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
            : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
        }`}>
          {hasRequiredFields ? (
            <>
              <Check className="h-4 w-4" />
              <span className="text-sm">All required fields are mapped</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Please map all required fields to continue</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

