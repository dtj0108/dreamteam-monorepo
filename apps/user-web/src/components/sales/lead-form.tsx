"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LeadStatus, CustomField, LeadPipeline, LeadPipelineStage } from "@/types/customization"

export interface LeadTag {
  id: string
  name: string
  color: string
}

export interface WorkspaceMember {
  id: string
  profileId: string
  name: string
  displayName: string | null
  avatarUrl: string | null
  email: string
}

export interface Lead {
  id?: string
  name: string
  website?: string
  industry?: string
  status?: string
  notes?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  pipeline_id?: string
  stage_id?: string
  source?: string
  assigned_to?: string
  tag_ids?: string[]
}

interface LeadFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead?: Lead
  onSubmit: (lead: Lead, customFieldValues?: Record<string, string>) => Promise<void>
  statuses?: LeadStatus[]
  customFields?: CustomField[]
  customFieldValues?: Record<string, string>
  pipelines?: LeadPipeline[]
  defaultPipelineId?: string
  defaultStageId?: string
  members?: WorkspaceMember[]
  tags?: LeadTag[]
}

const industries = [
  "Technology",
  "Finance",
  "Healthcare",
  "Retail",
  "Manufacturing",
  "Education",
  "Real Estate",
  "Consulting",
  "Other",
]

const leadSources = [
  "Website",
  "Referral",
  "Cold Outreach",
  "LinkedIn",
  "Trade Show",
  "Advertisement",
  "Partner",
  "Other",
]

const defaultStatuses = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "unqualified", label: "Unqualified" },
  { value: "converted", label: "Converted" },
]

export function LeadForm({
  open,
  onOpenChange,
  lead,
  onSubmit,
  statuses,
  customFields,
  customFieldValues,
  pipelines,
  defaultPipelineId,
  defaultStageId,
  members = [],
  tags = [],
}: LeadFormProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [customValues, setCustomValues] = React.useState<Record<string, string>>({})
  const [selectedPipelineId, setSelectedPipelineId] = React.useState<string | undefined>()
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>([])

  // Build status options from custom statuses or fall back to defaults
  const statusOptions = React.useMemo(() => {
    if (statuses && statuses.length > 0) {
      return statuses.map((s) => ({
        value: s.name.toLowerCase().replace(/\s+/g, "_"),
        label: s.name,
      }))
    }
    return defaultStatuses
  }, [statuses])

  // Get default status value
  const defaultStatusValue = React.useMemo(() => {
    if (statuses && statuses.length > 0) {
      const defaultStatus = statuses.find((s) => s.is_default)
      if (defaultStatus) {
        return defaultStatus.name.toLowerCase().replace(/\s+/g, "_")
      }
      return statuses[0].name.toLowerCase().replace(/\s+/g, "_")
    }
    return "new"
  }, [statuses])

  // Get the selected pipeline object
  const selectedPipeline = React.useMemo(() => {
    if (!selectedPipelineId || !pipelines) return null
    return pipelines.find((p) => p.id === selectedPipelineId) || null
  }, [pipelines, selectedPipelineId])

  // Get available stages for the selected pipeline
  const availableStages = React.useMemo(() => {
    if (!selectedPipeline?.stages) return []
    return [...selectedPipeline.stages].sort((a, b) => a.position - b.position)
  }, [selectedPipeline])

  const [formData, setFormData] = React.useState<Lead>({
    name: "",
    website: "",
    industry: "",
    status: defaultStatusValue,
    notes: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
    pipeline_id: undefined,
    stage_id: undefined,
    source: "",
    assigned_to: undefined,
  })

  // Initialize pipeline selection when dialog opens
  React.useEffect(() => {
    if (!open) return

    if (lead) {
      // Editing existing lead
      setFormData(lead)
      setSelectedPipelineId(lead.pipeline_id)
      setSelectedTagIds(lead.tag_ids || [])
    } else {
      // Creating new lead
      const pipelineId = defaultPipelineId || pipelines?.[0]?.id
      const pipeline = pipelines?.find((p) => p.id === pipelineId)
      const stages = pipeline?.stages?.sort((a, b) => a.position - b.position) || []
      const stageId = defaultStageId || stages[0]?.id

      setSelectedPipelineId(pipelineId)
      setSelectedTagIds([])
      setFormData({
        name: "",
        website: "",
        industry: "",
        status: defaultStatusValue,
        notes: "",
        address: "",
        city: "",
        state: "",
        country: "",
        postal_code: "",
        pipeline_id: pipelineId,
        stage_id: stageId,
        source: "",
        assigned_to: undefined,
      })
    }
  }, [lead, open, defaultStatusValue, defaultPipelineId, defaultStageId, pipelines])

  // Reset custom values when dialog opens/closes or when customFieldValues changes
  React.useEffect(() => {
    if (customFieldValues) {
      setCustomValues(customFieldValues)
    } else {
      setCustomValues({})
    }
  }, [customFieldValues, open])

  // Toggle tag selection
  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    )
  }

  // Render custom field input based on field type
  const renderCustomFieldInput = (field: CustomField) => {
    const value = customValues[field.id] || ""
    const onChange = (val: string) =>
      setCustomValues((prev) => ({ ...prev, [field.id]: val }))

    switch (field.field_type) {
      case "text":
      case "url":
      case "email":
      case "phone":
        return (
          <Input
            id={field.id}
            type={
              field.field_type === "email"
                ? "email"
                : field.field_type === "url"
                  ? "url"
                  : field.field_type === "phone"
                    ? "tel"
                    : "text"
            }
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.is_required}
          />
        )
      case "number":
        return (
          <Input
            id={field.id}
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.is_required}
          />
        )
      case "date":
        return (
          <Input
            id={field.id}
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.is_required}
          />
        )
      case "select":
        return (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={field.id}
              checked={value === "true"}
              onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
            />
            <Label htmlFor={field.id} className="font-normal">
              Yes
            </Label>
          </div>
        )
      default:
        return (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      // Include tag IDs in the form data
      const submitData = {
        ...formData,
        tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      }
      // Only pass custom values if there are any
      const hasCustomValues = Object.keys(customValues).length > 0
      await onSubmit(submitData, hasCustomValues ? customValues : undefined)
      onOpenChange(false)
    } catch (error) {
      console.error("Error submitting lead:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Get the selected assigned user for display
  const selectedMember = members.find((m) => m.profileId === formData.assigned_to)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
          <DialogDescription>
            {lead
              ? "Update the lead information below."
              : "Add a new company or organization to your leads."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Anthropic"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website || ""}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
                placeholder="example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="industry">Industry</Label>
                <Select
                  value={formData.industry || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, industry: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="source">Source</Label>
                <Select
                  value={formData.source || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, source: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {leadSources.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status || defaultStatusValue}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {members.length > 0 && (
                <div className="grid gap-2">
                  <Label htmlFor="assigned_to">Assigned To</Label>
                  <Select
                    value={formData.assigned_to || "unassigned"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        assigned_to: value === "unassigned" ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user">
                        {selectedMember ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={selectedMember.avatarUrl || undefined} />
                              <AvatarFallback className="text-xs">
                                {selectedMember.name?.charAt(0)?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">
                              {selectedMember.displayName || selectedMember.name}
                            </span>
                          </div>
                        ) : (
                          "Unassigned"
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.profileId} value={member.profileId}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={member.avatarUrl || undefined} />
                              <AvatarFallback className="text-xs">
                                {member.name?.charAt(0)?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span>{member.displayName || member.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {pipelines && pipelines.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="pipeline">Pipeline</Label>
                  <Select
                    value={selectedPipelineId || ""}
                    onValueChange={(value) => {
                      setSelectedPipelineId(value)
                      const pipeline = pipelines.find((p) => p.id === value)
                      const stages = pipeline?.stages?.sort((a, b) => a.position - b.position) || []
                      const firstStage = stages[0]
                      setFormData({
                        ...formData,
                        pipeline_id: value,
                        stage_id: firstStage?.id,
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pipeline" />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelines.map((pipeline) => (
                        <SelectItem key={pipeline.id} value={pipeline.id}>
                          {pipeline.name}
                          {pipeline.is_default && " (Default)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="stage">Stage</Label>
                  <Select
                    value={formData.stage_id || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, stage_id: value })
                    }
                    disabled={availableStages.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: stage.color || "#6b7280" }}
                            />
                            {stage.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="grid gap-2">
                <Label>Tags</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "justify-between",
                        selectedTagIds.length === 0 && "text-muted-foreground"
                      )}
                    >
                      {selectedTagIds.length === 0 ? (
                        "Select tags..."
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {selectedTagIds.slice(0, 3).map((tagId) => {
                            const tag = tags.find((t) => t.id === tagId)
                            if (!tag) return null
                            return (
                              <Badge
                                key={tag.id}
                                variant="outline"
                                className="text-xs"
                                style={{
                                  borderColor: tag.color,
                                  backgroundColor: `${tag.color}20`,
                                  color: tag.color,
                                }}
                              >
                                {tag.name}
                              </Badge>
                            )
                          })}
                          {selectedTagIds.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{selectedTagIds.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {tags.map((tag) => {
                        const isSelected = selectedTagIds.includes(tag.id)
                        return (
                          <div
                            key={tag.id}
                            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                            onClick={() => toggleTag(tag.id)}
                          >
                            <Checkbox checked={isSelected} />
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{
                                borderColor: tag.color,
                                backgroundColor: `${tag.color}20`,
                                color: tag.color,
                              }}
                            >
                              {tag.name}
                            </Badge>
                            <span className="flex-1" />
                            {isSelected && <Check className="h-4 w-4 text-sky-500" />}
                          </div>
                        )
                      })}
                    </div>
                    {selectedTagIds.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 text-muted-foreground"
                        onClick={() => setSelectedTagIds([])}
                      >
                        Clear all
                      </Button>
                    )}
                  </PopoverContent>
                </Popover>
                {/* Selected tags display */}
                {selectedTagIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTagIds.map((tagId) => {
                      const tag = tags.find((t) => t.id === tagId)
                      if (!tag) return null
                      return (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="text-xs gap-1"
                          style={{
                            borderColor: tag.color,
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                          <X
                            className="h-3 w-3 cursor-pointer hover:opacity-70"
                            onClick={() => toggleTag(tag.id)}
                          />
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address || ""}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Street address"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder="City"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={formData.state || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                  placeholder="State"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                  placeholder="Country"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, postal_code: e.target.value })
                  }
                  placeholder="Postal code"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Add any notes about this lead..."
                rows={3}
              />
            </div>

            {customFields && customFields.length > 0 && (
              <div className="space-y-4 border-t pt-4 mt-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Custom Fields
                </h4>
                {customFields.map((field) => (
                  <div key={field.id} className="grid gap-2">
                    <Label htmlFor={field.id}>
                      {field.name}
                      {field.is_required && " *"}
                    </Label>
                    {renderCustomFieldInput(field)}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : lead ? "Update Lead" : "Add Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
