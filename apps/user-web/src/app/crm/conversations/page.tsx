import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { SearchIcon, MessageCircleIcon, MailIcon, PhoneIcon } from "lucide-react"

const mockConversations = [
  {
    id: 1,
    contact: "Sarah Johnson",
    company: "TechCorp Inc.",
    lastMessage: "Thanks for the proposal! I'll review it with my team and get back to you by Friday.",
    channel: "email",
    time: "2 hours ago",
    unread: true,
  },
  {
    id: 2,
    contact: "Mike Chen",
    company: "StartupXYZ",
    lastMessage: "Can we schedule a call to discuss the implementation timeline?",
    channel: "email",
    time: "Yesterday",
    unread: false,
  },
  {
    id: 3,
    contact: "Lisa Park",
    company: "Enterprise Co.",
    lastMessage: "Great demo today! Very impressed with the features.",
    channel: "call",
    time: "2 days ago",
    unread: false,
  },
]

export default function ConversationsPage() {
  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Conversations</h1>
          <p className="text-muted-foreground">All your customer communications in one place</p>
        </div>
        <Button>
          <MailIcon className="size-4 mr-2" />
          Compose
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search conversations..." className="pl-9" />
        </div>
      </div>

      {/* Conversations List */}
      <div className="space-y-2">
        {mockConversations.map((conv) => (
          <Card key={conv.id} className={`cursor-pointer hover:bg-muted/50 transition-colors ${conv.unread ? "border-primary" : ""}`}>
            <CardContent className="flex items-start gap-4 p-4">
              <Avatar>
                <AvatarFallback>{conv.contact.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-medium ${conv.unread ? "font-semibold" : ""}`}>{conv.contact}</h3>
                  <span className="text-sm text-muted-foreground">· {conv.company}</span>
                  {conv.unread && <Badge className="bg-primary text-primary-foreground">New</Badge>}
                </div>
                <p className={`text-sm truncate ${conv.unread ? "text-foreground" : "text-muted-foreground"}`}>
                  {conv.lastMessage}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-muted-foreground">{conv.time}</span>
                {conv.channel === "email" ? (
                  <MailIcon className="size-4 text-muted-foreground" />
                ) : (
                  <PhoneIcon className="size-4 text-muted-foreground" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {mockConversations.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageCircleIcon className="size-12 text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No conversations yet</CardTitle>
            <CardDescription className="text-center max-w-sm">
              Start communicating with your contacts to see conversations here.
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

