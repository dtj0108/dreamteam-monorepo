"use client"

import { useState, useCallback, useEffect } from "react"
import { LayoutGrid, List, FileIcon, Loader2, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useWorkspaceFiles } from "@/hooks/use-workspace-files"
import { type FileCategory, type WorkspaceFile, isImageFile } from "@/types/files"
import { FileFilters } from "./file-filters"
import { FileItem } from "./file-item"
import { ImageLightbox } from "../file-upload"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface FileBrowserProps {
  workspaceId: string
  currentUserId?: string
  isAdmin?: boolean
}

export function FileBrowser({ workspaceId, currentUserId, isAdmin = false }: FileBrowserProps) {
  const [view, setView] = useState<"grid" | "list">("grid")
  const [type, setType] = useState<FileCategory | undefined>()
  const [query, setQuery] = useState("")
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<WorkspaceFile | null>(null)
  const [deleteMessage, setDeleteMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const { files, isLoading, error, hasMore, loadMore, deleteFile, refetch } = useWorkspaceFiles({
    workspaceId,
    type,
    query,
  })

  // Get all image files for lightbox
  const imageFiles = files.filter((f) => isImageFile(f.fileType, f.fileName))

  const handleImageClick = useCallback(
    (file: WorkspaceFile) => {
      const index = imageFiles.findIndex((f) => f.id === file.id)
      if (index !== -1) {
        setLightboxIndex(index)
        setLightboxOpen(true)
      }
    },
    [imageFiles]
  )

  const handleDeleteClick = (file: WorkspaceFile) => {
    setFileToDelete(file)
    setDeleteDialogOpen(true)
  }

  // Auto-clear delete message after 3 seconds
  useEffect(() => {
    if (deleteMessage) {
      const timer = setTimeout(() => setDeleteMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [deleteMessage])

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return

    const fileName = fileToDelete.fileName
    try {
      await deleteFile(fileToDelete.id)
      setDeleteMessage({ type: "success", text: `${fileName} has been deleted.` })
    } catch (err) {
      setDeleteMessage({ type: "error", text: (err as Error).message })
    } finally {
      setDeleteDialogOpen(false)
      setFileToDelete(null)
    }
  }

  const canDeleteFile = (file: WorkspaceFile) => {
    return isAdmin || file.uploader.id === currentUserId
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 border-b">
        <FileFilters
          type={type}
          query={query}
          onTypeChange={setType}
          onQueryChange={setQuery}
          className="flex-1"
        />

        {/* View toggle */}
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="size-8"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon"
            className="size-8"
            onClick={() => setView("list")}
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>

      {/* Delete message notification */}
      {deleteMessage && (
        <div
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm",
            deleteMessage.type === "success"
              ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
              : "bg-destructive/10 text-destructive"
          )}
        >
          {deleteMessage.type === "success" ? (
            <CheckCircle className="size-4" />
          ) : (
            <XCircle className="size-4" />
          )}
          <span>{deleteMessage.text}</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && files.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-destructive mb-2">{error}</p>
            <Button variant="outline" onClick={refetch}>
              Try again
            </Button>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="size-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileIcon className="size-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No files yet</h2>
            <p className="text-muted-foreground max-w-md">
              {query || type
                ? "No files match your search. Try adjusting your filters."
                : "Files shared in channels and direct messages will appear here."}
            </p>
          </div>
        ) : (
          <>
            <div
              className={cn(
                view === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                  : "space-y-2"
              )}
            >
              {files.map((file) => (
                <FileItem
                  key={file.id}
                  file={file}
                  view={view}
                  currentUserId={currentUserId}
                  canDelete={canDeleteFile(file)}
                  onPreview={
                    isImageFile(file.fileType, file.fileName) ? () => handleImageClick(file) : undefined
                  }
                  onDelete={() => handleDeleteClick(file)}
                />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-6">
                <Button variant="outline" onClick={loadMore} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load more"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Image Lightbox */}
      {imageFiles.length > 0 && (
        <ImageLightbox
          images={imageFiles.map((f) => ({
            id: f.id,
            fileName: f.fileName,
            fileType: f.fileType,
            fileSize: f.fileSize,
            fileUrl: f.fileUrl,
          }))}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setLightboxIndex}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{fileToDelete?.fileName}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
