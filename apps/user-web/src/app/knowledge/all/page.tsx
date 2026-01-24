"use client"

import { useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FileText,
  PlusIcon,
  Star,
  BookOpen,
  X,
  Search,
  LayoutGrid,
  List,
  GripVertical,
} from "lucide-react"
import { useKnowledge } from "@/providers/knowledge-provider"
import { useLocalStorage } from "@/hooks/use-local-storage"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { CategoryBadge } from "@/components/knowledge/category-badge"
import { cn } from "@/lib/utils"
import type { KnowledgePage } from "@/providers/knowledge-provider"
import { useDraggable } from "@dnd-kit/core"

type SortOption = "updated-desc" | "updated-asc" | "created-desc" | "created-asc" | "name-asc" | "name-desc"
type ViewMode = "grid" | "list"

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "updated-desc", label: "Recently Updated" },
  { value: "updated-asc", label: "Oldest Updated" },
  { value: "created-desc", label: "Recently Created" },
  { value: "created-asc", label: "Oldest Created" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
]

function sortPages(pages: KnowledgePage[], sortBy: SortOption): KnowledgePage[] {
  return [...pages].sort((a, b) => {
    switch (sortBy) {
      case "updated-desc":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      case "updated-asc":
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      case "created-desc":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case "created-asc":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case "name-asc":
        return a.title.localeCompare(b.title)
      case "name-desc":
        return b.title.localeCompare(a.title)
      default:
        return 0
    }
  })
}

// Draggable wrapper for page items
interface DraggablePageProps {
  page: KnowledgePage
  children: React.ReactNode
}

function DraggablePage({ page, children }: DraggablePageProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `page-${page.id}`,
    data: { type: "page", page },
  })

  // Don't apply transform here - let DragOverlay handle the visual
  // Just fade the original element while dragging
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      {children}
    </div>
  )
}

export default function KnowledgeAllPage() {
  const searchParams = useSearchParams()
  const filter = searchParams.get("filter")
  const {
    pages,
    favorites,
    setShowCreatePage,
    isLoading,
    selectedCategoryId,
    setSelectedCategoryId,
    getCategoryById,
    filteredPages,
    setPageCategories,
  } = useKnowledge()

  // Handler to remove a category from a page
  const handleRemoveCategory = async (pageId: string, categoryId: string, currentCategoryIds: string[]) => {
    const newIds = currentCategoryIds.filter(id => id !== categoryId)
    await setPageCategories(pageId, newIds)
  }

  // UI state with localStorage persistence
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>("knowledge-view-mode", "grid")
  const [sortBy, setSortBy] = useLocalStorage<SortOption>("knowledge-sort-by", "updated-desc")
  const [searchQuery, setSearchQuery] = useState("")

  // Get selected category info
  const selectedCategory = selectedCategoryId
    ? getCategoryById(selectedCategoryId)
    : null

  // Show favorites if filter=favorites, otherwise show filtered pages
  const basePages = filter === "favorites" ? favorites : filteredPages

  // Apply search and sort
  const displayPages = useMemo(() => {
    let result = basePages

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(page =>
        page.title.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    return sortPages(result, sortBy)
  }, [basePages, searchQuery, sortBy])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (pages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center text-center py-8">
            <div className="size-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4">
              <BookOpen className="size-8 text-cyan-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Welcome to Knowledge</h2>
            <p className="text-muted-foreground mb-4">
              Create your first page to start documenting SOPs, processes, and team knowledge.
            </p>
            <Button onClick={() => setShowCreatePage(true)}>
              <PlusIcon className="size-4 mr-2" />
              Create Your First Page
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 overflow-hidden">
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {filter === "favorites" ? (
                <>
                  <Star className="size-5 text-yellow-500 fill-yellow-500" />
                  Favorites
                </>
              ) : selectedCategory ? (
                <>
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: selectedCategory.color || "#6b7280" }}
                  />
                  {selectedCategory.name}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => setSelectedCategoryId(null)}
                  >
                    <X className="size-4" />
                  </Button>
                </>
              ) : (
                <>
                  <FileText className="size-5" />
                  All Pages
                </>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              {displayPages.length} page{displayPages.length !== 1 ? "s" : ""}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>
          <Button onClick={() => setShowCreatePage(true)}>
            <PlusIcon className="size-4 mr-2" />
            New Page
          </Button>
        </div>

        {/* Toolbar: Search, Sort, View Toggle */}
        <div className="flex items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-r-none h-9 w-9"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-l-none h-9 w-9"
              onClick={() => setViewMode("list")}
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>

        {/* Pages Display */}
        {displayPages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {searchQuery
                ? `No pages found matching "${searchQuery}"`
                : filter === "favorites"
                ? "No favorite pages yet. Star a page to add it here."
                : selectedCategoryId
                ? "No pages in this category yet."
                : "No pages found."}
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayPages.map((page) => (
              <DraggablePage key={page.id} page={page}>
                <Link
                  href={`/knowledge/${page.id}`}
                  className="group block"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
                    <CardContent className="p-4 flex flex-col h-full">
                      {/* Icon */}
                      <div className="text-3xl mb-3">{page.icon || "📄"}</div>

                      {/* Title */}
                      <h3 className="font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                        {page.title}
                      </h3>

                      {/* Categories */}
                      {page.categories && page.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {page.categories.slice(0, 2).map((cat) => (
                            <CategoryBadge
                              key={cat.id}
                              category={cat}
                              size="sm"
                              onRemove={() => handleRemoveCategory(page.id, cat.id, page.categoryIds)}
                            />
                          ))}
                          {page.categories.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{page.categories.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer: Date & Favorite */}
                      <div className="mt-auto pt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true })}
                        </span>
                        {page.isFavorite && (
                          <Star className="size-3.5 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </DraggablePage>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {displayPages.map((page) => (
              <DraggablePage key={page.id} page={page}>
                <Link
                  href={`/knowledge/${page.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-xl shrink-0">{page.icon || "📄"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{page.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true })}
                      </span>
                      {page.categories?.slice(0, 2).map((cat) => (
                        <CategoryBadge
                          key={cat.id}
                          category={cat}
                          size="sm"
                          onRemove={() => handleRemoveCategory(page.id, cat.id, page.categoryIds)}
                        />
                      ))}
                      {page.categories && page.categories.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{page.categories.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                  {page.isFavorite && (
                    <Star className="size-4 text-yellow-500 fill-yellow-500 shrink-0" />
                  )}
                </Link>
              </DraggablePage>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
