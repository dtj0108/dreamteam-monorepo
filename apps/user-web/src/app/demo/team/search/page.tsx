"use client"

import { DemoTeamLayout } from "@/components/demo/demo-team-layout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Search, Hash, Filter } from "lucide-react"

export default function DemoSearchPage() {
  // Mock search results
  const recentSearches = ["project update", "budget review", "team meeting"]
  
  const searchResults = [
    {
      id: "result-1",
      type: "message",
      content: "Just pushed the new API endpoints for the reporting feature. Ready for review!",
      sender: "Taylor Wilson",
      channel: "engineering",
      timestamp: "2 hours ago",
    },
    {
      id: "result-2",
      type: "message",
      content: "Updated the design specs for the dashboard redesign. Check out the Figma link.",
      sender: "Morgan Lee",
      channel: "product",
      timestamp: "Yesterday",
    },
    {
      id: "result-3",
      type: "message",
      content: "Pipeline update: We're at $648K in active opportunities. On track for a record quarter!",
      sender: "Jordan Smith",
      channel: "sales",
      timestamp: "4 hours ago",
    },
  ]

  return (
    <DemoTeamLayout breadcrumbs={[{ label: "Search" }]} title="Search">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search messages, files, and more..." 
            className="pl-10 h-12"
          />
        </div>
        <Button variant="outline" className="h-12 gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Recent Searches */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Searches</h3>
        <div className="flex flex-wrap gap-2">
          {recentSearches.map((search, idx) => (
            <Button key={idx} variant="secondary" size="sm" className="rounded-full">
              {search}
            </Button>
          ))}
        </div>
      </div>

      {/* Sample Results */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Messages</h3>
        <div className="space-y-2">
          {searchResults.map((result) => (
            <Card key={result.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-orange-100 text-orange-600">
                      {result.sender.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{result.sender}</span>
                      <Badge variant="secondary" className="text-xs">
                        <Hash className="h-3 w-3 mr-0.5" />
                        {result.channel}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{result.timestamp}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DemoTeamLayout>
  )
}

