import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SearchIcon, FilterIcon, HashIcon, UserIcon, CalendarIcon } from "lucide-react"

export default function MessagingSearchPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Search Messages</h1>
        <p className="text-muted-foreground">Find messages, files, and conversations</p>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mb-8">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search messages..." className="pl-9" />
          </div>
          <Button variant="outline">
            <FilterIcon className="size-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Search Filters */}
      <div className="flex gap-2 mb-8">
        <Button variant="outline" size="sm">
          <HashIcon className="size-4 mr-2" />
          In channel
        </Button>
        <Button variant="outline" size="sm">
          <UserIcon className="size-4 mr-2" />
          From user
        </Button>
        <Button variant="outline" size="sm">
          <CalendarIcon className="size-4 mr-2" />
          Date range
        </Button>
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <SearchIcon className="size-8 text-muted-foreground" />
          </div>
          <CardTitle className="mb-2">Search your messages</CardTitle>
          <CardDescription className="text-center max-w-sm">
            Enter a search term above to find messages, files, and conversations across all channels.
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  )
}

