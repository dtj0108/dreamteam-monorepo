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

export interface FieldConfig {
  key: string
  label: string
  description: string
  required: boolean
  group: 'required' | 'primary' | 'address' | 'other'
}

export interface GenericColumnMapperProps<T extends { [K in keyof T]: string | null }> {
  headers: string[]
  detectedMapping: T & { confidence: Record<string, number> }
  mapping: T
  onMappingChange: (mapping: T) => void
  fieldConfig: FieldConfig[]
  title?: string
  description?: string
}

const NONE_VALUE = "__none__"

const GROUP_LABELS: Record<string, string> = {
  required: 'Required Fields',
  primary: 'Information',
  address: 'Address',
  other: 'Other',
}

export function GenericColumnMapper<T extends { [K in keyof T]: string | null }>({
  headers,
  detectedMapping,
  mapping,
  onMappingChange,
  fieldConfig,
  title = "Map Columns",
  description = "We've auto-detected your columns. Review and adjust if needed.",
}: GenericColumnMapperProps<T>) {
  const handleFieldChange = (field: string, value: string) => {
    onMappingChange({
      ...mapping,
      [field]: value === NONE_VALUE ? null : value,
    })
  }

  const isAutoDetected = (field: string) => {
    const detected = (detectedMapping as Record<string, string | null>)[field]
    const current = (mapping as Record<string, string | null>)[field]
    return detected === current && current !== null
  }

  const renderFieldSelect = (config: FieldConfig) => {
    const currentValue = (mapping as Record<string, string | null>)[config.key]
    const autoDetected = isAutoDetected(config.key)

    return (
      <div key={config.key} className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={`field-${config.key}`} className="flex items-center gap-2">
            {config.label}
            {config.required && <span className="text-destructive">*</span>}
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
          onValueChange={(value) => handleFieldChange(config.key, value)}
        >
          <SelectTrigger id={`field-${config.key}`}>
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
          {config.description}
        </p>
      </div>
    )
  }

  // Group fields by their group
  const groupedFields = fieldConfig.reduce((acc, field) => {
    if (!acc[field.group]) acc[field.group] = []
    acc[field.group].push(field)
    return acc
  }, {} as Record<string, FieldConfig[]>)

  // Check if all required fields are mapped
  const requiredFields = fieldConfig.filter(f => f.required)
  const hasAllRequiredFields = requiredFields.every(
    f => (mapping as Record<string, string | null>)[f.key] !== null
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Render each group */}
        {Object.entries(groupedFields).map(([group, fields]) => (
          <div key={group} className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              {GROUP_LABELS[group] || group}
            </h4>
            <div className={`grid gap-4 ${fields.length > 2 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
              {fields.map(renderFieldSelect)}
            </div>
          </div>
        ))}

        {/* Validation Status */}
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          hasAllRequiredFields
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
            : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
        }`}>
          {hasAllRequiredFields ? (
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
