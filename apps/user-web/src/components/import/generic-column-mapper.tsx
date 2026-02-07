"use client"

import { Check, AlertCircle, CircleCheck, HelpCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface FieldConfig {
  key: string
  label: string
  description: string
  required: boolean
  group: 'required' | 'primary' | 'address' | 'other'
}

export interface GenericColumnMapperProps<T extends { [K in keyof T]: string | null }> {
  headers: string[]
  rows?: string[][]
  detectedMapping: T & { confidence: Record<string, number> }
  mapping: T
  onMappingChange: (mapping: T) => void
  fieldConfig: FieldConfig[]
  title?: string
  description?: string
}

const NONE_VALUE = "__none__"

const GROUP_LABELS: Record<string, string> = {
  required: 'REQUIRED',
  primary: 'INFORMATION',
  address: 'ADDRESS',
  other: 'OTHER',
}

function getSampleValue(headers: string[], rows: string[][], columnName: string | null): string | null {
  if (!columnName) return null
  const colIndex = headers.indexOf(columnName)
  if (colIndex === -1) return null
  for (const row of rows) {
    const val = row[colIndex]?.trim()
    if (val) return val.length > 30 ? val.slice(0, 30) + '...' : val
  }
  return null
}

export function GenericColumnMapper<T extends { [K in keyof T]: string | null }>({
  headers,
  rows = [],
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

  const groupedFields = fieldConfig.reduce((acc, field) => {
    if (!acc[field.group]) acc[field.group] = []
    acc[field.group].push(field)
    return acc
  }, {} as Record<string, FieldConfig[]>)

  const requiredFields = fieldConfig.filter(f => f.required)
  const hasAllRequiredFields = requiredFields.every(
    f => (mapping as Record<string, string | null>)[f.key] !== null
  )

  const renderFieldRow = (config: FieldConfig) => {
    const currentValue = (mapping as Record<string, string | null>)[config.key]
    const autoDetected = isAutoDetected(config.key)
    const sample = getSampleValue(headers, rows, currentValue)

    return (
      <div key={config.key} className="flex items-center gap-3 py-3">
        <Label htmlFor={`field-${config.key}`} className="w-40 shrink-0 text-sm flex items-center gap-1">
          {config.label}
          {config.required && <span className="text-destructive">*</span>}
        </Label>
        <Select
          value={currentValue || NONE_VALUE}
          onValueChange={(value) => handleFieldChange(config.key, value)}
        >
          <SelectTrigger id={`field-${config.key}`} className="flex-1 min-w-0">
            <SelectValue placeholder="Select column..." />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-60">
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
        {sample && (
          <span className="hidden sm:inline-block text-xs text-muted-foreground bg-muted px-2 py-1 rounded max-w-[160px] truncate shrink-0" title={sample}>
            {sample}
          </span>
        )}
        {autoDetected && (
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Auto-mapped</p>
            </TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground hover:text-foreground shrink-0">
              <HelpCircle className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{config.description}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      {/* Left column: CSV Preview */}
      <div className="w-[40%] shrink-0">
        <div className="sticky top-0">
          <div className="rounded-lg border bg-muted/30 overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/50">
              <h4 className="text-sm font-medium">CSV Preview</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {headers.length} columns, {rows.length} rows
              </p>
            </div>
            <div className="overflow-auto max-h-[calc(100vh-280px)]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-2 font-medium text-muted-foreground w-8">#</th>
                    <th className="text-left p-2 font-medium">Column</th>
                    <th className="text-left p-2 font-medium">Sample</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((header, i) => {
                    const sample = getSampleValue(headers, rows, header)
                    return (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-2 text-muted-foreground">{i + 1}</td>
                        <td className="p-2 font-medium">{header}</td>
                        <td className="p-2 text-muted-foreground truncate max-w-[180px]">
                          {sample || <span className="italic">empty</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Right column: Mapping Fields */}
      <div className="flex-1 min-w-0">
        <div className="mb-6">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {description}
            <span className="inline-flex items-center gap-1 ml-2">
              <CircleCheck className="h-3 w-3 text-emerald-500" /> = auto-mapped
            </span>
          </p>
        </div>

        <div className="space-y-8">
          {Object.entries(groupedFields).map(([group, fields]) => (
            <div key={group}>
              <div className="flex items-center gap-3 mb-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {GROUP_LABELS[group] || group}
                </h4>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="divide-y">
                {fields.map(renderFieldRow)}
              </div>
            </div>
          ))}
        </div>

        {/* Validation Status */}
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm mt-6 ${
          hasAllRequiredFields
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
            : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
        }`}>
          {hasAllRequiredFields ? (
            <>
              <Check className="h-4 w-4" />
              <span>All required fields are mapped</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" />
              <span>Please map all required fields to continue</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
