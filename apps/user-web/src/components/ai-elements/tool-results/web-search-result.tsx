"use client"

import { Search, ExternalLink } from "lucide-react"
import { ToolResultCard } from "./tool-result-card"
import { Sources, SourcesTrigger, SourcesContent } from "../sources"
import type { WebSearchResult as WebSearchResultType } from "@/lib/agent"

const COLLAPSE_THRESHOLD = 3

interface WebSearchResultProps {
  result: WebSearchResultType
}

export function WebSearchResult({ result }: WebSearchResultProps) {
  const { results, query } = result

  const renderResultItem = (item: typeof results[0], index: number) => (
    <div key={index} className="space-y-0.5">
      {item.url ? (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-medium text-sky-600 hover:underline"
        >
          {item.title}
          <ExternalLink className="size-3" />
        </a>
      ) : (
        <div className="text-xs font-medium">{item.title}</div>
      )}
      <p className="text-xs text-muted-foreground line-clamp-2">
        {item.snippet}
      </p>
    </div>
  )

  const shouldCollapse = results.length > COLLAPSE_THRESHOLD

  return (
    <ToolResultCard
      icon={<Search className="size-4" />}
      title={`Search: "${query}"`}
      status="success"
    >
      {results.length === 0 ? (
        <p className="text-xs text-muted-foreground">No results found.</p>
      ) : shouldCollapse ? (
        <Sources className="mb-0">
          <SourcesTrigger count={results.length} />
          <SourcesContent>
            <div className="space-y-2">
              {results.map(renderResultItem)}
            </div>
          </SourcesContent>
        </Sources>
      ) : (
        <div className="space-y-2">
          {results.map(renderResultItem)}
        </div>
      )}
    </ToolResultCard>
  )
}
