"use client"

import { useState } from "react"
import { Download, Trash2, MoreHorizontal, ExternalLink, Hash, MessageSquare } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { type WorkspaceFile, formatFileSize, isImageFile, categorizeFile } from "@/types/files"
import { FileTypeIcon, getFileTypeBackground } from "../file-upload/file-type-icon"
import { formatDistanceToNow } from "date-fns"

interface FileItemProps {
  file: WorkspaceFile
  view: "grid" | "list"
  currentUserId?: string
  canDelete?: boolean
  onPreview?: () => void
  onDelete?: () => void
}

export function FileItem({
  file,
  view,
  currentUserId,
  canDelete = false,
  onPreview,
  onDelete,
}: FileItemProps) {
  const isImage = isImageFile(file.fileType, file.fileName)
  const initials = file.uploader.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const handleDownload = () => {
    window.open(file.fileUrl, "_blank")
  }

  if (view === "grid") {
    return (
      <div
        className={cn(
          "group relative rounded-lg border overflow-hidden transition-colors hover:border-primary/50",
          "bg-card"
        )}
      >
        {/* Preview area */}
        <div
          className={cn(
            "aspect-square flex items-center justify-center cursor-pointer",
            isImage ? "" : getFileTypeBackground(file.fileType)
          )}
          onClick={onPreview}
        >
          {isImage ? (
            <img
              src={file.fileUrl}
              alt={file.fileName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <FileTypeIcon fileType={file.fileType} className="size-12" />
          )}
        </div>

        {/* File info */}
        <div className="p-3 space-y-2">
          <p className="text-sm font-medium truncate" title={file.fileName}>
            {file.fileName}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatFileSize(file.fileSize)}</span>
            <span>{formatDistanceToNow(file.createdAt, { addSuffix: true })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Avatar className="size-5">
              <AvatarImage src={file.uploader.avatarUrl || undefined} />
              <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              {file.uploader.name}
            </span>
          </div>
        </div>

        {/* Hover actions */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="size-4 mr-2" />
                Download
              </DropdownMenuItem>
              {file.source?.channelName && (
                <DropdownMenuItem>
                  <Hash className="size-4 mr-2" />
                  View in #{file.source.channelName}
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  // List view
  return (
    <div
      className={cn(
        "group flex items-center gap-4 p-3 rounded-lg border transition-colors",
        "hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      {/* File icon/thumbnail */}
      <div
        className={cn(
          "size-12 rounded-lg flex items-center justify-center shrink-0 cursor-pointer overflow-hidden",
          isImage ? "" : getFileTypeBackground(file.fileType)
        )}
        onClick={onPreview}
      >
        {isImage ? (
          <img
            src={file.fileUrl}
            alt={file.fileName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <FileTypeIcon fileType={file.fileType} className="size-6" />
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate" title={file.fileName}>
          {file.fileName}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span>{formatFileSize(file.fileSize)}</span>
          {file.source?.channelName && (
            <span className="flex items-center gap-1">
              <Hash className="size-3" />
              {file.source.channelName}
            </span>
          )}
          <span>{formatDistanceToNow(file.createdAt, { addSuffix: true })}</span>
        </div>
      </div>

      {/* Uploader */}
      <div className="flex items-center gap-2 shrink-0">
        <Avatar className="size-6">
          <AvatarImage src={file.uploader.avatarUrl || undefined} />
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
        <span className="text-sm text-muted-foreground hidden sm:block">
          {file.uploader.name}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="size-8" onClick={handleDownload}>
          <Download className="size-4" />
        </Button>
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
