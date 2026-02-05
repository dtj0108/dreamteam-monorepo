"use client"

import { useState } from "react"
import { Check, AlertCircle, CircleCheck, HelpCircle, Plus, X, ChevronDown } from "lucide-react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  type MultiContactLeadColumnMapping,
  type DetectedMultiContactLeadMapping,
  type ContactSlot,
  type ContactFieldType,
  MAX_CONTACTS_PER_LEAD,
  createEmptyContactSlot,
} from "@/lib/lead-csv-parser"

interface LeadColumnMapperProps {
  headers: string[]
  rows?: string[][]
  detectedMapping: DetectedMultiContactLeadMapping
  mapping: MultiContactLeadColumnMapping
  onMappingChange: (mapping: MultiContactLeadColumnMapping) => void
}

const NONE_VALUE = "__none__"

type LeadFieldKey = 'name' | 'website' | 'industry' | 'status' | 'notes' | 'address' | 'city' | 'state' | 'country' | 'postal_code' | 'source'

const LEAD_FIELD_LABELS: Record<LeadFieldKey, string> = {
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

const LEAD_FIELD_DESCRIPTIONS: Record<LeadFieldKey, string> = {
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

const CONTACT_FIELD_LABELS: Record<ContactFieldType, string> = {
  first_name: 'First Name',
  last_name: 'Last Name',
  email: 'Email',
  phone: 'Phone',
  title: 'Job Title',
}

const CONTACT_FIELD_DESCRIPTIONS: Record<ContactFieldType, string> = {
  first_name: 'Contact first name (required to create contact)',
  last_name: 'Contact last name',
  email: 'Contact email address',
  phone: 'Contact phone number',
  title: 'Contact job title or role',
}

const LEAD_SECTIONS = [
  { value: 'required', label: 'REQUIRED', fields: ['name', 'website'] as LeadFieldKey[] },
  { value: 'lead-info', label: 'LEAD INFO', fields: ['industry', 'status', 'source'] as LeadFieldKey[] },
  { value: 'address', label: 'ADDRESS', fields: ['address', 'city', 'state', 'country', 'postal_code'] as LeadFieldKey[] },
  { value: 'other', label: 'OTHER', fields: ['notes'] as LeadFieldKey[] },
] as const

const CONTACT_FIELDS: ContactFieldType[] = ['first_name', 'last_name', 'email', 'phone', 'title']

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

export function LeadColumnMapper({
  headers,
  rows = [],
  detectedMapping,
  mapping,
  onMappingChange,
}: LeadColumnMapperProps) {
  const [collapsedContacts, setCollapsedContacts] = useState<Set<number>>(new Set())

  const handleLeadFieldChange = (field: LeadFieldKey, value: string) => {
    onMappingChange({
      ...mapping,
      [field]: value === NONE_VALUE ? null : value,
    })
  }

  const handleContactFieldChange = (slotIndex: number, field: ContactFieldType, value: string) => {
    const newSlots = mapping.contactSlots.map((slot, idx) => {
      if (idx !== slotIndex) return slot
      return {
        ...slot,
        fields: {
          ...slot.fields,
          [field]: value === NONE_VALUE ? null : value,
        }
      }
    })
    onMappingChange({
      ...mapping,
      contactSlots: newSlots,
    })
  }

  const addContactSlot = () => {
    if (mapping.contactSlots.length >= MAX_CONTACTS_PER_LEAD) return
    const nextIndex = mapping.contactSlots.length
    onMappingChange({
      ...mapping,
      contactSlots: [...mapping.contactSlots, createEmptyContactSlot(nextIndex)],
    })
  }

  const removeContactSlot = (slotIndex: number) => {
    if (slotIndex === 0) return
    const newSlots = mapping.contactSlots
      .filter((_, idx) => idx !== slotIndex)
      .map((slot, idx) => ({
        ...slot,
        slotIndex: idx,
        slotLabel: idx === 0 ? 'Primary Contact' : `Contact ${idx + 1}`,
      }))
    onMappingChange({
      ...mapping,
      contactSlots: newSlots,
    })
    setCollapsedContacts((prev) => {
      const next = new Set(prev)
      next.delete(slotIndex)
      return next
    })
  }

  const toggleContactCollapse = (slotIndex: number) => {
    setCollapsedContacts((prev) => {
      const next = new Set(prev)
      if (next.has(slotIndex)) next.delete(slotIndex)
      else next.add(slotIndex)
      return next
    })
  }

  const isLeadFieldAutoDetected = (field: LeadFieldKey) => {
    return detectedMapping[field] === mapping[field] && mapping[field] !== null
  }

  const isContactFieldAutoDetected = (slotIndex: number, field: ContactFieldType) => {
    const detectedSlot = detectedMapping.contactSlots[slotIndex]
    const currentSlot = mapping.contactSlots[slotIndex]
    if (!detectedSlot || !currentSlot) return false
    return detectedSlot.fields[field] === currentSlot.fields[field] && currentSlot.fields[field] !== null
  }

  const getContactSlotMappedCount = (slot: ContactSlot) => {
    return CONTACT_FIELDS.filter(f => slot.fields[f] !== null).length
  }

  const renderFieldRow = (
    id: string,
    label: string,
    required: boolean,
    currentValue: string | null,
    autoDetected: boolean,
    description: string,
    onChange: (value: string) => void,
  ) => {
    const sample = getSampleValue(headers, rows, currentValue)

    return (
      <div key={id} className="flex items-center gap-3 py-3">
        <Label htmlFor={id} className="w-40 shrink-0 text-sm flex items-center gap-1">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
        <Select
          value={currentValue || NONE_VALUE}
          onValueChange={(value) => onChange(value)}
        >
          <SelectTrigger id={id} className="flex-1 min-w-0">
            <SelectValue placeholder="Select column..." />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-60">
            <SelectItem value={NONE_VALUE}>
              <span className="text-muted-foreground">None</span>
            </SelectItem>
            {headers.map((header) => (
              <SelectItem key={header} value={header} title={header}>
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
            <p>{description}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    )
  }

  const hasRequiredFields = mapping.name !== null
  const totalContactSlots = mapping.contactSlots.length
  const canAddMoreContacts = totalContactSlots < MAX_CONTACTS_PER_LEAD

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
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold">Map Your Columns</h3>
          <p className="text-sm text-muted-foreground mt-1">
            We&apos;ve auto-detected your columns. Review and adjust if needed.
            <span className="inline-flex items-center gap-1 ml-2">
              <CircleCheck className="h-3 w-3 text-emerald-500" /> = auto-mapped
            </span>
          </p>
        </div>

        {/* Flat Sections */}
        <div className="space-y-8">
          {LEAD_SECTIONS.map((section) => (
            <div key={section.value}>
              <div className="flex items-center gap-3 mb-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.label}
                </h4>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="divide-y">
                {section.fields.map((field) =>
                  renderFieldRow(
                    `field-${field}`,
                    LEAD_FIELD_LABELS[field],
                    section.value === 'required' && field === 'name',
                    mapping[field],
                    isLeadFieldAutoDetected(field),
                    LEAD_FIELD_DESCRIPTIONS[field],
                    (value) => handleLeadFieldChange(field, value),
                  )
                )}
              </div>
            </div>
          ))}

          {/* Contact Sections */}
          {mapping.contactSlots.map((slot, slotIndex) => {
            const mappedCount = getContactSlotMappedCount(slot)
            const isCollapsed = slotIndex > 0 && collapsedContacts.has(slotIndex)

            return (
              <div key={`contact-${slotIndex}`}>
                <div className="flex items-center gap-3 mb-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {slot.slotLabel}
                  </h4>
                  <Badge
                    variant={mappedCount > 0 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {mappedCount}/{CONTACT_FIELDS.length}
                  </Badge>
                  <div className="flex-1 h-px bg-border" />
                  {slotIndex > 0 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleContactCollapse(slotIndex)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        title={isCollapsed ? "Expand" : "Collapse"}
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeContactSlot(slotIndex)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        title="Remove contact"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="divide-y">
                    {CONTACT_FIELDS.map((field) =>
                      renderFieldRow(
                        `contact-${slotIndex}-${field}`,
                        CONTACT_FIELD_LABELS[field],
                        field === 'first_name',
                        slot.fields[field],
                        isContactFieldAutoDetected(slotIndex, field),
                        CONTACT_FIELD_DESCRIPTIONS[field],
                        (value) => handleContactFieldChange(slotIndex, field, value),
                      )
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Add Contact Button */}
        {canAddMoreContacts && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addContactSlot}
            className="w-full mt-6"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Contact ({totalContactSlots}/{MAX_CONTACTS_PER_LEAD})
          </Button>
        )}

        {/* Validation Status */}
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm mt-6 ${
          hasRequiredFields
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
            : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
        }`}>
          {hasRequiredFields ? (
            <>
              <Check className="h-4 w-4" />
              <span>Required field is mapped</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" />
              <span>Please map the Company Name column to continue</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
