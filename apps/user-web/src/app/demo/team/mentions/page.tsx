"use client"

import { DemoTeamLayout } from "@/components/demo/demo-team-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { AtSign, Hash } from "lucide-react"

export default function DemoMentionsPage() {
  // Mock mentions data
  const mentions = [
    {
      id: "mention-1",
      content: "Hey @Alex Chen, great job on closing GrowthCo!",
      sender: "Jordan Smith",
      channel: "general",
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: "mention-2",
      content: "@Alex Chen can you join the customer call at 3pm?",
      sender: "Riley Martinez",
      channel: null,
      isDM: true,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      id: "mention-3",
      content: "Thanks @Alex Chen for the feedback on the designs!",
      sender: "Morgan Lee",
      channel: "product",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
  ]

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <DemoTeamLayout breadcrumbs={[{ label: "Mentions" }]} title="Mentions">
      <div className="space-y-3">
        {mentions.map((mention) => (
          <Card key={mention.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback className="bg-orange-100 text-orange-600">
                    {mention.sender.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{mention.sender}</span>
                    {mention.channel ? (
                      <Badge variant="secondary" className="text-xs">
                        <Hash className="h-3 w-3 mr-0.5" />
                        {mention.channel}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">DM</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{formatTime(mention.timestamp)}</span>
                  </div>
                  <p className="text-sm">{mention.content}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {mentions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <AtSign className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No mentions yet</h3>
            <p className="text-muted-foreground">
              When someone mentions you, you'll see it here.
            </p>
          </div>
        )}
      </div>
    </DemoTeamLayout>
  )
}

