"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { nanoid } from "nanoid"
import {
  PendingAttachment,
  UploadedFile,
  FILE_CONFIG,
  validateFile,
  formatFileSize,
} from "@/types/files"

interface UseFileUploadOptions {
  workspaceId: string
  channelId?: string
  dmConversationId?: string
  maxFiles?: number
  onError?: (error: string) => void
}

interface UseFileUploadReturn {
  pendingAttachments: PendingAttachment[]
  isUploading: boolean
  addFiles: (files: FileList | File[]) => void
  removeFile: (id: string) => void
  retryUpload: (id: string) => Promise<void>
  uploadAll: () => Promise<UploadedFile[]>
  clearAll: () => void
}

export function useFileUpload({
  workspaceId,
  channelId,
  dmConversationId,
  maxFiles = FILE_CONFIG.maxFilesPerMessage,
  onError,
}: UseFileUploadOptions): UseFileUploadReturn {
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const abortControllers = useRef<Map<string, AbortController>>(new Map())
  const uploadingIds = useRef<Set<string>>(new Set()) // Track IDs we've started uploading

  // Add files to pending list with validation
  // Note: HEIC files are converted server-side for better iOS compatibility
  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files)

      setPendingAttachments((prev) => {
        const remainingSlots = maxFiles - prev.length
        if (remainingSlots <= 0) {
          onError?.(`Maximum ${maxFiles} files allowed`)
          return prev
        }

        const filesToAdd = fileArray.slice(0, remainingSlots)
        const newAttachments: PendingAttachment[] = []

        for (const file of filesToAdd) {
          const validation = validateFile(file)
          if (!validation.valid) {
            onError?.(`${file.name}: ${validation.error}`)
            continue
          }

          newAttachments.push({
            id: nanoid(),
            file,
            previewUrl: URL.createObjectURL(file),
            status: "pending",
            progress: 0,
          })
        }

        if (fileArray.length > remainingSlots) {
          onError?.(`Only ${remainingSlots} more file(s) can be added`)
        }

        return [...prev, ...newAttachments]
      })
    },
    [maxFiles, onError]
  )

  // Remove a file from pending list
  const removeFile = useCallback((id: string) => {
    // Cancel any in-progress upload
    const controller = abortControllers.current.get(id)
    if (controller) {
      controller.abort()
      abortControllers.current.delete(id)
    }
    uploadingIds.current.delete(id)

    setPendingAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id)
      if (attachment) {
        URL.revokeObjectURL(attachment.previewUrl)
      }
      return prev.filter((a) => a.id !== id)
    })
  }, [])

  // Upload a single file
  const uploadFile = useCallback(
    async (attachment: PendingAttachment): Promise<UploadedFile | null> => {
      const controller = new AbortController()
      abortControllers.current.set(attachment.id, controller)

      try {
        // Update status to uploading
        setPendingAttachments((prev) =>
          prev.map((a) =>
            a.id === attachment.id ? { ...a, status: "uploading", progress: 0 } : a
          )
        )

        const formData = new FormData()
        formData.append("file", attachment.file)
        formData.append("workspaceId", workspaceId)
        if (channelId) formData.append("channelId", channelId)
        if (dmConversationId) formData.append("dmConversationId", dmConversationId)

        const response = await fetch("/api/team/files", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Upload failed")
        }

        const uploadedFile: UploadedFile = await response.json()

        // Update status to uploaded
        setPendingAttachments((prev) =>
          prev.map((a) =>
            a.id === attachment.id
              ? { ...a, status: "uploaded", progress: 100, uploadedFile }
              : a
          )
        )

        return uploadedFile
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return null
        }

        const errorMessage = (error as Error).message || "Upload failed"

        // Update status to error
        setPendingAttachments((prev) =>
          prev.map((a) =>
            a.id === attachment.id
              ? { ...a, status: "error", error: errorMessage }
              : a
          )
        )

        return null
      } finally {
        abortControllers.current.delete(attachment.id)
      }
    },
    [workspaceId, channelId, dmConversationId]
  )

  // Retry a failed upload
  const retryUpload = useCallback(
    async (id: string) => {
      const attachment = pendingAttachments.find((a) => a.id === id)
      if (!attachment || attachment.status !== "error") return

      await uploadFile(attachment)
    },
    [pendingAttachments, uploadFile]
  )

  // Auto-upload files immediately when they're added
  // This provides immediate feedback with progress bar
  useEffect(() => {
    // Find pending files that we haven't started uploading yet
    const newPendingFiles = pendingAttachments.filter(
      (a) => a.status === "pending" && !uploadingIds.current.has(a.id)
    )
    if (newPendingFiles.length === 0) return

    // Mark these files as being uploaded
    newPendingFiles.forEach((a) => uploadingIds.current.add(a.id))

    // Start uploading
    setIsUploading(true)
    Promise.all(newPendingFiles.map(uploadFile)).finally(() => {
      // Check if there are still files uploading
      const stillUploading = pendingAttachments.some((a) => a.status === "uploading")
      if (!stillUploading) {
        setIsUploading(false)
      }
    })
  }, [pendingAttachments, uploadFile])

  // Upload all pending files
  const uploadAll = useCallback(async (): Promise<UploadedFile[]> => {
    const pendingFiles = pendingAttachments.filter((a) => a.status === "pending")
    if (pendingFiles.length === 0) {
      // Return already uploaded files
      return pendingAttachments
        .filter((a) => a.status === "uploaded" && a.uploadedFile)
        .map((a) => a.uploadedFile!)
    }

    setIsUploading(true)

    try {
      const results = await Promise.all(pendingFiles.map(uploadFile))
      const uploadedFiles = results.filter((f): f is UploadedFile => f !== null)

      // Include previously uploaded files
      const previouslyUploaded = pendingAttachments
        .filter((a) => a.status === "uploaded" && a.uploadedFile)
        .map((a) => a.uploadedFile!)

      return [...previouslyUploaded, ...uploadedFiles]
    } finally {
      setIsUploading(false)
    }
  }, [pendingAttachments, uploadFile])

  // Clear all pending attachments
  const clearAll = useCallback(() => {
    // Abort all in-progress uploads
    abortControllers.current.forEach((controller) => controller.abort())
    abortControllers.current.clear()
    uploadingIds.current.clear()

    // Revoke all blob URLs
    pendingAttachments.forEach((a) => URL.revokeObjectURL(a.previewUrl))

    setPendingAttachments([])
    setIsUploading(false)
  }, [pendingAttachments])

  return {
    pendingAttachments,
    isUploading,
    addFiles,
    removeFile,
    retryUpload,
    uploadAll,
    clearAll,
  }
}
