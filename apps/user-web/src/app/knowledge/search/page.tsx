"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, FileText } from "lucide-react"
import { useKnowledge } from "@/providers/knowledge-provider"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const { pages, isLoading } = useKnowledge()

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

          {searchResults.map((page) => (
            <Link
              key={page.id}
              href={`/knowledge/${page.id}`}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
            >
              <span className="text-lg">{page.icon || "📄"}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{page.title}</div>
                <div className="text-xs text-muted-foreground">
                  Updated {formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true })}
                </div>
              </div>
            </Link>
          ))}

          {!query.trim() && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="size-12 mx-auto mb-4 opacity-50" />
              <p>Type to search through your pages</p>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}
