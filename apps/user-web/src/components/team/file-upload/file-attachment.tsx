"use client"

import { Download, ExternalLink, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { type MessageAttachment, formatFileSize, isImageFile, isVideoFile, isAudioFile, isPdfFile } from "@/types/files"
import { FileTypeIcon, getFileTypeBackground } from "./file-type-icon"

interface FileAttachmentProps {
  attachment: MessageAttachment
  onClick?: () => void
  className?: string
}

export function FileAttachment({ attachment, onClick, className }: FileAttachmentProps) {
  const { fileName, fileType, fileSize, fileUrl } = attachment
  const isImage = isImageFile(fileType, fileName)
  const isVideo = isVideoFile(fileType, fileName)
  const isAudio = isAudioFile(fileType, fileName)
  const isPdf = isPdfFile(fileType, fileName)

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(fileUrl, "_blank")
  }

  // Image attachment
  if (isImage) {
    return (
      <div
        className={cn(
          "relative group rounded-xl overflow-hidden cursor-pointer max-w-md border shadow-sm",
          className
        )}
        onClick={onClick}
      >
        <img
          src={fileUrl}
          alt={fileName}
          className="max-h-80 w-auto rounded-xl object-contain bg-muted/30"
          loading="lazy"
        />
        {/* Floating download button */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 size-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
          onClick={handleDownload}
        >
          <Download className="size-3.5" />
        </Button>
      </div>
    )
  }

  // Video attachment
  if (isVideo) {
    return (
      <div className={cn("max-w-md rounded-lg overflow-hidden", className)}>
        <video
          src={fileUrl}
          controls
          className="max-h-64 w-auto rounded-lg"
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
      </div>
    )
  }

  // Audio attachment
  if (isAudio) {
    return (
      <div className={cn("max-w-md", className)}>
        <div className={cn("flex items-center gap-3 p-3 rounded-lg", getFileTypeBackground(fileType))}>
          <FileTypeIcon fileType={fileType} className="size-8 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{fileName}</p>
            <audio src={fileUrl} controls className="w-full mt-2 h-8">
              Your browser does not support the audio tag.
            </audio>
          </div>
        </div>
      </div>
    )
  }

  // PDF attachment - inline viewer with expand option
  if (isPdf) {
    const handleOpenInNewTab = (e: React.MouseEvent) => {
      e.stopPropagation()
      window.open(fileUrl, "_blank")
    }

    return (
      <Dialog>
        <div className={cn("max-w-lg rounded-lg overflow-hidden border", className)}>
          <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950 border-b">
            <div className="flex items-center gap-2">
              <FileTypeIcon fileType={fileType} className="size-5" />
              <span className="text-sm font-medium truncate max-w-[200px]">{fileName}</span>
            </div>
            <div className="flex items-center gap-1">
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7">
                  <Maximize2 className="size-4" />
                </Button>
              </DialogTrigger>
              <Button variant="ghost" size="icon" className="size-7" onClick={handleOpenInNewTab}>
                <ExternalLink className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-7" onClick={handleDownload}>
                <Download className="size-4" />
              </Button>
            </div>
          </div>
          <DialogTrigger asChild>
            <div className="cursor-pointer">
              <iframe
                src={fileUrl}
                className="w-full h-48 bg-white pointer-events-none"
                title={fileName}
              />
            </div>
          </DialogTrigger>
        </div>

        <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] flex flex-col p-4">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileTypeIcon fileType={fileType} className="size-5" />
              {fileName}
            </DialogTitle>
          </DialogHeader>
          <iframe
            src={fileUrl}
            className="w-full flex-1 bg-white rounded border"
            title={fileName}
          />
        </DialogContent>
      </Dialog>
    )
  }

  // Document/file attachment
  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-3 rounded-lg border max-w-xs hover:bg-muted/50 transition-colors",
        getFileTypeBackground(fileType),
        className
      )}
    >
      <FileTypeIcon fileType={fileType} className="size-10 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{fileName}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleDownload}
      >
        <Download className="size-4" />
      </Button>
    </div>
  )
}

// Component to display multiple attachments in a message
interface MessageAttachmentsProps {
  attachments: MessageAttachment[]
  onImageClick?: (index: number) => void
  className?: string
}

export function MessageAttachments({ attachments, onImageClick, className }: MessageAttachmentsProps) {
  if (!attachments || attachments.length === 0) return null

  // Separate images from other files
  const images = attachments.filter((a) => isImageFile(a.fileType, a.fileName))
  const otherFiles = attachments.filter((a) => !isImageFile(a.fileType, a.fileName))

  return (
    <div className={cn("mt-2 space-y-2", className)}>
      {/* Image grid */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((attachment, index) => (
            <FileAttachment
              key={attachment.id}
              attachment={attachment}
              onClick={() => onImageClick?.(index)}
            />
          ))}
        </div>
      )}

      {/* Other files */}
      {otherFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {otherFiles.map((attachment) => (
            <FileAttachment key={attachment.id} attachment={attachment} />
          ))}
        </div>
      )}
    </div>
  )
}
