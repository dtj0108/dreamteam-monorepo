"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MailIcon,
  Loader2Icon,
  AlertCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  CalendarIcon,
} from "lucide-react"
import { EmailEditor, type EmailEditorRef } from "@/components/mail/email-editor"
import type { EmailTemplate } from "@/types/email-template"

interface Contact {
  id?: string
  first_name: string
  last_name?: string
  email?: string
}

interface NylasGrant {
  id: string
  email: string
  provider: string
  status: string
}

interface EmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string
  contact: Contact
  leadName?: string
  leadCompany?: string
  onSuccess?: () => void
}

export function EmailDialog({
  open,
  onOpenChange,
  leadId,
  contact,
  leadName,
  leadCompany,
  onSuccess,
}: EmailDialogProps) {
  const [grants, setGrants] = React.useState<NylasGrant[]>([])
  const [selectedGrantId, setSelectedGrantId] = React.useState<string>("")
  const [templates, setTemplates] = React.useState<EmailTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>("")
  const [subject, setSubject] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSending, setIsSending] = React.useState(false)
  const [isScheduling, setIsScheduling] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Schedule state
  const [schedulePopoverOpen, setSchedulePopoverOpen] = React.useState(false)
  const [scheduleDate, setScheduleDate] = React.useState<Date | undefined>(undefined)
  const [scheduleTime, setScheduleTime] = React.useState("09:00")

  const editorRef = React.useRef<EmailEditorRef>(null)

  const contactDisplayName = contact.last_name
    ? `${contact.first_name} ${contact.last_name}`
    : contact.first_name

  // Fetch Nylas grants when dialog opens
  React.useEffect(() => {
    if (open) {
      setIsLoading(true)
      setError(null)

      Promise.all([
        fetch("/api/nylas/grants").then((res) => res.json()),
        fetch("/api/email-templates?active_only=true").then((res) => res.json()),
      ])
        .then(([grantsData, templatesData]) => {
          const activeGrants = (grantsData.grants || []).filter(
            (g: NylasGrant) => g.status === "active"
          )
          setGrants(activeGrants)
          setTemplates(templatesData || [])

          // Default to first grant
          if (activeGrants.length > 0 && !selectedGrantId) {
            setSelectedGrantId(activeGrants[0].id)
          }
        })
        .catch(() => {
          setError("Failed to load email accounts")
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [open, selectedGrantId])

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSubject("")
      setSelectedTemplateId("")
      setError(null)
      setScheduleDate(undefined)
      setScheduleTime("09:00")
      setSchedulePopoverOpen(false)
      editorRef.current?.clear()
    }
  }, [open])

  // Apply template with variable substitution
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId)

    if (templateId === "none" || !templateId) {
      return
    }

    const template = templates.find((t) => t.id === templateId)
    if (!template) return

    // Substitute variables
    const substitutions: Record<string, string | undefined> = {
      "{{contact_first_name}}": contact.first_name,
      "{{contact_last_name}}": contact.last_name,
      "{{contact_email}}": contact.email,
      "{{lead_name}}": leadName,
      "{{lead_company}}": leadCompany || leadName,
    }

    let processedSubject = template.subject
    let processedBody = template.body

    for (const [variable, value] of Object.entries(substitutions)) {
      if (value) {
        const regex = new RegExp(variable.replace(/[{}]/g, "\\$&"), "g")
        processedSubject = processedSubject.replace(regex, value)
        processedBody = processedBody.replace(regex, value)
      }
    }

    setSubject(processedSubject)
    editorRef.current?.setContent(processedBody)
  }

  const handleSend = async () => {
    if (!selectedGrantId || !contact.email || !subject.trim()) return

    const body = editorRef.current?.getHTML() || ""

    setIsSending(true)
    setError(null)

    try {
      const res = await fetch("/api/nylas/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grantId: selectedGrantId,
          to: [{ email: contact.email, name: contactDisplayName }],
          subject: subject.trim(),
          body,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to send email")
        return
      }

      // Create activity record on the lead
      await fetch(`/api/leads/${leadId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email",
          subject: `Email: ${subject.trim()}`,
          description: `Sent email to ${contactDisplayName} (${contact.email})`,
          contact_id: contact.id,
          is_completed: true,
        }),
      })

      onOpenChange(false)
      onSuccess?.()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  const handleSchedule = async () => {
    if (!selectedGrantId || !contact.email || !subject.trim() || !scheduleDate) return

    const body = editorRef.current?.getHTML() || ""

    setIsScheduling(true)
    setError(null)

    // Combine date and time
    const [hours, minutes] = scheduleTime.split(":").map(Number)
    const scheduledFor = new Date(scheduleDate)
    scheduledFor.setHours(hours, minutes, 0, 0)

    try {
      const res = await fetch("/api/communications/email/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grantId: selectedGrantId,
          toEmail: contact.email,
          toName: contactDisplayName,
          subject: subject.trim(),
          body,
          leadId,
          contactId: contact.id,
          scheduledFor: scheduledFor.toISOString(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to schedule email")
        return
      }

      setSchedulePopoverOpen(false)
      onOpenChange(false)
      onSuccess?.()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setIsScheduling(false)
    }
  }

  // Generate time options (every 15 minutes)
  const timeOptions = React.useMemo(() => {
    const options: string[] = []
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hour = h.toString().padStart(2, "0")
        const minute = m.toString().padStart(2, "0")
        options.push(`${hour}:${minute}`)
      }
    }
    return options
  }, [])

  const formatTimeOption = (time: string) => {
    const [h, m] = time.split(":")
    const hour = parseInt(h)
    const ampm = hour >= 12 ? "PM" : "AM"
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${hour12}:${m} ${ampm}`
  }

  const selectedGrant = grants.find((g) => g.id === selectedGrantId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MailIcon className="size-5" />
            Send Email
          </DialogTitle>
          <DialogDescription>
            Compose and send an email to {contactDisplayName}.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : grants.length === 0 ? (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <AlertCircleIcon className="size-5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">No email account connected</p>
              <p className="mt-1">
                Connect your Google or Microsoft email account to send emails.{" "}
                <a
                  href="/sales/settings/email"
                  className="font-medium underline underline-offset-2 hover:text-amber-900"
                >
                  Connect account
                </a>
              </p>
            </div>
          </div>
        ) : !contact.email ? (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <AlertCircleIcon className="size-5 shrink-0" />
            <span className="text-sm">
              This contact doesn't have an email address. Add an email to send messages.
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                <AlertCircleIcon className="size-4 shrink-0" />
                {error}
              </div>
            )}

            {/* To */}
            <div className="space-y-2">
              <Label>To</Label>
              <Input
                value={`${contactDisplayName} <${contact.email}>`}
                disabled
                className="bg-muted"
              />
            </div>

            {/* From */}
            <div className="space-y-2">
              <Label>From</Label>
              <Select value={selectedGrantId} onValueChange={setSelectedGrantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select email account" />
                </SelectTrigger>
                <SelectContent>
                  {grants.map((grant) => (
                    <SelectItem key={grant.id} value={grant.id}>
                      {grant.email}
                      <span className="text-muted-foreground ml-1">
                        ({grant.provider === "google" ? "Google" : "Microsoft"})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template */}
            <div className="space-y-2">
              <Label>Template (optional)</Label>
              <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template - write custom</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex flex-col">
                        <span>{template.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {template.subject}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label>Message</Label>
              <EmailEditor
                ref={editorRef}
                placeholder="Write your email message..."
                className="min-h-[200px]"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {grants.length > 0 && contact.email && (
            <div className="flex">
              <Button
                onClick={handleSend}
                disabled={
                  isSending ||
                  isScheduling ||
                  !selectedGrantId ||
                  !subject.trim()
                }
                className="rounded-r-none"
              >
                {isSending && <Loader2Icon className="size-4 mr-2 animate-spin" />}
                Send Email
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="default"
                    className="rounded-l-none border-l border-primary-foreground/20 px-2"
                    disabled={isSending || isScheduling || !selectedGrantId || !subject.trim()}
                  >
                    <ChevronDownIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Popover open={schedulePopoverOpen} onOpenChange={setSchedulePopoverOpen}>
                    <PopoverTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault()
                          setSchedulePopoverOpen(true)
                        }}
                      >
                        <ClockIcon className="size-4 mr-2" />
                        Schedule for later
                      </DropdownMenuItem>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4" align="end">
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm">Schedule Email</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm text-muted-foreground mb-1 block">
                              Date
                            </label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal"
                                >
                                  <CalendarIcon className="mr-2 size-4" />
                                  {scheduleDate
                                    ? scheduleDate.toLocaleDateString()
                                    : "Select date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={scheduleDate}
                                  onSelect={setScheduleDate}
                                  disabled={(date) =>
                                    date < new Date(new Date().setHours(0, 0, 0, 0))
                                  }
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground mb-1 block">
                              Time
                            </label>
                            <Select value={scheduleTime} onValueChange={setScheduleTime}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select time" />
                              </SelectTrigger>
                              <SelectContent>
                                {timeOptions.map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {formatTimeOption(time)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSchedulePopoverOpen(false)
                              setScheduleDate(undefined)
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSchedule}
                            disabled={!scheduleDate || isScheduling}
                          >
                            {isScheduling ? (
                              <Loader2Icon className="size-4 animate-spin mr-2" />
                            ) : (
                              <ClockIcon className="size-4 mr-2" />
                            )}
                            Schedule
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
