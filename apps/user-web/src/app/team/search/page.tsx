"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  SearchIcon,
  FilterIcon,
  HashIcon,
  UserIcon,
  CalendarIcon,
  FileIcon,
  Loader2,
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { formatDistanceToNow, format } from "date-fns"

interface SearchResult {
  id: string
  type: "message" | "file"
  sender: { name: string; avatar: string | null }
  channel: string
  content: string
  createdAt: Date
}

export default function MessagingSearchPage() {
  const [query, setQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  // Filter states
  const [channelFilter, setChannelFilter] = useState("")
  const [userFilter, setUserFilter] = useState("")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)
    setHasSearched(true)

    // Simulate search delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Demo results
    if (query.toLowerCase().includes("meeting")) {
      setResults([
        {
          id: "1",
          type: "message",
          sender: { name: "Alex Johnson", avatar: null },
          channel: "general",
          content: "Team meeting scheduled for Friday at 2pm",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        },
        {
          id: "2",
          type: "message",
          sender: { name: "Sam Wilson", avatar: null },
          channel: "announcements",
          content: "Don't forget about the all-hands meeting tomorrow!",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
        },
      ])
    } else {
      setResults([])
    }

    setIsSearching(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Search Messages</h1>
        <p className="text-muted-foreground">
          Find messages, files, and conversations
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Search"
            )}
          </Button>
        </div>
      </div>

      {/* Search Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <HashIcon className="size-4" />
              {channelFilter || "In channel"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="start">
            <div className="space-y-2">
              <Label>Filter by channel</Label>
              <Input
                placeholder="Channel name..."
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setChannelFilter("")}
                >
                  Clear
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <UserIcon className="size-4" />
              {userFilter || "From user"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="start">
            <div className="space-y-2">
              <Label>Filter by user</Label>
              <Input
                placeholder="User name..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setUserFilter("")}
                >
                  Clear
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="size-4" />
              {dateRange.from
                ? `${format(dateRange.from, "MMM d")}${dateRange.to ? ` - ${format(dateRange.to, "MMM d")}` : ""}`
                : "Date range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) =>
                setDateRange({ from: range?.from, to: range?.to })
              }
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {(channelFilter || userFilter || dateRange.from) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setChannelFilter("")
              setUserFilter("")
              setDateRange({})
            }}
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Results */}
      {isSearching ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : hasSearched ? (
        results.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Found {results.length} result{results.length !== 1 && "s"}
            </p>
            {results.map((result) => (
              <Card
                key={result.id}
                className="cursor-pointer hover:bg-muted/50"
              >
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Avatar className="size-9">
                      <AvatarImage src={result.sender.avatar || undefined} />
                      <AvatarFallback>
                        {getInitials(result.sender.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{result.sender.name}</span>
                        <span className="text-sm text-muted-foreground">
                          in #{result.channel}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(result.createdAt, {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="text-sm">{result.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <SearchIcon className="size-8 text-muted-foreground" />
              </div>
              <CardTitle className="mb-2">No results found</CardTitle>
              <CardDescription className="text-center max-w-sm">
                Try adjusting your search or filters to find what you&apos;re
                looking for.
              </CardDescription>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <SearchIcon className="size-8 text-muted-foreground" />
            </div>
            <CardTitle className="mb-2">Search your messages</CardTitle>
            <CardDescription className="text-center max-w-sm">
              Enter a search term above to find messages, files, and
              conversations across all channels.
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
