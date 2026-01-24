"use client"

import { useState } from "react"
import { useSales, type Deal } from "@/providers/sales-provider"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DollarSign,
  Calendar,
  User,
  Percent,
  Building2,
  Mail,
  Phone,
  Loader2,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DealDetailSheetProps {
  deal: Deal | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DealDetailSheet({ deal, open, onOpenChange }: DealDetailSheetProps) {
  const { currentPipeline, updateDeal, deleteDeal, moveDealToStage } = useSales()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  // Edit form state
  const [name, setName] = useState("")
  const [value, setValue] = useState("")
  const [notes, setNotes] = useState("")
  const [expectedCloseDate, setExpectedCloseDate] = useState("")
  const [status, setStatus] = useState<"open" | "won" | "lost">("open")

  const stages = currentPipeline?.stages || []

  const startEditing = () => {
    if (!deal) return
    setName(deal.name)
    setValue(deal.value?.toString() || "")
    setNotes(deal.notes || "")
    setExpectedCloseDate(deal.expected_close_date || "")
    setStatus(deal.status)
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
  }

  const saveChanges = async () => {
    if (!deal) return
    setLoading(true)
    try {
      await updateDeal(deal.id, {
        name,
        value: value ? parseFloat(value) : null,
        notes: notes || null,
        expected_close_date: expectedCloseDate || null,
        status,
        actual_close_date: status !== "open" ? new Date().toISOString().split("T")[0] : null,
      })
      setEditing(false)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deal) return
    if (!confirm("Are you sure you want to delete this deal?")) return

    setLoading(true)
    try {
      await deleteDeal(deal.id)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  const handleStageChange = async (stageId: string) => {
    if (!deal) return
    setLoading(true)
    try {
      await moveDealToStage(deal.id, stageId)
    } finally {
      setLoading(false)
    }
  }

  if (!deal) return null

  const contactName = deal.contact
    ? `${deal.contact.first_name} ${deal.contact.last_name || ""}`.trim()
    : null

  const formatCurrency = (val: number | null) => {
    if (val === null) return "-"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: deal.currency || "USD",
      minimumFractionDigits: 0,
    }).format(val)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-xl">
                {editing ? (
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-xl font-semibold h-auto py-1 px-2 -ml-2"
                  />
                ) : (
                  deal.name
                )}
              </SheetTitle>
              <SheetDescription>
                Created {new Date(deal.created_at).toLocaleDateString()}
              </SheetDescription>
            </div>
            <Badge
              variant={
                deal.status === "won" ? "default" :
                deal.status === "lost" ? "destructive" : "secondary"
              }
              className={cn(
                deal.status === "won" && "bg-emerald-500"
              )}
            >
              {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
            </Badge>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Value
              </div>
              {editing ? (
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
              ) : (
                <div className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(deal.value)}
                </div>
              )}
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Percent className="h-4 w-4" />
                Probability
              </div>
              <div className="text-2xl font-bold">
                {deal.probability !== null ? `${deal.probability}%` : "-"}
              </div>
            </div>
          </div>

          {/* Stage Selector */}
          <div className="space-y-2">
            <Label>Pipeline Stage</Label>
            <Select
              value={deal.stage_id || ""}
              onValueChange={handleStageChange}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: stage.color || "#6b7280" }}
                      />
                      {stage.name}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({stage.win_probability}%)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expected Close Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Expected Close Date
            </Label>
            {editing ? (
              <Input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
              />
            ) : (
              <div className="text-sm">
                {deal.expected_close_date
                  ? new Date(deal.expected_close_date).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Not set"
                }
              </div>
            )}
          </div>

          {/* Status (when editing) */}
          {editing && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "open" | "won" | "lost")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          {/* Contact Info */}
          {deal.contact && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Contact
              </Label>
              <div className="rounded-lg border p-4 space-y-2">
                <div className="font-medium">{contactName}</div>
                {deal.contact.company && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    {deal.contact.company}
                  </div>
                )}
                {deal.contact.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {deal.contact.email}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            {editing ? (
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this deal..."
                rows={4}
              />
            ) : (
              <div className="text-sm text-muted-foreground rounded-lg border p-3 min-h-[80px]">
                {deal.notes || "No notes added"}
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button
                  variant="outline"
                  onClick={cancelEditing}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={saveChanges} disabled={loading} className="flex-1">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={startEditing}
                  className="flex-1"
                >
                  Edit Deal
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
