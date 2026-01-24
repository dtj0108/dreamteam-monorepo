"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Reply,
  Forward,
  Star,
  Trash2,
  MailOpen,
  Mail,
  MoreVertical,
  Paperclip,
  Download,
  FileText,
  FileImage,
  FileArchive,
  FileSpreadsheet,
  File
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export interface MailAttachment {
  id: string
  filename: string | null
  contentType: string
  size: number
  contentId: string | null
  isInline: boolean
}

export interface MailDetail {
  id: string
  from: Array<{ email: string; name?: string }>
  to: Array<{ email: string; name?: string }>
  cc: Array<{ email: string; name?: string }>
  replyTo: Array<{ email: string; name?: string }>
  subject: string | null
  body: string
  date: number
  unread: boolean
  starred: boolean
  hasAttachments: boolean
  attachments?: MailAttachment[]
}

interface MailDisplayProps {
  email: MailDetail | null
  grantId?: string | null
  onToggleStar?: (starred: boolean) => void
  onToggleRead?: (unread: boolean) => void
  onDelete?: () => void
  onReply?: () => void
  onReplyAll?: () => void
  onForward?: () => void
  loading?: boolean
}

export function MailDisplay({ email, grantId, onToggleStar, onToggleRead, onDelete, onReply, onReplyAll, onForward, loading }: MailDisplayProps) {
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">Loading email...</div>
      </div>
    )
  }

  if (!email) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-muted-foreground">
        <Mail className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">Select an email to read</p>
        <p className="text-sm">Choose an email from the list to view its contents</p>
      </div>
    )
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getSenderName = (from: Array<{ email: string; name?: string }>) => {
    if (from.length === 0) return 'Unknown'
    return from[0].name || from[0].email
  }

  const getSenderEmail = (from: Array<{ email: string; name?: string }>) => {
    if (from.length === 0) return ''
    return from[0].email
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatRecipients = (recipients: Array<{ email: string; name?: string }>) => {
    return recipients.map(r => r.name || r.email).join(', ')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return FileImage
    if (contentType.includes('pdf')) return FileText
    if (contentType.includes('spreadsheet') || contentType.includes('excel') || contentType.includes('csv')) return FileSpreadsheet
    if (contentType.includes('zip') || contentType.includes('compressed') || contentType.includes('archive')) return FileArchive
    return File
  }

  const handleDownloadAttachment = (attachmentId: string, filename: string | null) => {
    if (!grantId) return
    const url = `/api/nylas/emails/${email.id}/attachments/${attachmentId}?grantId=${grantId}`

    // Create a temporary link to trigger download
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'attachment'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filter out inline attachments (used in HTML body)
  const downloadableAttachments = email.attachments?.filter(att => !att.isInline) || []

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Email Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="Reply" onClick={onReply}>
            <Reply className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Forward" onClick={onForward}>
            <Forward className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            title={email.starred ? "Unstar" : "Star"}
            onClick={() => onToggleStar?.(!email.starred)}
          >
            <Star className={cn("h-4 w-4", email.starred && "fill-yellow-500 text-yellow-500")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={email.unread ? "Mark as read" : "Mark as unread"}
            onClick={() => onToggleRead?.(!email.unread)}
          >
            {email.unread ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onReplyAll}>
                <Reply className="mr-2 h-4 w-4" />
                Reply All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        {/* Subject */}
        <h1 className="text-xl font-semibold mb-4">
          {email.subject || "(No subject)"}
        </h1>

        {/* Sender Info */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {getInitials(getSenderName(email.from))}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{getSenderName(email.from)}</span>
                <span className="text-muted-foreground text-sm ml-2">
                  &lt;{getSenderEmail(email.from)}&gt;
                </span>
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {formatDate(email.date)}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              To: {formatRecipients(email.to)}
              {email.cc.length > 0 && (
                <span className="ml-2">Cc: {formatRecipients(email.cc)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Attachments */}
        {downloadableAttachments.length > 0 && (
          <div className="mb-4 p-3 bg-muted rounded-md">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium">
              <Paperclip className="h-4 w-4" />
              <span>{downloadableAttachments.length} Attachment{downloadableAttachments.length > 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2">
              {downloadableAttachments.map((attachment) => {
                const FileIcon = getFileIcon(attachment.contentType)
                return (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 p-2 bg-background rounded border hover:bg-muted/50 transition-colors"
                  >
                    <FileIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {attachment.filename || 'Untitled attachment'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>
                    {grantId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => handleDownloadAttachment(attachment.id, attachment.filename)}
                        title="Download attachment"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <Separator className="my-4" />

        {/* Email Body - rendered in sandboxed iframe for security */}
        <iframe
          sandbox=""
          srcDoc={email.body}
          className="w-full flex-1 border-0 min-h-[400px] bg-white"
          title="Email content"
        />
      </div>
    </div>
  )
}
