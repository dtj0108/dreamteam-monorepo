"use client"

import { useState, useMemo, Suspense } from "react"
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
  Star,
  X,
  Search,
  LayoutGrid,
  List,
} from "lucide-react"
import { useDemoKnowledge } from "@/providers/demo-provider"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import type { DemoKnowledgePage } from "@/lib/demo-data"

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

function sortPages(pages: DemoKnowledgePage[], sortBy: SortOption): DemoKnowledgePage[] {
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

export default function DemoKnowledgeAllPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
      <DemoKnowledgeAllContent />
    </Suspense>
  )
}

function DemoKnowledgeAllContent() {
  const searchParams = useSearchParams()
  const filter = searchParams.get("filter")
  const categoryId = searchParams.get("category")

  const { pages, favoritePages, folders } = useDemoKnowledge()

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [sortBy, setSortBy] = useState<SortOption>("updated-desc")
  const [searchQuery, setSearchQuery] = useState("")

  // Get selected category info
  const selectedCategory = categoryId
    ? folders.find(f => f.id === categoryId)
    : null

  // Show favorites if filter=favorites, otherwise filter by category
  const basePages = useMemo(() => {
    if (filter === "favorites") return favoritePages
    if (categoryId) return pages.filter(p => p.folderId === categoryId)
    return pages
  }, [filter, categoryId, pages, favoritePages])

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

  return (
    <ScrollArea className="flex-1">
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
                  <Link
                    href="/demo/knowledge/all"
                    className="ml-2"
                  >
                    <Button variant="ghost" size="icon" className="size-6">
                      <X className="size-4" />
                    </Button>
                  </Link>
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
                : categoryId
                ? "No pages in this category yet."
                : "No pages found."}
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayPages.map((page) => (
              <Link
                key={page.id}
                href={`/demo/knowledge/${page.id}`}
                className="group block"
              >
                <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
                  <CardContent className="p-4 flex flex-col h-full">
                    {/* Icon */}
                    <div className="text-3xl mb-3">{page.icon || "📄"}</div>

                    {/* Title */}
                    <h3 className="font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                      {page.title}
                    </h3>

                    {/* Category Badge */}
                    {page.folderId && (
                      <div className="mb-2">
                        {(() => {
                          const folder = folders.find(f => f.id === page.folderId)
                          if (!folder) return null
                          return (
                            <span
                              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${folder.color}20`,
                                color: folder.color,
                              }}
                            >
                              <span
                                className="size-1.5 rounded-full"
                                style={{ backgroundColor: folder.color }}
                              />
                              {folder.name}
                            </span>
                          )
                        })()}
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
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {displayPages.map((page) => (
              <Link
                key={page.id}
                href={`/demo/knowledge/${page.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <span className="text-xl shrink-0">{page.icon || "📄"}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{page.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true })}
                    </span>
                    {page.folderId && (
                      (() => {
                        const folder = folders.find(f => f.id === page.folderId)
                        if (!folder) return null
                        return (
                          <span
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${folder.color}20`,
                              color: folder.color,
                            }}
                          >
                            <span
                              className="size-1.5 rounded-full"
                              style={{ backgroundColor: folder.color }}
                            />
                            {folder.name}
                          </span>
                        )
                      })()
                    )}
                  </div>
                </div>
                {page.isFavorite && (
                  <Star className="size-4 text-yellow-500 fill-yellow-500 shrink-0" />
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
