"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Star, MoreHorizontal, Trash2, ArrowLeft, Tag, Maximize2, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useKnowledge } from "@/providers/knowledge-provider"
import { PageEditor } from "@/components/knowledge/page-editor"
import { CategoryBadge } from "@/components/knowledge/category-badge"
import { CategoryPicker } from "@/components/knowledge/category-picker"
import Link from "next/link"

interface PageProps {
  params: Promise<{ pageId: string }>
}

export default function KnowledgePageView({ params }: PageProps) {
  const { pageId } = use(params)
  const router = useRouter()
  const {
    getPageById,
    updatePage,
    deletePage,
    toggleFavorite,
    categories,
    setPageCategories,
    createCategory,
  } = useKnowledge()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

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

  const page = getPageById(pageId)

  if (!page) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <h2 className="text-xl font-semibold mb-2">Page not found</h2>
        <p className="text-muted-foreground mb-4">
          This page may have been deleted or you don&apos;t have access.
        </p>
        <Button asChild variant="outline">
          <Link href="/knowledge">
            <ArrowLeft className="size-4 mr-2" />
            Back to Knowledge
          </Link>
        </Button>
      </div>
    )
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this page?")) return
    setIsDeleting(true)
    try {
      await deletePage(pageId)
      router.push("/knowledge")
    } catch (error) {
      console.error("Failed to delete page:", error)
      setIsDeleting(false)
    }
  }

  const handleToggleFavorite = async () => {
    try {
      await toggleFavorite(pageId)
    } catch (error) {
      console.error("Failed to toggle favorite:", error)
    }
  }

  const handleTitleChange = async (newTitle: string) => {
    try {
      await updatePage(pageId, { title: newTitle })
    } catch (error) {
      console.error("Failed to update title:", error)
    }
  }

  const handleContentChange = async (content: unknown) => {
    try {
      await updatePage(pageId, { content })
    } catch (error) {
      console.error("Failed to save content:", error)
    }
  }

  const handleCategoriesChange = async (categoryIds: string[]) => {
    try {
      await setPageCategories(pageId, categoryIds)
    } catch (error) {
      console.error("Failed to update categories:", error)
    }
  }

  const handleRemoveCategory = (categoryId: string) => {
    const newIds = page.categoryIds.filter(id => id !== categoryId)
    handleCategoriesChange(newIds)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Page Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/knowledge">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <span className="text-lg shrink-0">{page.icon || "📄"}</span>
          <span className="font-medium truncate">{page.title}</span>
          {/* Category badges */}
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {page.categories.slice(0, 3).map(cat => (
              <CategoryBadge
                key={cat.id}
                category={cat}
                size="sm"
                onRemove={() => handleRemoveCategory(cat.id)}
              />
            ))}
            {page.categories.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{page.categories.length - 3}
              </span>
            )}
            <CategoryPicker
              categories={categories}
              selectedIds={page.categoryIds}
              onChange={handleCategoriesChange}
              onCreateCategory={(name) => createCategory({ name })}
              trigger={
                <Button variant="ghost" size="sm" className="h-6 px-1.5 gap-1">
                  <Tag className="size-3" />
                  <span className="text-xs">
                    {page.categories.length === 0 ? "Add tag" : ""}
                  </span>
                </Button>
              }
            />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(true)}
            title="Fullscreen"
          >
            <Maximize2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleFavorite}
            className={page.isFavorite ? "text-yellow-500" : ""}
          >
            <Star
              className={`size-4 ${page.isFavorite ? "fill-yellow-500" : ""}`}
            />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleToggleFavorite}>
                <Star className="size-4 mr-2" />
                {page.isFavorite ? "Remove from favorites" : "Add to favorites"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4 mr-2" />
                Delete page
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Page Editor */}
      <PageEditor
        pageId={pageId}
        initialTitle={page.title}
        initialIcon={page.icon}
        initialContent={page.content}
        onTitleChange={handleTitleChange}
        onContentChange={handleContentChange}
      />

      {/* Fullscreen mode */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col">
          {/* Fullscreen header */}
          <div className="flex items-center px-4 py-2 border-b shrink-0">
            {/* Spacer for centering */}
            <div className="w-8" />
            {/* Centered title */}
            <div className="flex-1 flex items-center justify-center gap-2">
              <span className="text-lg">{page.icon || "📄"}</span>
              <span className="font-medium">{page.title}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(false)}
              title="Exit fullscreen (Esc)"
            >
              <X className="size-4" />
            </Button>
          </div>
          {/* Full editor */}
          <PageEditor
            pageId={pageId}
            initialTitle={page.title}
            initialIcon={page.icon}
            initialContent={page.content}
            onTitleChange={handleTitleChange}
            onContentChange={handleContentChange}
          />
        </div>
      )}
    </div>
  )
}
