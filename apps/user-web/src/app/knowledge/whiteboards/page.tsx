"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
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
  PenTool,
  PlusIcon,
  Star,
  Search,
  LayoutGrid,
  List,
  X,
} from "lucide-react"
import { useKnowledge } from "@/providers/knowledge-provider"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { formatDistanceToNow } from "date-fns"
import type { Whiteboard } from "@/providers/knowledge-provider"

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

function sortWhiteboards(whiteboards: Whiteboard[], sortBy: SortOption): Whiteboard[] {
  return [...whiteboards].sort((a, b) => {
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

export default function WhiteboardsPage() {
  const {
    whiteboards,
    setShowCreateWhiteboard,
    isLoading,
  } = useKnowledge()

  // UI state with localStorage persistence
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>("whiteboard-view-mode", "grid")
  const [sortBy, setSortBy] = useLocalStorage<SortOption>("whiteboard-sort-by", "updated-desc")
  const [searchQuery, setSearchQuery] = useState("")

  // Apply search and sort
  const displayWhiteboards = useMemo(() => {
    let result = whiteboards

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(wb =>
        wb.title.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    return sortWhiteboards(result, sortBy)
  }, [whiteboards, searchQuery, sortBy])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (whiteboards.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center text-center py-8">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <PenTool className="size-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Whiteboards Yet</h2>
            <p className="text-muted-foreground mb-4">
              Create your first whiteboard to start drawing, diagramming, and brainstorming.
            </p>
            <Button onClick={() => setShowCreateWhiteboard(true)}>
              <PlusIcon className="size-4 mr-2" />
              Create Your First Whiteboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PenTool className="size-5" />
              Whiteboards
            </h1>
            <p className="text-sm text-muted-foreground">
              {displayWhiteboards.length} whiteboard{displayWhiteboards.length !== 1 ? "s" : ""}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>
          <Button onClick={() => setShowCreateWhiteboard(true)}>
            <PlusIcon className="size-4 mr-2" />
            New Whiteboard
          </Button>
        </div>

        {/* Toolbar: Search, Sort, View Toggle */}
        <div className="flex items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search whiteboards..."
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

        {/* Whiteboards Display */}
        {displayWhiteboards.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {searchQuery
                ? `No whiteboards found matching "${searchQuery}"`
                : "No whiteboards found."}
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayWhiteboards.map((whiteboard) => (
              <Link
                key={whiteboard.id}
                href={`/knowledge/whiteboards/${whiteboard.id}`}
                className="group block"
              >
                <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
                  <CardContent className="p-4 flex flex-col h-full">
                    {/* Thumbnail or placeholder */}
                    <div className="aspect-video rounded-md bg-muted mb-3 flex items-center justify-center overflow-hidden">
                      {whiteboard.thumbnail ? (
                        <img
                          src={whiteboard.thumbnail}
                          alt={whiteboard.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <PenTool className="size-8 text-muted-foreground/50" />
                      )}
                    </div>

                    {/* Title */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{whiteboard.icon}</span>
                      <h3 className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
                        {whiteboard.title}
                      </h3>
                    </div>

                    {/* Footer: Date & Favorite */}
                    <div className="mt-auto pt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(whiteboard.updatedAt), { addSuffix: true })}
                      </span>
                      {whiteboard.isFavorite && (
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
            {displayWhiteboards.map((whiteboard) => (
              <Link
                key={whiteboard.id}
                href={`/knowledge/whiteboards/${whiteboard.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <span className="text-xl shrink-0">{whiteboard.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{whiteboard.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(whiteboard.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                {whiteboard.isFavorite && (
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
