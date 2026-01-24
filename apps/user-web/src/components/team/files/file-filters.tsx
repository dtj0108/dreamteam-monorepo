"use client"

import { useState, useEffect } from "react"
import { Search, X, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { type FileCategory } from "@/types/files"

interface FileFiltersProps {
  type?: FileCategory
  query?: string
  onTypeChange: (type: FileCategory | undefined) => void
  onQueryChange: (query: string) => void
  className?: string
}

export function FileFilters({
  type,
  query,
  onTypeChange,
  onQueryChange,
  className,
}: FileFiltersProps) {
  const [searchValue, setSearchValue] = useState(query || "")

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onQueryChange(searchValue)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValue, onQueryChange])

  // Sync external query changes
  useEffect(() => {
    setSearchValue(query || "")
  }, [query])

  const hasFilters = type || query

  const clearFilters = () => {
    setSearchValue("")
    onTypeChange(undefined)
    onQueryChange("")
  }

  return (
    <div className={cn("flex items-center gap-3 flex-wrap", className)}>
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search files..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchValue && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 size-6"
            onClick={() => setSearchValue("")}
          >
            <X className="size-3" />
          </Button>
        )}
      </div>

      {/* Type filter */}
      <Select
        value={type || "all"}
        onValueChange={(value) => onTypeChange(value === "all" ? undefined : (value as FileCategory))}
      >
        <SelectTrigger className="w-[140px]">
          <Filter className="size-4 mr-2" />
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="image">Images</SelectItem>
          <SelectItem value="document">Documents</SelectItem>
          <SelectItem value="video">Videos</SelectItem>
          <SelectItem value="audio">Audio</SelectItem>
          <SelectItem value="archive">Archives</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="size-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  )
}
