"use client"

import { useMemo, useState } from "react"
import { Plus, MessageCircle, Search, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

export interface ConversationItem {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}

interface ConversationSidebarProps {
  conversations: ConversationItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNewConversation: () => void
}

interface GroupedConversations {
  today: ConversationItem[]
  yesterday: ConversationItem[]
  previousWeek: ConversationItem[]
  older: ConversationItem[]
}

function groupConversationsByDate(conversations: ConversationItem[]): GroupedConversations {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  const groups: GroupedConversations = {
    today: [],
    yesterday: [],
    previousWeek: [],
    older: [],
  }

  for (const conv of conversations) {
    const convDate = new Date(conv.updated_at)
    const convDay = new Date(convDate.getFullYear(), convDate.getMonth(), convDate.getDate())

    if (convDay.getTime() >= today.getTime()) {
      groups.today.push(conv)
    } else if (convDay.getTime() >= yesterday.getTime()) {
      groups.yesterday.push(conv)
    } else if (convDay.getTime() >= weekAgo.getTime()) {
      groups.previousWeek.push(conv)
    } else {
      groups.older.push(conv)
    }
  }

  return groups
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageCircle className="size-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium mb-1 text-sm">No conversations yet</h3>
      <p className="text-xs text-muted-foreground">
        Start chatting to see history here
      </p>
    </div>
  )
}

interface ConversationGroupProps {
  label: string
  conversations: ConversationItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  defaultOpen?: boolean
}

function ConversationGroup({
  label,
  conversations,
  selectedId,
  onSelect,
  defaultOpen = true,
}: ConversationGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  if (conversations.length === 0) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between px-2 py-1.5">
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            {isOpen ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
            {label}
          </button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div className="space-y-0.5">
          {conversations.map((conv) => {
            const isActive = selectedId === conv.id
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
                  <span className="truncate w-full">
                    {conv.title || "Untitled conversation"}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {formatRelativeTime(conv.updated_at)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function ConversationSidebar({
  conversations,
  selectedId,
  onSelect,
  onNewConversation,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations
    const query = searchQuery.toLowerCase()
    return conversations.filter((c) =>
      c.title?.toLowerCase().includes(query) ||
      "untitled conversation".includes(query)
    )
  }, [conversations, searchQuery])

  const groupedConversations = useMemo(
    () => groupConversationsByDate(filteredConversations),
    [filteredConversations]
  )

  const hasConversations = conversations.length > 0
  const hasFilteredResults = filteredConversations.length > 0

  return (
    <div className="w-64 shrink-0 border-r bg-muted/30 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onNewConversation}
        >
          <Plus className="size-4" />
          New conversation
        </Button>
        {hasConversations && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {!hasConversations ? (
            <EmptyState />
          ) : !hasFilteredResults ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Search className="size-10 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                No conversations match &quot;{searchQuery}&quot;
              </p>
            </div>
          ) : (
            <>
              <ConversationGroup
                label="Today"
                conversations={groupedConversations.today}
                selectedId={selectedId}
                onSelect={onSelect}
              />
              <div className="mt-2">
                <ConversationGroup
                  label="Yesterday"
                  conversations={groupedConversations.yesterday}
                  selectedId={selectedId}
                  onSelect={onSelect}
                />
              </div>
              <div className="mt-2">
                <ConversationGroup
                  label="Previous 7 Days"
                  conversations={groupedConversations.previousWeek}
                  selectedId={selectedId}
                  onSelect={onSelect}
                />
              </div>
              <div className="mt-2">
                <ConversationGroup
                  label="Older"
                  conversations={groupedConversations.older}
                  selectedId={selectedId}
                  onSelect={onSelect}
                />
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
