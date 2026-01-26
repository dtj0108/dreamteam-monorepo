"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MessageSquareIcon,
  PhoneIcon,
  SearchIcon,
  Loader2Icon,
  ArchiveIcon,
  InboxIcon,
} from "lucide-react"
import { CommunicationPanel } from "@/components/sales/communication-panel"

interface Lead {
  id: string
  name: string
}

interface Contact {
  id: string
  first_name: string
  last_name?: string
}

interface LastMessage {
  id: string
  type: "sms" | "call"
  direction: "inbound" | "outbound"
  body?: string
  created_at: string
}

interface ConversationThread {
  id: string
  phone_number: string
  lead_id?: string
  contact_id?: string
  last_message_at: string
  unread_count: number
  is_archived: boolean
  lead?: Lead
  contact?: Contact
  last_message?: LastMessage
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}

function getContactName(thread: ConversationThread): string {
  if (thread.contact) {
    return `${thread.contact.first_name} ${thread.contact.last_name || ""}`.trim()
  }
  if (thread.lead) {
    return thread.lead.name
  }
  return thread.phone_number
}

function getInitials(thread: ConversationThread): string {
  if (thread.contact) {
    return `${thread.contact.first_name?.[0] || ""}${thread.contact.last_name?.[0] || ""}`.toUpperCase()
  }
  if (thread.lead) {
    return thread.lead.name.slice(0, 2).toUpperCase()
  }
  return thread.phone_number.slice(-2)
}

export default function CommunicationsPage() {
  const [threads, setThreads] = React.useState<ConversationThread[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedThread, setSelectedThread] = React.useState<ConversationThread | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("inbox")

  const fetchThreads = React.useCallback(async () => {
    try {
      const includeArchived = activeTab === "archived"
      const res = await fetch(`/api/communications/threads?includeArchived=${includeArchived}`)
      if (res.ok) {
        const data = await res.json()
        setThreads(data)
      }
    } catch (error) {
      console.error("Error fetching threads:", error)
    } finally {
      setIsLoading(false)
    }
  }, [activeTab])

  React.useEffect(() => {
    fetchThreads()
  }, [fetchThreads])

  const handleSelectThread = async (thread: ConversationThread) => {
    setSelectedThread(thread)

    // Mark as read
    if (thread.unread_count > 0) {
      await fetch("/api/communications/threads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: thread.id, markAsRead: true }),
      })
      fetchThreads()
    }
  }

  const handleArchiveThread = async (thread: ConversationThread) => {
    await fetch("/api/communications/threads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: thread.id, archive: !thread.is_archived }),
    })
    if (selectedThread?.id === thread.id) {
      setSelectedThread(null)
    }
    fetchThreads()
  }

  const filteredThreads = threads.filter((thread) => {
    if (!searchQuery) return true
    const name = getContactName(thread).toLowerCase()
    return name.includes(searchQuery.toLowerCase()) || thread.phone_number.includes(searchQuery)
  })

  const inboxThreads = filteredThreads.filter((t) => !t.is_archived)
  const archivedThreads = filteredThreads.filter((t) => t.is_archived)
  const displayThreads = activeTab === "archived" ? archivedThreads : inboxThreads

  const totalUnread = threads.reduce((sum, t) => sum + (t.unread_count || 0), 0)

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Thread List */}
      <div className="w-[380px] border-r flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-semibold mb-4">Communications</h1>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-4 py-2 border-b">
            <TabsList className="w-full">
              <TabsTrigger value="inbox" className="flex-1 gap-2">
                <InboxIcon className="size-4" />
                Inbox
                {totalUnread > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {totalUnread}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="archived" className="flex-1 gap-2">
                <ArchiveIcon className="size-4" />
                Archived
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <TabsContent value="inbox" className="m-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : displayThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <MessageSquareIcon className="size-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No conversations</h3>
                  <p className="text-sm text-muted-foreground">
                    Start a conversation by sending an SMS from a lead or contact page.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {displayThreads.map((thread) => (
                    <ThreadItem
                      key={thread.id}
                      thread={thread}
                      isSelected={selectedThread?.id === thread.id}
                      onSelect={() => handleSelectThread(thread)}
                      onArchive={() => handleArchiveThread(thread)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="archived" className="m-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : archivedThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <ArchiveIcon className="size-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No archived conversations</h3>
                  <p className="text-sm text-muted-foreground">
                    Archived conversations will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {archivedThreads.map((thread) => (
                    <ThreadItem
                      key={thread.id}
                      thread={thread}
                      isSelected={selectedThread?.id === thread.id}
                      onSelect={() => handleSelectThread(thread)}
                      onArchive={() => handleArchiveThread(thread)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      {/* Conversation Panel */}
      <div className="flex-1 flex flex-col">
        {selectedThread ? (
          <CommunicationPanel
            leadId={selectedThread.lead_id || ""}
            contactId={selectedThread.contact_id}
            phoneNumber={selectedThread.phone_number}
            contactName={getContactName(selectedThread)}
            contactFirstName={selectedThread.contact?.first_name}
            contactLastName={selectedThread.contact?.last_name}
            leadName={selectedThread.lead?.name}
            leadCompany={selectedThread.lead?.name}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquareIcon className="size-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Select a conversation</h2>
            <p className="text-muted-foreground max-w-sm">
              Choose a conversation from the list to view messages and send replies.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

interface ThreadItemProps {
  thread: ConversationThread
  isSelected: boolean
  onSelect: () => void
  onArchive: () => void
}

function ThreadItem({ thread, isSelected, onSelect, onArchive }: ThreadItemProps) {
  const name = getContactName(thread)
  const initials = getInitials(thread)
  const lastMessage = thread.last_message

  return (
    <div
      className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
        isSelected ? "bg-muted" : ""
      }`}
      onClick={onSelect}
    >
      <Avatar className="size-10 shrink-0">
        <AvatarFallback className="text-sm bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-sm truncate">{name}</span>
          {thread.last_message_at && (
            <span className="text-xs text-muted-foreground shrink-0 ml-2">
              {formatRelativeTime(thread.last_message_at)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {lastMessage?.type === "call" ? (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <PhoneIcon className="size-3" />
              <span>
                {lastMessage.direction === "inbound" ? "Incoming" : "Outgoing"} call
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground truncate">
              {lastMessage?.direction === "outbound" && "You: "}
              {lastMessage?.body || "No messages yet"}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        {thread.unread_count > 0 && (
          <Badge className="h-5 min-w-5 px-1.5 text-xs">
            {thread.unread_count}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-6 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            onArchive()
          }}
        >
          <ArchiveIcon className="size-3" />
        </Button>
      </div>
    </div>
  )
}
