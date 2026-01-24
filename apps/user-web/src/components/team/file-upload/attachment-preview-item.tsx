"use client"

import { X, RefreshCw, AlertCircle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { type PendingAttachment, formatFileSize, isImageFile } from "@/types/files"
import { FileTypeIcon, getFileTypeBackground } from "./file-type-icon"

interface AttachmentPreviewItemProps {
  attachment: PendingAttachment
  onRemove: () => void
  onRetry?: () => void
}

export function AttachmentPreviewItem({
  attachment,
  onRemove,
  onRetry,
}: AttachmentPreviewItemProps) {
  const isImage = isImageFile(attachment.file.type, attachment.file.name)
  const { status, progress, error, file, previewUrl } = attachment

  return (
    <div
      className={cn(
        "relative group rounded-lg border overflow-hidden",
        status === "error" && "border-destructive",
        isImage ? "w-36 h-28" : "w-full max-w-[200px]"
      )}
    >
      {/* Image preview */}
      {isImage ? (
        <div className="w-full h-full bg-muted/50">
          <img
            src={previewUrl}
            alt={file.name}
            className="w-full h-full object-contain"
          />
          {/* Upload overlay */}
          {status === "uploading" && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Progress value={progress} className="w-12 h-1" />
            </div>
          )}
          {status === "uploaded" && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Check className="size-6 text-green-500" />
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 bg-destructive/20 flex flex-col items-center justify-center gap-1 p-1">
              <AlertCircle className="size-4 text-destructive" />
              <span className="text-[10px] text-destructive text-center line-clamp-2">
                {error}
              </span>
            </div>
          )}
        </div>
      ) : (
        /* File preview */
        <div className={cn("flex items-center gap-2 p-2", getFileTypeBackground(file.type))}>
          <FileTypeIcon fileType={file.type} className="size-8 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{file.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {formatFileSize(file.size)}
            </p>
            {status === "uploading" && (
              <Progress value={progress} className="h-1 mt-1" />
            )}
            {status === "error" && (
              <p className="text-[10px] text-destructive mt-0.5 line-clamp-1">
                {error}
              </p>
            )}
            {status === "uploaded" && (
              <p className="text-[10px] text-green-600 mt-0.5 flex items-center gap-1">
                <Check className="size-3" />
                Uploaded
              </p>
            )}
          </div>
        </div>
      )}

      {/* Remove button */}
      <Button
        variant="secondary"
        size="icon"
        className={cn(
          "absolute top-1 right-1 size-5 rounded-full",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          status === "error" && "opacity-100"
        )}
        onClick={onRemove}
      >
        <X className="size-3" />
      </Button>

      {/* Retry button for errors */}
      {status === "error" && onRetry && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-1 right-1 size-5 rounded-full"
          onClick={onRetry}
        >
          <RefreshCw className="size-3" />
        </Button>
      )}
    </div>
  )
}
