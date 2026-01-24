"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, FileText, Star } from "lucide-react"
import { useDemoKnowledge } from "@/providers/demo-provider"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

export default function DemoKnowledgeSearchPage() {
  const [query, setQuery] = useState("")
  const { pages, folders } = useDemoKnowledge()

  // Simple client-side search
  const searchResults = useMemo(() => {
    if (!query.trim()) return []

    const lowerQuery = query.toLowerCase()
    return pages.filter(
      (page) =>
        page.title.toLowerCase().includes(lowerQuery) ||
        (typeof page.content === "string" &&
          page.content.toLowerCase().includes(lowerQuery))
    )
  }, [query, pages])

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 max-w-2xl mx-auto">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-4">
            <Search className="size-6" />
            Search Pages
          </h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for pages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        {/* Search Results */}
        <div className="space-y-2">
          {query.trim() && searchResults.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pages found matching &quot;{query}&quot;
              </CardContent>
            </Card>
          )}

          {searchResults.map((page) => {
            const folder = page.folderId ? folders.find(f => f.id === page.folderId) : null
            return (
              <Link
                key={page.id}
                href={`/demo/knowledge/${page.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
              >
                <span className="text-lg">{page.icon || "📄"}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{page.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      Updated {formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true })}
                    </span>
                    {folder && (
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
                    )}
                  </div>
                </div>
                {page.isFavorite && (
                  <Star className="size-4 text-yellow-500 fill-yellow-500 shrink-0" />
                )}
              </Link>
            )
          })}

          {!query.trim() && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="size-12 mx-auto mb-4 opacity-50" />
              <p>Type to search through your pages</p>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}
