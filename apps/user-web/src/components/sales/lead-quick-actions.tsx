"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MessageSquareIcon,
  FileTextIcon,
  Loader2Icon,
  AlertCircleIcon,
} from "lucide-react"

interface Contact {
  id?: string
  first_name: string
  last_name?: string
  phone?: string
  email?: string
}

interface OwnedNumber {
  id: string
  phone_number: string
  friendly_name: string | null
  is_primary: boolean
}

interface QuickActionProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string
  contacts: Contact[]
  onSuccess?: () => void
}

function formatPhone(phone: string): string {
  const match = phone.match(/^\+1(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  return phone
}

// SMS Dialog
export function SmsDialog({ open, onOpenChange, leadId, contacts, onSuccess }: QuickActionProps) {
  const [selectedContactId, setSelectedContactId] = React.useState<string>("")
  const [selectedNumberId, setSelectedNumberId] = React.useState<string>("")
  const [message, setMessage] = React.useState("")
  const [ownedNumbers, setOwnedNumbers] = React.useState<OwnedNumber[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSending, setIsSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const contactsWithPhone = contacts.filter((c): c is Contact & { id: string; phone: string } => !!c.phone && !!c.id)

  // Fetch owned numbers when dialog opens
  React.useEffect(() => {
    if (open) {
      setIsLoading(true)
      setError(null)
      fetch("/api/twilio/numbers/owned")
        .then((res) => res.json())
        .then((data) => {
          const numbers = data.numbers || []
          setOwnedNumbers(numbers)
          const primary = numbers.find((n: OwnedNumber) => n.is_primary)
          if (primary) setSelectedNumberId(primary.id)
          else if (numbers.length > 0) setSelectedNumberId(numbers[0].id)
        })
        .catch(() => setError("Failed to load phone numbers"))
        .finally(() => setIsLoading(false))

      // Default to first contact with phone
      if (contactsWithPhone.length > 0 && !selectedContactId) {
        setSelectedContactId(contactsWithPhone[0].id)
      }
    }
  }, [open, contactsWithPhone, selectedContactId])

  const selectedContact = contacts.find((c) => c.id === selectedContactId)

  const handleSend = async () => {
    if (!selectedContact?.phone || !selectedNumberId || !message.trim()) return

    setIsSending(true)
    setError(null)

    try {
      const res = await fetch("/api/communications/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedContact.phone,
          message: message.trim(),
          leadId,
          contactId: selectedContactId,
          fromNumberId: selectedNumberId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to send SMS")
        return
      }

      setMessage("")
      onOpenChange(false)
      onSuccess?.()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareIcon className="size-5" />
            Send SMS
          </DialogTitle>
          <DialogDescription>
            Send a text message to a contact on this lead.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : ownedNumbers.length === 0 ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <AlertCircleIcon className="size-4 shrink-0" />
            <span className="text-sm">
              You need a phone number to send SMS.{" "}
              <a href="/sales/settings/phone-numbers" className="font-medium underline">
                Purchase one
              </a>
            </span>
          </div>
        ) : contactsWithPhone.length === 0 ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <AlertCircleIcon className="size-4 shrink-0" />
            <span className="text-sm">No contacts have a phone number.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                <AlertCircleIcon className="size-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>To</Label>
              <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {contactsWithPhone.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name} ({contact.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>From</Label>
              <Select value={selectedNumberId} onValueChange={setSelectedNumberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your number" />
                </SelectTrigger>
                <SelectContent>
                  {ownedNumbers.map((num) => (
                    <SelectItem key={num.id} value={num.id}>
                      {formatPhone(num.phone_number)}
                      {num.is_primary && " (Primary)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                rows={4}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !selectedContact?.phone || !selectedNumberId || !message.trim()}
          >
            {isSending && <Loader2Icon className="size-4 mr-2 animate-spin" />}
            Send SMS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Note Dialog
interface NoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string
  onSuccess?: () => void
}

export function NoteDialog({ open, onOpenChange, leadId, onSuccess }: NoteDialogProps) {
  const [subject, setSubject] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSave = async () => {
    if (!description.trim()) return

    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/leads/${leadId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "note",
          subject: subject.trim() || "Note",
          description: description.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to save note")
        return
      }

      setSubject("")
      setDescription("")
      onOpenChange(false)
      onSuccess?.()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon className="size-5" />
            Add Note
          </DialogTitle>
          <DialogDescription>
            Add a note to this lead for future reference.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              <AlertCircleIcon className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Subject (optional)</Label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief subject..."
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write your note here..."
              rows={6}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !description.trim()}>
            {isSaving && <Loader2Icon className="size-4 mr-2 animate-spin" />}
            Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
