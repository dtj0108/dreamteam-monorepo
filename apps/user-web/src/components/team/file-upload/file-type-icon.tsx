"use client"

import {
  File,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  Presentation,
} from "lucide-react"
import { categorizeFile, type FileCategory } from "@/types/files"
import { cn } from "@/lib/utils"

interface FileTypeIconProps {
  fileType: string | null
  className?: string
}

export function FileTypeIcon({ fileType, className }: FileTypeIconProps) {
  const category = categorizeFile(fileType)

  const iconClassName = cn("size-5", className)

  // More specific icon selection based on MIME type
  if (fileType) {
    if (fileType.includes("pdf")) {
      return <FileText className={cn(iconClassName, "text-red-500")} />
    }
    if (fileType.includes("word") || fileType.includes("document")) {
      return <FileText className={cn(iconClassName, "text-blue-500")} />
    }
    if (fileType.includes("excel") || fileType.includes("spreadsheet")) {
      return <FileSpreadsheet className={cn(iconClassName, "text-green-500")} />
    }
    if (fileType.includes("powerpoint") || fileType.includes("presentation")) {
      return <Presentation className={cn(iconClassName, "text-orange-500")} />
    }
    if (
      fileType.includes("javascript") ||
      fileType.includes("typescript") ||
      fileType.includes("json") ||
      fileType.includes("html") ||
      fileType.includes("css")
    ) {
      return <FileCode className={cn(iconClassName, "text-purple-500")} />
    }
  }

  // Category-based icons
  switch (category) {
    case "image":
      return <FileImage className={cn(iconClassName, "text-pink-500")} />
    case "video":
      return <FileVideo className={cn(iconClassName, "text-violet-500")} />
    case "audio":
      return <FileAudio className={cn(iconClassName, "text-cyan-500")} />
    case "archive":
      return <FileArchive className={cn(iconClassName, "text-amber-500")} />
    case "document":
      return <FileText className={cn(iconClassName, "text-blue-500")} />
    default:
      return <File className={cn(iconClassName, "text-muted-foreground")} />
  }
}

// Get background color class for file type
export function getFileTypeBackground(fileType: string | null): string {
  const category = categorizeFile(fileType)

  if (fileType) {
    if (fileType.includes("pdf")) return "bg-red-50 dark:bg-red-950"
    if (fileType.includes("word") || fileType.includes("document")) return "bg-blue-50 dark:bg-blue-950"
    if (fileType.includes("excel") || fileType.includes("spreadsheet")) return "bg-green-50 dark:bg-green-950"
    if (fileType.includes("powerpoint") || fileType.includes("presentation")) return "bg-orange-50 dark:bg-orange-950"
  }

  switch (category) {
    case "image":
      return "bg-pink-50 dark:bg-pink-950"
    case "video":
      return "bg-violet-50 dark:bg-violet-950"
    case "audio":
      return "bg-cyan-50 dark:bg-cyan-950"
    case "archive":
      return "bg-amber-50 dark:bg-amber-950"
    case "document":
      return "bg-blue-50 dark:bg-blue-950"
    default:
      return "bg-muted"
  }
}
