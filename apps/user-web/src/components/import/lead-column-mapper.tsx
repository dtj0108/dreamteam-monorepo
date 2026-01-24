"use client"

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
import type { LeadColumnMapping, DetectedLeadMapping } from "@/lib/lead-csv-parser"

interface LeadColumnMapperProps {
  headers: string[]
  detectedMapping: DetectedLeadMapping
  mapping: LeadColumnMapping
  onMappingChange: (mapping: LeadColumnMapping) => void
}

const NONE_VALUE = "__none__"

const FIELD_LABELS: Record<keyof LeadColumnMapping, string> = {
  name: 'Company Name',
  website: 'Website',
  industry: 'Industry',
  status: 'Status',
  notes: 'Notes',
  address: 'Address',
  city: 'City',
  state: 'State/Province',
  country: 'Country',
  postal_code: 'Postal Code',
  source: 'Lead Source',
}

const FIELD_DESCRIPTIONS: Record<keyof LeadColumnMapping, string> = {
  name: 'Company or organization name (required)',
  website: 'Company website URL - used for duplicate detection',
  industry: 'Business industry or sector',
  status: 'Lead status (e.g., New, Contacted, Qualified)',
  notes: 'Additional notes or description',
  address: 'Street address',
  city: 'City name',
  state: 'State or province',
  country: 'Country name',
  postal_code: 'ZIP or postal code',
  source: 'How the lead was acquired (e.g., Website, Referral, LinkedIn)',
}

export function LeadColumnMapper({
  headers,
  detectedMapping,
  mapping,
  onMappingChange,
}: LeadColumnMapperProps) {
  const handleFieldChange = (field: keyof LeadColumnMapping, value: string) => {
    onMappingChange({
      ...mapping,
      [field]: value === NONE_VALUE ? null : value,
    })
  }

  const isAutoDetected = (field: keyof LeadColumnMapping) => {
    return detectedMapping[field] === mapping[field] && mapping[field] !== null
  }

  const renderFieldSelect = (field: keyof LeadColumnMapping, required: boolean = false) => {
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

  const hasRequiredFields = mapping.name !== null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Map Columns</CardTitle>
        <CardDescription>
          We&apos;ve auto-detected your columns. Review and adjust if needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Required Fields */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Required Fields
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            {renderFieldSelect('name', true)}
            {renderFieldSelect('website', false)}
          </div>
        </div>

        {/* Lead Info Fields */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Lead Information
          </h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {renderFieldSelect('industry', false)}
            {renderFieldSelect('status', false)}
            {renderFieldSelect('source', false)}
          </div>
        </div>

        {/* Address Fields */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Address
          </h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {renderFieldSelect('address', false)}
            {renderFieldSelect('city', false)}
            {renderFieldSelect('state', false)}
            {renderFieldSelect('country', false)}
            {renderFieldSelect('postal_code', false)}
          </div>
        </div>

        {/* Optional Fields */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Other
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
              <span className="text-sm">Required field is mapped</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Please map the Company Name column to continue</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
