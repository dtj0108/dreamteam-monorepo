"use client"

import { type PendingAttachment, isImageFile } from "@/types/files"
import { AttachmentPreviewItem } from "./attachment-preview-item"
import { cn } from "@/lib/utils"

interface AttachmentPreviewAreaProps {
  attachments: PendingAttachment[]
  onRemove: (id: string) => void
  onRetry?: (id: string) => void
  className?: string
}

export function AttachmentPreviewArea({
  attachments,
  onRemove,
  onRetry,
  className,
}: AttachmentPreviewAreaProps) {
  if (attachments.length === 0) return null

  // Separate images and files for different layouts
  const images = attachments.filter((a) => isImageFile(a.file.type, a.file.name))
  const files = attachments.filter((a) => !isImageFile(a.file.type, a.file.name))

  return (
    <div className={cn("border-b border-border/40 p-3 space-y-3", className)}>
      {/* Image grid */}
      {images.length > 0 && (
        <div className="flex flex-wrap justify-start gap-2">
          {images.map((attachment) => (
            <AttachmentPreviewItem
              key={attachment.id}
              attachment={attachment}
              onRemove={() => onRemove(attachment.id)}
              onRetry={onRetry ? () => onRetry(attachment.id) : undefined}
            />
          ))}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="flex flex-wrap justify-start gap-2">
          {files.map((attachment) => (
            <AttachmentPreviewItem
              key={attachment.id}
              attachment={attachment}
              onRemove={() => onRemove(attachment.id)}
              onRetry={onRetry ? () => onRetry(attachment.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
