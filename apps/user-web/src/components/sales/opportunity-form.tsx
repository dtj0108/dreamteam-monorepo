"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, TrendingUp } from "lucide-react"
import type { OpportunityStatus, ValueType } from "@/types/opportunity"
import { formatOpportunityValue, getOpportunityStatusColor } from "@/types/opportunity"

export interface LeadOpportunity {
  id?: string
  name: string
  value?: number
  stage?: string
  probability?: number
  expected_close_date?: string
  notes?: string
  status?: OpportunityStatus
  value_type?: ValueType
  contact_id?: string
}

interface Contact {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

interface OpportunityFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunity?: LeadOpportunity
  onSubmit: (opportunity: LeadOpportunity) => Promise<void>
  contacts?: Contact[]
}

const stages = [
  { value: "prospect", label: "Prospect" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closing", label: "Closing" },
]

const statusOptions: { value: OpportunityStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
]

export function OpportunityForm({
  open,
  onOpenChange,
  opportunity,
  onSubmit,
  contacts = [],
}: OpportunityFormProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [formData, setFormData] = React.useState<LeadOpportunity>({
    name: "",
    value: undefined,
    stage: "prospect",
    probability: 0,
    expected_close_date: "",
    notes: "",
    status: "active",
    value_type: "one_time",
    contact_id: undefined,
  })

  React.useEffect(() => {
    if (opportunity) {
      setFormData({
        ...opportunity,
        expected_close_date: opportunity.expected_close_date || "",
        status: opportunity.status || "active",
        value_type: opportunity.value_type || "one_time",
      })
    } else {
      setFormData({
        name: "",
        value: undefined,
        stage: "prospect",
        probability: 0,
        expected_close_date: "",
        notes: "",
        status: "active",
        value_type: "one_time",
        contact_id: undefined,
      })
    }
  }, [opportunity, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await onSubmit(formData)
      onOpenChange(false)
    } catch (error) {
      console.error("Error submitting opportunity:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate expected value
  const expectedValue = formData.value
    ? formData.value * ((formData.probability || 0) / 100)
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {opportunity ? "Edit Opportunity" : "Add Opportunity"}
          </DialogTitle>
          <DialogDescription>
            {opportunity
              ? "Update the opportunity details below."
              : "Create a new opportunity for this lead."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Opportunity name"
                required
              />
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label>Status</Label>
              <div className="flex gap-2">
                {statusOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={formData.status === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({ ...formData, status: option.value })}
                    className={formData.status === option.value ? getOpportunityStatusColor(option.value) : ""}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Value + Value Type */}
            <div className="grid gap-2">
              <Label htmlFor="value">Value</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="value"
                    type="number"
                    value={formData.value || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        value: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    placeholder="0.00"
                    className="pl-9"
                  />
                </div>
                <Tabs
                  value={formData.value_type || "one_time"}
                  onValueChange={(v) =>
                    setFormData({ ...formData, value_type: v as ValueType })
                  }
                >
                  <TabsList>
                    <TabsTrigger value="one_time">One-time</TabsTrigger>
                    <TabsTrigger value="recurring">Monthly</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Probability + Expected Value */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="probability">Confidence (%)</Label>
                <Input
                  id="probability"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      probability: e.target.value ? parseInt(e.target.value) : 0,
                    })
                  }
                  placeholder="0"
                />
              </div>

              <div className="grid gap-2">
                <Label>Expected Value</Label>
                <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50">
                  <TrendingUp className="h-4 w-4 text-muted-foreground mr-2" />
                  <span className="font-medium">
                    {expectedValue !== null
                      ? formatOpportunityValue(expectedValue, "one_time")
                      : "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Stage + Close Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stage">Stage</Label>
                <Select
                  value={formData.stage || "prospect"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, stage: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.value} value={stage.value}>
                        {stage.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="expected_close_date">Expected Close</Label>
                <Input
                  id="expected_close_date"
                  type="date"
                  value={formData.expected_close_date || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, expected_close_date: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Contact Selector (only if contacts provided) */}
            {contacts.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="contact">Contact</Label>
                <Select
                  value={formData.contact_id || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      contact_id: value === "none" ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No contact</SelectItem>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {`${contact.first_name || ""} ${contact.last_name || ""}`.trim() ||
                          contact.email ||
                          "Unnamed contact"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Add notes..."
                rows={3}
              />
            </div>
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
              {isLoading
                ? "Saving..."
                : opportunity
                ? "Update"
                : "Add Opportunity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
