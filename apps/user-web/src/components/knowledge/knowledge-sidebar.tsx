"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronLeft, ChevronRight, FileText, Plus, Star, Search, Tag, X, PenTool } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import type { KnowledgePage, KnowledgeCategory, Whiteboard } from "@/providers/knowledge-provider"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useDroppable } from "@dnd-kit/core"

// Color palette for categories
const CATEGORY_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#6b7280", // gray
]

interface KnowledgeSidebarProps {
  pages: KnowledgePage[]
  favorites: KnowledgePage[]
  categories: KnowledgeCategory[]
  whiteboards: Whiteboard[]
  selectedCategoryId: string | null
  onSelectCategory: (id: string | null) => void
  onCreateCategory: (name: string, color?: string) => Promise<KnowledgeCategory | null>
  onCreatePage: () => void
  onCreateWhiteboard: () => void
  isLoading?: boolean
}

export function KnowledgeSidebar({
  pages,
  favorites,
  categories,
  whiteboards,
  selectedCategoryId,
  onSelectCategory,
  onCreateCategory,
  onCreatePage,
  onCreateWhiteboard,
  isLoading,
}: KnowledgeSidebarProps) {
  const pathname = usePathname()
  const [favoritesOpen, setFavoritesOpen] = useLocalStorage("knowledge-favorites-open", true)
  const [categoriesOpen, setCategoriesOpen] = useLocalStorage("knowledge-categories-open", true)
  const [whiteboardsOpen, setWhiteboardsOpen] = useLocalStorage("knowledge-whiteboards-open", true)
  const [pagesOpen, setPagesOpen] = useLocalStorage("knowledge-pages-open", true)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryColor, setNewCategoryColor] = useState("#6b7280")

  // Get root-level pages (no parent)
  const rootPages = pages.filter(p => !p.parentId)

  // Check if a page is active
  const isActive = (pageId: string) => pathname === `/knowledge/${pageId}`

  // Get page count for a category
  const getPageCount = (categoryId: string) => {
    return pages.filter(p => p.categoryIds?.includes(categoryId)).length
  }

  // Handle creating a new category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    await onCreateCategory(newCategoryName.trim(), newCategoryColor)
    setNewCategoryName("")
    setNewCategoryColor("#6b7280")
    setIsAddingCategory(false)
  }

  if (isLoading) {
    return (
      <div className="w-64 border-r flex flex-col h-full bg-muted/30">
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 min-w-64 border-r flex flex-col h-full min-h-0 bg-muted/30">
      {/* Header with New Page button */}
      <div className="p-3 border-b flex items-center justify-between shrink-0">
        <span className="text-sm font-medium text-muted-foreground">Pages</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onCreatePage}
          title="Create new page"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 overflow-hidden">
        <div className="p-2 space-y-1">
          {/* Quick Search Link */}
          <Link
            href="/knowledge/search"
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
              pathname === "/knowledge/search"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
          </Link>

          {/* Favorites Section */}
          {favorites.length > 0 && (
            <Collapsible open={favoritesOpen} onOpenChange={setFavoritesOpen}>
              <CollapsibleTrigger className="flex items-center gap-1 px-2 py-1.5 w-full text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    favoritesOpen && "rotate-90"
                  )}
                />
                <Star className="h-3.5 w-3.5 text-yellow-500" />
                <span className="font-medium">Favorites</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pl-4 space-y-0.5">
                  {favorites.map((page) => (
                    <PageItem
                      key={page.id}
                      page={page}
                      isActive={isActive(page.id)}
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Categories Section */}
          <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen}>
            <div className="flex items-center">
              <CollapsibleTrigger className="flex-1 flex items-center gap-1 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    categoriesOpen && "rotate-90"
                  )}
                />
                <Tag className="h-3.5 w-3.5" />
                <span className="font-medium">Categories</span>
              </CollapsibleTrigger>
              {selectedCategoryId && (
                <button
                  onClick={() => onSelectCategory(null)}
                  className="p-1 mr-2 rounded hover:bg-accent"
                  title="Clear filter"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <CollapsibleContent>
              <div className="pl-4 space-y-0.5">
                {categories.map((category) => (
                  <DroppableCategory
                    key={category.id}
                    category={category}
                    isSelected={selectedCategoryId === category.id}
                    onClick={() => onSelectCategory(
                      selectedCategoryId === category.id ? null : category.id
                    )}
                    pageCount={getPageCount(category.id)}
                  />
                ))}
                {isAddingCategory ? (
                  <div className="px-2 py-1.5 space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCategory(false)
                        setNewCategoryName("")
                        setNewCategoryColor("#6b7280")
                      }}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Back</span>
                    </button>
                    <Input
                      placeholder="Category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleCreateCategory()
                        } else if (e.key === "Escape") {
                          setIsAddingCategory(false)
                          setNewCategoryName("")
                          setNewCategoryColor("#6b7280")
                        }
                      }}
                      autoFocus
                      className="h-8"
                    />
                    {/* Color picker grid */}
                    <div className="flex flex-wrap gap-1">
                      {CATEGORY_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewCategoryColor(color)}
                          className={cn(
                            "size-5 rounded-full transition-all",
                            newCategoryColor === color
                              ? "ring-2 ring-offset-1 ring-primary scale-110"
                              : "hover:scale-110"
                          )}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                    <Button
                      size="sm"
                      className="w-full h-8"
                      onClick={handleCreateCategory}
                      disabled={!newCategoryName.trim()}
                    >
                      Add
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingCategory(true)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm w-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Category</span>
                  </button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Whiteboards Section */}
          <Collapsible open={whiteboardsOpen} onOpenChange={setWhiteboardsOpen}>
            <div className="flex items-center pr-1">
              <CollapsibleTrigger className="flex-1 min-w-0 flex items-center gap-1 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform",
                    whiteboardsOpen && "rotate-90"
                  )}
                />
                <PenTool className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium truncate">Whiteboards</span>
              </CollapsibleTrigger>
              <span className="text-xs text-muted-foreground shrink-0">
                {whiteboards.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 hover:bg-primary/10 hover:text-primary"
                onClick={onCreateWhiteboard}
                title="Create whiteboard"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CollapsibleContent>
              <div className="pl-4 space-y-0.5">
                {whiteboards.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No whiteboards yet.{" "}
                    <button
                      onClick={onCreateWhiteboard}
                      className="text-primary hover:underline cursor-pointer"
                    >
                      Create one
                    </button>
                  </div>
                ) : (
                  whiteboards.map((whiteboard) => (
                    <Link
                      key={whiteboard.id}
                      href={`/knowledge/whiteboards/${whiteboard.id}`}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                        pathname === `/knowledge/whiteboards/${whiteboard.id}`
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <span className="text-base">{whiteboard.icon}</span>
                      <span className="truncate">{whiteboard.title}</span>
                    </Link>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* All Pages Section */}
          <Collapsible open={pagesOpen} onOpenChange={setPagesOpen}>
            <div className="flex items-center pr-1">
              <CollapsibleTrigger className="flex-1 min-w-0 flex items-center gap-1 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform",
                    pagesOpen && "rotate-90"
                  )}
                />
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium truncate">All Pages</span>
              </CollapsibleTrigger>
              <span className="text-xs text-muted-foreground shrink-0 mr-2">
                {pages.length}
              </span>
            </div>
            <CollapsibleContent>
              <div className="pl-4 space-y-0.5">
                {rootPages.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No pages yet.{" "}
                    <button
                      onClick={onCreatePage}
                      className="text-primary hover:underline cursor-pointer"
                    >
                      Create one
                    </button>
                  </div>
                ) : (
                  rootPages.map((page) => (
                    <PageTreeItem
                      key={page.id}
                      page={page}
                      pages={pages}
                      isActive={isActive}
                    />
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={onCreatePage}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Page
        </Button>
      </div>
    </div>
  )
}

interface DroppableCategoryProps {
  category: KnowledgeCategory
  isSelected: boolean
  onClick: () => void
  pageCount: number
}

function DroppableCategory({ category, isSelected, onClick, pageCount }: DroppableCategoryProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `category-${category.id}`,
    data: { type: "category", categoryId: category.id },
  })

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm w-full transition-colors",
        isSelected
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent hover:text-accent-foreground",
        isOver && "bg-sky-100 dark:bg-sky-900/30 ring-2 ring-sky-500"
      )}
    >
      <span
        className="size-2.5 rounded-full shrink-0"
        style={{ backgroundColor: category.color || "#6b7280" }}
      />
      <span className="truncate flex-1 text-left">{category.name}</span>
      <span className="text-xs text-muted-foreground mr-1">
        {pageCount}
      </span>
    </button>
  )
}

interface PageItemProps {
  page: KnowledgePage
  isActive: boolean
}

function PageItem({ page, isActive }: PageItemProps) {
  return (
    <Link
      href={`/knowledge/${page.id}`}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <span className="text-base">{page.icon || "📄"}</span>
      <span className="truncate">{page.title}</span>
    </Link>
  )
}

interface PageTreeItemProps {
  page: KnowledgePage
  pages: KnowledgePage[]
  isActive: (id: string) => boolean
  depth?: number
}

function PageTreeItem({ page, pages, isActive, depth = 0 }: PageTreeItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const childPages = pages.filter(p => p.parentId === page.id)
  const hasChildren = childPages.length > 0

  if (!hasChildren) {
    return (
      <div style={{ paddingLeft: depth * 12 }}>
        <PageItem page={page} isActive={isActive(page.id)} />
      </div>
    )
  }

  return (
    <div style={{ paddingLeft: depth * 12 }}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center">
          <CollapsibleTrigger className="p-1 hover:bg-accent rounded cursor-pointer">
            <ChevronRight
              className={cn(
                "h-3 w-3 transition-transform",
                isOpen && "rotate-90"
              )}
            />
          </CollapsibleTrigger>
          <Link
            href={`/knowledge/${page.id}`}
            className={cn(
              "flex-1 flex items-center gap-2 px-1 py-1.5 rounded-md text-sm transition-colors",
              isActive(page.id)
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <span className="text-base">{page.icon || "📄"}</span>
            <span className="truncate">{page.title}</span>
          </Link>
        </div>
        <CollapsibleContent>
          <div className="space-y-0.5">
            {childPages.map((child) => (
              <PageTreeItem
                key={child.id}
                page={child}
                pages={pages}
                isActive={isActive}
                depth={depth + 1}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
