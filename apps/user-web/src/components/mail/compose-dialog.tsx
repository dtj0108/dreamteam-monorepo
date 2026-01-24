"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Send, Loader2, ChevronDown, Trash2, Save } from "lucide-react"
import { cn } from "@/lib/utils"
import { MailDetail } from "./mail-display"
import { EmailEditor, EmailEditorRef } from "./email-editor"

export type ComposeMode = 'compose' | 'reply' | 'reply-all' | 'forward' | 'draft'

export interface DraftData {
  id: string
  to: Array<{ email: string; name?: string }>
  cc: Array<{ email: string; name?: string }>
  bcc: Array<{ email: string; name?: string }>
  subject: string | null
  body: string
}

interface ComposeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: ComposeMode
  originalEmail?: MailDetail | null
  draft?: DraftData | null
  grantId: string | null
  senderEmail?: string
  onSend?: () => void
  onDraftSaved?: () => void
}

export function ComposeDialog({
  open,
  onOpenChange,
  mode = 'compose',
  originalEmail,
  draft,
  grantId,
  senderEmail,
  onSend,
  onDraftSaved,
}: ComposeDialogProps) {
  const [to, setTo] = useState("")
  const [cc, setCc] = useState("")
  const [bcc, setBcc] = useState("")
  const [subject, setSubject] = useState("")
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [sending, setSending] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const editorRef = useRef<EmailEditorRef>(null)
  const [initialContent, setInitialContent] = useState("")

  // Initialize fields based on mode and original email
  const initializeFields = useCallback(() => {
    const formatRecipients = (recipients: Array<{ email: string; name?: string }>) =>
      recipients.map(r => r.name ? `${r.name} <${r.email}>` : r.email).join(", ")

    // Handle draft mode
    if (mode === 'draft' && draft) {
      setTo(formatRecipients(draft.to))
      setCc(formatRecipients(draft.cc))
      setBcc(formatRecipients(draft.bcc))
      setSubject(draft.subject || "")
      setInitialContent(draft.body || "")
      setShowCcBcc(draft.cc.length > 0 || draft.bcc.length > 0)
      setCurrentDraftId(draft.id)
      setError(null)
      return
    }

    // Reset draft ID for non-draft modes
    setCurrentDraftId(null)

    if (!originalEmail) {
      setTo("")
      setCc("")
      setBcc("")
      setSubject("")
      setInitialContent("")
      setShowCcBcc(false)
      setError(null)
      return
    }

    const originalFrom = formatRecipients(originalEmail.from)

    switch (mode) {
      case 'reply':
        setTo(originalFrom)
        setCc("")
        setSubject(originalEmail.subject?.startsWith("Re:") ? originalEmail.subject : `Re: ${originalEmail.subject || ""}`)
        setShowCcBcc(false)
        break
      case 'reply-all':
        setTo(originalFrom)
        const allRecipients = [...originalEmail.to, ...originalEmail.cc]
          .filter(r => r.email !== senderEmail)
        setCc(formatRecipients(allRecipients))
        setShowCcBcc(allRecipients.length > 0)
        setSubject(originalEmail.subject?.startsWith("Re:") ? originalEmail.subject : `Re: ${originalEmail.subject || ""}`)
        break
      case 'forward':
        setTo("")
        setCc("")
        setSubject(originalEmail.subject?.startsWith("Fwd:") ? originalEmail.subject : `Fwd: ${originalEmail.subject || ""}`)
        setShowCcBcc(false)
        break
      default:
        setTo("")
        setCc("")
        setSubject("")
        setShowCcBcc(false)
    }

    // Add quoted original message for reply/forward
    if (mode !== 'compose' && mode !== 'draft') {
      const date = new Date(originalEmail.date * 1000).toLocaleString()
      const quotedHtml = `
        <br><br>
        <div style="border-left: 2px solid #ccc; padding-left: 12px; margin-left: 0; color: #666;">
          <p style="margin: 0 0 8px 0; font-size: 12px;">
            On ${date}, ${originalFrom} wrote:
          </p>
          <blockquote style="margin: 0;">
            ${originalEmail.body || ''}
          </blockquote>
        </div>
      `
      setInitialContent(quotedHtml)
    } else {
      setInitialContent("")
    }

    setBcc("")
    setError(null)
  }, [originalEmail, mode, senderEmail, draft])

  // Reset fields when dialog opens
  useEffect(() => {
    if (open) {
      initializeFields()
    }
  }, [open, initializeFields])

  const parseRecipients = (input: string): Array<{ email: string; name?: string }> => {
    if (!input.trim()) return []

    return input.split(",").map(part => {
      const trimmed = part.trim()
      const match = trimmed.match(/^(.+?)\s*<(.+?)>$/)
      if (match) {
        return { name: match[1].trim(), email: match[2].trim() }
      }
      return { email: trimmed }
    }).filter(r => r.email)
  }

  const handleSend = async () => {
    if (!grantId) {
      setError("No email account connected")
      return
    }

    const toRecipients = parseRecipients(to)
    if (toRecipients.length === 0) {
      setError("Please add at least one recipient")
      return
    }

    if (!subject.trim()) {
      setError("Please add a subject")
      return
    }

    const body = editorRef.current?.getHTML() || ""

    setSending(true)
    setError(null)

    try {
      // If editing a draft, send the draft directly
      if (currentDraftId) {
        // First update the draft with latest content
        await fetch(`/api/nylas/drafts/${currentDraftId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grantId,
            to: toRecipients,
            cc: parseRecipients(cc),
            bcc: parseRecipients(bcc),
            subject,
            body,
          }),
        })

        // Then send the draft
        const response = await fetch(`/api/nylas/drafts/${currentDraftId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grantId }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to send email")
        }
      } else {
        const response = await fetch("/api/nylas/emails/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grantId,
            to: toRecipients,
            cc: parseRecipients(cc),
            bcc: parseRecipients(bcc),
            subject,
            body,
            replyToMessageId: mode !== 'compose' && mode !== 'forward' && mode !== 'draft' ? originalEmail?.id : undefined,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to send email")
        }
      }

      onOpenChange(false)
      onSend?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send email"
      setError(errorMessage)
    } finally {
      setSending(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!grantId) {
      setError("No email account connected")
      return
    }

    const body = editorRef.current?.getHTML() || ""
    const toRecipients = parseRecipients(to)
    const ccRecipients = parseRecipients(cc)
    const bccRecipients = parseRecipients(bcc)

    setSavingDraft(true)
    setError(null)

    try {
      if (currentDraftId) {
        // Update existing draft
        const response = await fetch(`/api/nylas/drafts/${currentDraftId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grantId,
            to: toRecipients,
            cc: ccRecipients,
            bcc: bccRecipients,
            subject,
            body,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to save draft")
        }
      } else {
        // Create new draft
        const response = await fetch("/api/nylas/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grantId,
            to: toRecipients,
            cc: ccRecipients,
            bcc: bccRecipients,
            subject,
            body,
            replyToMessageId: mode !== 'compose' && mode !== 'forward' && mode !== 'draft' ? originalEmail?.id : undefined,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to save draft")
        }

        const data = await response.json()
        setCurrentDraftId(data.id)
      }

      onDraftSaved?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save draft"
      setError(errorMessage)
    } finally {
      setSavingDraft(false)
    }
  }

  const getTitle = () => {
    switch (mode) {
      case 'reply': return 'Reply'
      case 'reply-all': return 'Reply All'
      case 'forward': return 'Forward'
      case 'draft': return 'Edit Draft'
      default: return 'New Message'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b bg-muted/30">
          <DialogTitle className="font-semibold text-base">{getTitle()}</DialogTitle>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Recipients */}
          <div className="border-b">
            {/* To */}
            <div className="flex items-center px-4 py-2 gap-2">
              <span className="text-sm text-muted-foreground w-12">To</span>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Recipients"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                Cc/Bcc
                <ChevronDown className={cn("h-3 w-3 transition-transform", showCcBcc && "rotate-180")} />
              </button>
            </div>

            {/* Cc/Bcc */}
            {showCcBcc && (
              <>
                <div className="flex items-center px-4 py-2 gap-2 border-t">
                  <span className="text-sm text-muted-foreground w-12">Cc</span>
                  <input
                    type="text"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="Cc recipients"
                    className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                  />
                </div>
                <div className="flex items-center px-4 py-2 gap-2 border-t">
                  <span className="text-sm text-muted-foreground w-12">Bcc</span>
                  <input
                    type="text"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="Bcc recipients"
                    className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                  />
                </div>
              </>
            )}
          </div>

          {/* Subject */}
          <div className="px-4 py-2 border-b">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full bg-transparent outline-none text-sm font-medium placeholder:text-muted-foreground placeholder:font-normal"
            />
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-auto">
            <EmailEditor
              ref={editorRef}
              placeholder="Write your message..."
              initialContent={initialContent}
              disabled={sending}
              className="border-0 rounded-none [&>div:first-child]:border-t-0 [&>div:first-child]:rounded-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-3 border-t flex items-center justify-between bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={sending || savingDraft}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={sending || savingDraft}
              >
                {savingDraft ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Draft
              </Button>

              <Button onClick={handleSend} disabled={sending || savingDraft} size="sm">
                {sending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
