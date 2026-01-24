// File upload and workspace files type definitions

export type FileCategory = "image" | "document" | "video" | "audio" | "archive" | "other"

export interface UploadedFile {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  fileUrl: string
  storagePath: string
  thumbnailUrl?: string
}

export interface PendingAttachment {
  id: string
  file: File
  previewUrl: string
  status: "pending" | "uploading" | "uploaded" | "error"
  progress: number
  uploadedFile?: UploadedFile
  error?: string
}

export interface MessageAttachment {
  id: string
  fileName: string
  fileType: string | null
  fileSize: number | null
  fileUrl: string
  storagePath?: string
  thumbnailUrl?: string
}

export interface WorkspaceFile {
  id: string
  workspaceId: string
  fileName: string
  fileType: string | null
  fileSize: number
  fileUrl: string
  storagePath: string
  thumbnailPath?: string
  createdAt: Date
  uploader: {
    id: string
    name: string
    avatarUrl: string | null
  }
  source?: {
    messageId?: string
    channelId?: string
    channelName?: string
    dmConversationId?: string
  }
}

export interface FileFilters {
  type?: FileCategory
  query?: string
  channelId?: string
  uploaderId?: string
}

// File configuration
export const FILE_CONFIG = {
  maxFileSize: 25 * 1024 * 1024, // 25MB
  maxFilesPerMessage: 10,
  acceptedTypes: {
    images: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/heic", "image/heif"],
    documents: [
      "application/pdf",
      "text/plain",
      "text/csv",
      "text/markdown",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    spreadsheets: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    presentations: [
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    archives: [
      "application/zip",
      "application/x-rar-compressed",
      "application/x-7z-compressed",
      "application/gzip",
    ],
    videos: ["video/mp4", "video/webm", "video/quicktime"],
    audio: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"],
  },
} as const

/**
 * Categorize a file based on its MIME type
 */
export function categorizeFile(mimeType: string | null): FileCategory {
  if (!mimeType) return "other"

  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"

  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("7z") ||
    mimeType.includes("gzip") ||
    mimeType.includes("tar")
  ) {
    return "archive"
  }

  if (
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.includes("word") ||
    mimeType.includes("text/") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("presentation") ||
    mimeType.includes("powerpoint")
  ) {
    return "document"
  }

  return "other"
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "0 B"

  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = bytes / Math.pow(1024, i)

  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

/**
 * Validate a file for upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > FILE_CONFIG.maxFileSize) {
    return {
      valid: false,
      error: `File size exceeds ${formatFileSize(FILE_CONFIG.maxFileSize)} limit`,
    }
  }

  // All file types are allowed, so just return valid
  return { valid: true }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split(".")
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ""
}

/**
 * Get file extension from filename (lowercase)
 */
function getExtension(fileName?: string): string {
  if (!fileName) return ""
  return fileName.split(".").pop()?.toLowerCase() || ""
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "heic", "heif", "avif"]
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "avi", "mkv", "m4v", "wmv"]
const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "wma"]

/**
 * Check if a file is an image
 * Falls back to file extension if mimeType is null
 */
export function isImageFile(mimeType: string | null, fileName?: string): boolean {
  if (mimeType?.startsWith("image/")) return true
  return IMAGE_EXTENSIONS.includes(getExtension(fileName))
}

/**
 * Check if a file is a video
 * Falls back to file extension if mimeType is null
 */
export function isVideoFile(mimeType: string | null, fileName?: string): boolean {
  if (mimeType?.startsWith("video/")) return true
  return VIDEO_EXTENSIONS.includes(getExtension(fileName))
}

/**
 * Check if a file is audio
 * Falls back to file extension if mimeType is null
 */
export function isAudioFile(mimeType: string | null, fileName?: string): boolean {
  if (mimeType?.startsWith("audio/")) return true
  return AUDIO_EXTENSIONS.includes(getExtension(fileName))
}

/**
 * Check if a file is a PDF
 * Falls back to file extension if mimeType is null
 */
export function isPdfFile(mimeType: string | null, fileName?: string): boolean {
  if (mimeType?.includes("pdf")) return true
  return getExtension(fileName) === "pdf"
}
