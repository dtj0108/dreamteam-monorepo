"use client"

import { useState, useCallback, useEffect } from "react"
import { type WorkspaceFile, type FileCategory } from "@/types/files"

interface UseWorkspaceFilesOptions {
  workspaceId?: string
  type?: FileCategory
  query?: string
  channelId?: string
  uploaderId?: string
}

interface UseWorkspaceFilesReturn {
  files: WorkspaceFile[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => void
  deleteFile: (id: string) => Promise<void>
  refetch: () => void
}

export function useWorkspaceFiles({
  workspaceId,
  type,
  query,
  channelId,
  uploaderId,
}: UseWorkspaceFilesOptions): UseWorkspaceFilesReturn {
  const [files, setFiles] = useState<WorkspaceFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)

  const fetchFiles = useCallback(
    async (loadMore = false) => {
      if (!workspaceId) return

      try {
        if (!loadMore) {
          setIsLoading(true)
        }
        setError(null)

        const params = new URLSearchParams()
        params.set("workspaceId", workspaceId)
        if (type) params.set("type", type)
        if (query) params.set("q", query)
        if (channelId) params.set("channelId", channelId)
        if (uploaderId) params.set("uploaderId", uploaderId)
        if (loadMore && cursor) params.set("cursor", cursor)

        const response = await fetch(`/api/team/files?${params}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch files")
        }

        const transformedFiles: WorkspaceFile[] = data.files.map((file: any) => ({
          id: file.id,
          workspaceId: workspaceId,
          fileName: file.fileName,
          fileType: file.fileType,
          fileSize: file.fileSize,
          fileUrl: file.fileUrl,
          storagePath: file.storagePath,
          thumbnailPath: file.thumbnailUrl,
          createdAt: new Date(file.createdAt),
          uploader: file.uploader
            ? {
                id: file.uploader.id,
                name: file.uploader.name,
                avatarUrl: file.uploader.avatarUrl,
              }
            : { id: "", name: "Unknown", avatarUrl: null },
          source: file.source,
        }))

        if (loadMore) {
          setFiles((prev) => [...prev, ...transformedFiles])
        } else {
          setFiles(transformedFiles)
        }

        setHasMore(data.hasMore)
        setCursor(data.nextCursor)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    },
    [workspaceId, type, query, channelId, uploaderId, cursor]
  )

  // Refetch when filters change
  useEffect(() => {
    setCursor(null) // Reset cursor when filters change
    fetchFiles(false)
  }, [workspaceId, type, query, channelId, uploaderId])

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      fetchFiles(true)
    }
  }, [hasMore, isLoading, fetchFiles])

  const deleteFile = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/team/files/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete file")
      }

      // Optimistically remove from list
      setFiles((prev) => prev.filter((f) => f.id !== id))
    } catch (err) {
      throw err
    }
  }, [])

  const refetch = useCallback(() => {
    setCursor(null)
    fetchFiles(false)
  }, [fetchFiles])

  return {
    files,
    isLoading,
    error,
    hasMore,
    loadMore,
    deleteFile,
    refetch,
  }
}
