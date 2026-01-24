"use client"

import { use, useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Star, MoreHorizontal, Trash2, ArrowLeft, Maximize2, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useKnowledge } from "@/providers/knowledge-provider"
import { WhiteboardEditor } from "@/components/knowledge/whiteboard-editor"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function WhiteboardPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const {
    getWhiteboardById,
    updateWhiteboard,
    deleteWhiteboard,
    toggleWhiteboardFavorite,
  } = useKnowledge()

  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ESC key handler for fullscreen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener("keydown", handleEsc)
    return () => window.removeEventListener("keydown", handleEsc)
  }, [isFullscreen])

  // All hooks must be called before any conditional returns
  const handleContentChange = useCallback(
    (content: unknown) => {
      // Debounce saves
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await updateWhiteboard(id, { content })
        } catch (error) {
          console.error("Failed to save whiteboard:", error)
        }
      }, 1000)
    },
    [id, updateWhiteboard]
  )

  const handleThumbnailChange = useCallback(
    async (thumbnail: string) => {
      try {
        await updateWhiteboard(id, { thumbnail })
      } catch (error) {
        console.error("Failed to save thumbnail:", error)
      }
    },
    [id, updateWhiteboard]
  )

  const whiteboard = getWhiteboardById(id)

  // Now we can have conditional returns after all hooks
  if (!whiteboard) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <h2 className="text-xl font-semibold mb-2">Whiteboard not found</h2>
        <p className="text-muted-foreground mb-4">
          This whiteboard may have been deleted or you don&apos;t have access.
        </p>
        <Button asChild variant="outline">
          <Link href="/knowledge/whiteboards">
            <ArrowLeft className="size-4 mr-2" />
            Back to Whiteboards
          </Link>
        </Button>
      </div>
    )
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this whiteboard?")) return
    setIsDeleting(true)
    try {
      await deleteWhiteboard(id)
      router.push("/knowledge/whiteboards")
    } catch (error) {
      console.error("Failed to delete whiteboard:", error)
      setIsDeleting(false)
    }
  }

  const handleToggleFavorite = async () => {
    try {
      await toggleWhiteboardFavorite(id)
    } catch (error) {
      console.error("Failed to toggle favorite:", error)
    }
  }

  const handleStartEditTitle = () => {
    setEditTitle(whiteboard.title)
    setIsEditingTitle(true)
  }

  const handleSaveTitle = async () => {
    const newTitle = editTitle.trim()
    if (newTitle && newTitle !== whiteboard.title) {
      try {
        await updateWhiteboard(id, { title: newTitle })
      } catch (error) {
        console.error("Failed to update title:", error)
      }
    }
    setIsEditingTitle(false)
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-2 flex items-center gap-3 shrink-0">
        {/* Back button */}
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href="/knowledge/whiteboards">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>

        {/* Icon */}
        <span className="text-xl">{whiteboard.icon}</span>

        {/* Title */}
        {isEditingTitle ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveTitle()
              if (e.key === "Escape") setIsEditingTitle(false)
            }}
            className="h-8 text-lg font-semibold"
            autoFocus
          />
        ) : (
          <h1
            onClick={handleStartEditTitle}
            className="text-lg font-semibold cursor-text hover:bg-accent/50 px-2 py-0.5 rounded transition-colors"
          >
            {whiteboard.title}
          </h1>
        )}

        <div className="ml-auto flex items-center gap-1">
          {/* Fullscreen button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(true)}
            className="h-8 w-8"
            title="Fullscreen"
          >
            <Maximize2 className="size-4" />
          </Button>

          {/* Favorite button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleFavorite}
            className={cn(
              "h-8 w-8",
              whiteboard.isFavorite && "text-yellow-500"
            )}
          >
            <Star
              className={cn(
                "size-4",
                whiteboard.isFavorite && "fill-yellow-500"
              )}
            />
          </Button>

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleToggleFavorite}>
                <Star className="size-4 mr-2" />
                {whiteboard.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Whiteboard Editor */}
      <div className="flex-1 overflow-hidden" style={{ height: "calc(100vh - 60px)" }}>
        <WhiteboardEditor
          initialData={whiteboard.content}
          onChange={handleContentChange}
          onThumbnailChange={handleThumbnailChange}
        />
      </div>

      {/* Fullscreen mode */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col">
          {/* Fullscreen header */}
          <div className="flex items-center px-4 py-2 border-b shrink-0">
            {/* Spacer for centering */}
            <div className="w-8" />
            {/* Centered title */}
            <div className="flex-1 flex items-center justify-center gap-2">
              <span className="text-xl">{whiteboard.icon}</span>
              <span className="font-semibold">{whiteboard.title}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(false)}
              className="h-8 w-8"
              title="Exit fullscreen (Esc)"
            >
              <X className="size-4" />
            </Button>
          </div>
          {/* Full editor */}
          <div className="flex-1 overflow-hidden">
            <WhiteboardEditor
              initialData={whiteboard.content}
              onChange={handleContentChange}
              onThumbnailChange={handleThumbnailChange}
            />
          </div>
        </div>
      )}
    </div>
  )
}
