"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Phone } from "lucide-react"

interface OwnedNumber {
  id: string
  phone_number: string
  friendly_name: string | null
  is_primary: boolean
}

interface ScheduleCallbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  phoneNumber?: string
  leadId?: string
  contactId?: string
  onScheduled?: () => void
}

export function ScheduleCallbackDialog({
  open,
  onOpenChange,
  phoneNumber = "",
  leadId,
  contactId,
  onScheduled,
}: ScheduleCallbackDialogProps) {
  const [loading, setLoading] = useState(false)
  const [ownedNumbers, setOwnedNumbers] = useState<OwnedNumber[]>([])
  const [loadingNumbers, setLoadingNumbers] = useState(false)

  const [to, setTo] = useState(phoneNumber)
  const [fromNumberId, setFromNumberId] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Fetch owned numbers when dialog opens
  useEffect(() => {
    if (open) {
      setTo(phoneNumber)
      setError(null)
      fetchOwnedNumbers()
    }
  }, [open, phoneNumber])

  const fetchOwnedNumbers = async () => {
    setLoadingNumbers(true)
    try {
      const res = await fetch("/api/twilio/numbers/owned")
      if (res.ok) {
        const data = await res.json()
        setOwnedNumbers(data.numbers || [])
        // Set default to primary number
        const primary = data.numbers?.find((n: OwnedNumber) => n.is_primary)
        if (primary) {
          setFromNumberId(primary.id)
        } else if (data.numbers?.length > 0) {
          setFromNumberId(data.numbers[0].id)
        }
      }
    } catch (err) {
      console.error("Failed to fetch owned numbers:", err)
    } finally {
      setLoadingNumbers(false)
    }
  }

  const formatPhoneNumber = (number: string) => {
    if (number.startsWith("+1") && number.length === 12) {
      return `(${number.slice(2, 5)}) ${number.slice(5, 8)}-${number.slice(8)}`
    }
    return number
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!to.trim()) {
      setError("Phone number is required")
      return
    }

    if (!fromNumberId) {
      setError("Please select a phone number to call from")
      return
    }

    if (!scheduledDate || !scheduledTime) {
      setError("Please select a date and time for the callback")
      return
    }

    const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`)
    if (isNaN(scheduledFor.getTime())) {
      setError("Invalid date/time selected")
      return
    }

    if (scheduledFor <= new Date()) {
      setError("Scheduled time must be in the future")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/communications/call/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          fromNumberId,
          scheduledFor: scheduledFor.toISOString(),
          leadId: leadId || null,
          contactId: contactId || null,
          notes: notes.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to schedule callback")
      }

      // Reset form
      setTo("")
      setScheduledDate("")
      setScheduledTime("")
      setNotes("")
      onOpenChange(false)
      onScheduled?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule callback")
    } finally {
      setLoading(false)
    }
  }

  // Set default date/time to tomorrow at a reasonable hour
  useEffect(() => {
    if (open && !scheduledDate) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      setScheduledDate(tomorrow.toISOString().split("T")[0])
      setScheduledTime("10:00")
    }
  }, [open, scheduledDate])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Schedule Callback
          </DialogTitle>
          <DialogDescription>
            Schedule a reminder to call back at a specific time.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="to">Phone Number *</Label>
            <Input
              id="to"
              type="tel"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="+1 (555) 123-4567"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="from">Call From *</Label>
            {loadingNumbers ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading numbers...
              </div>
            ) : ownedNumbers.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">
                No phone numbers available. Please purchase a number first.
              </div>
            ) : (
              <Select value={fromNumberId} onValueChange={setFromNumberId} required>
                <SelectTrigger id="from">
                  <SelectValue placeholder="Select your number" />
                </SelectTrigger>
                <SelectContent>
                  {ownedNumbers.map((number) => (
                    <SelectItem key={number.id} value={number.id}>
                      <div className="flex items-center gap-2">
                        {formatPhoneNumber(number.phone_number)}
                        {number.friendly_name && (
                          <span className="text-muted-foreground text-xs">
                            ({number.friendly_name})
                          </span>
                        )}
                        {number.is_primary && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            Primary
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes for this callback..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !to.trim() || !fromNumberId || !scheduledDate || !scheduledTime}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule Callback
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
