"use client"

import { Check, AlertCircle, Sparkles, HelpCircle, Plus, X } from "lucide-react"
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
  detectedMapping: DetectedMultiContactLeadMapping
  mapping: MultiContactLeadColumnMapping
  onMappingChange: (mapping: MultiContactLeadColumnMapping) => void
}

const NONE_VALUE = "__none__"

// Lead field keys (non-contact fields)
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
  { value: 'required', label: 'Required', fields: ['name', 'website'] as LeadFieldKey[] },
  { value: 'lead-info', label: 'Lead Info', fields: ['industry', 'status', 'source'] as LeadFieldKey[] },
  { value: 'address', label: 'Address', fields: ['address', 'city', 'state', 'country', 'postal_code'] as LeadFieldKey[] },
  { value: 'other', label: 'Other', fields: ['notes'] as LeadFieldKey[] },
] as const

const CONTACT_FIELDS: ContactFieldType[] = ['first_name', 'last_name', 'email', 'phone', 'title']

export function LeadColumnMapper({
  headers,
  detectedMapping,
  mapping,
  onMappingChange,
}: LeadColumnMapperProps) {
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
    if (slotIndex === 0) return // Can't remove primary contact

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

  const getLeadSectionMappedCount = (fields: readonly LeadFieldKey[]) => {
    return fields.filter(f => mapping[f] !== null).length
  }

  const getContactSlotMappedCount = (slot: ContactSlot) => {
    return CONTACT_FIELDS.filter(f => slot.fields[f] !== null).length
  }

  const renderLeadFieldSelect = (field: LeadFieldKey, required: boolean = false) => {
    const currentValue = mapping[field]
    const autoDetected = isLeadFieldAutoDetected(field)

    return (
      <div className="flex items-center gap-2">
        <Label htmlFor={`field-${field}`} className="w-24 shrink-0 text-sm flex items-center gap-1">
          {LEAD_FIELD_LABELS[field]}
          {required && <span className="text-destructive">*</span>}
        </Label>
        <Select
          value={currentValue || NONE_VALUE}
          onValueChange={(value) => handleLeadFieldChange(field, value)}
        >
          <SelectTrigger id={`field-${field}`} className="flex-1 min-w-0">
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
        {autoDetected && (
          <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground hover:text-foreground shrink-0">
              <HelpCircle className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{LEAD_FIELD_DESCRIPTIONS[field]}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    )
  }

  const renderContactFieldSelect = (slotIndex: number, field: ContactFieldType) => {
    const slot = mapping.contactSlots[slotIndex]
    if (!slot) return null

    const currentValue = slot.fields[field]
    const autoDetected = isContactFieldAutoDetected(slotIndex, field)
    const isRequired = field === 'first_name'

    return (
      <div className="flex items-center gap-2">
        <Label htmlFor={`contact-${slotIndex}-${field}`} className="w-24 shrink-0 text-sm flex items-center gap-1">
          {CONTACT_FIELD_LABELS[field]}
          {isRequired && <span className="text-destructive">*</span>}
        </Label>
        <Select
          value={currentValue || NONE_VALUE}
          onValueChange={(value) => handleContactFieldChange(slotIndex, field, value)}
        >
          <SelectTrigger id={`contact-${slotIndex}-${field}`} className="flex-1 min-w-0">
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
        {autoDetected && (
          <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground hover:text-foreground shrink-0">
              <HelpCircle className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{CONTACT_FIELD_DESCRIPTIONS[field]}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    )
  }

  const hasRequiredFields = mapping.name !== null
  const totalContactSlots = mapping.contactSlots.length
  const canAddMoreContacts = totalContactSlots < MAX_CONTACTS_PER_LEAD

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Map Columns</h3>
        <p className="text-sm text-muted-foreground">
          We&apos;ve auto-detected your columns. Review and adjust if needed.
          <span className="inline-flex items-center gap-1 ml-2">
            <Sparkles className="h-3 w-3 text-amber-500" /> = auto-detected
          </span>
        </p>
      </div>

      {/* Accordion Sections */}
      <Accordion type="single" collapsible defaultValue="required" className="w-full">
        {/* Lead Field Sections */}
        {LEAD_SECTIONS.map((section) => {
          const mappedCount = getLeadSectionMappedCount(section.fields)
          const totalCount = section.fields.length

          return (
            <AccordionItem key={section.value} value={section.value}>
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                <span className="flex items-center gap-2">
                  {section.label}
                  <Badge
                    variant={mappedCount > 0 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {mappedCount}/{totalCount}
                  </Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-1">
                  {section.fields.map((field) => (
                    <div key={field}>
                      {renderLeadFieldSelect(field, section.value === 'required' && field === 'name')}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}

        {/* Contact Sections - Dynamic */}
        {mapping.contactSlots.map((slot, slotIndex) => {
          const mappedCount = getContactSlotMappedCount(slot)
          const totalCount = CONTACT_FIELDS.length

          return (
            <AccordionItem key={`contact-${slotIndex}`} value={`contact-${slotIndex}`}>
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                <span className="flex items-center gap-2 flex-1">
                  {slot.slotLabel}
                  <Badge
                    variant={mappedCount > 0 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {mappedCount}/{totalCount}
                  </Badge>
                  {slotIndex > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeContactSlot(slotIndex)
                      }}
                      className="ml-auto mr-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      title="Remove contact"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-1">
                  {CONTACT_FIELDS.map((field) => (
                    <div key={field}>
                      {renderContactFieldSelect(slotIndex, field)}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* Add Contact Button */}
      {canAddMoreContacts && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addContactSlot}
          className="w-full mt-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Contact ({totalContactSlots}/{MAX_CONTACTS_PER_LEAD})
        </Button>
      )}

      {/* Validation Status */}
      <div className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
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
  )
}
