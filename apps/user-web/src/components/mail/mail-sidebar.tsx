"use client"

import { useLocalStorage } from "@/hooks/use-local-storage"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  Mail,
  Phone,
  MessageSquare,
  Plus,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Loader2,
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export interface NylasGrant {
  id: string
  email: string
  provider: 'google' | 'microsoft'
  status: 'active' | 'error' | 'expired'
}

interface MailSidebarProps {
  grants: NylasGrant[]
  selectedGrantId: string | null
  onSelectGrant: (grantId: string) => void
  folder: string
  onFolderChange: (folder: string) => void
  unreadCount?: number
  onCompose?: () => void
  onRefresh?: () => void
  loading?: boolean
}

const folders = [
  { id: "inbox", label: "Emails", icon: Mail },
  { id: "calls", label: "Calls", icon: Phone },
  { id: "texts", label: "Texts", icon: MessageSquare },
]

export function MailSidebar({
  grants,
  selectedGrantId,
  onSelectGrant,
  folder,
  onFolderChange,
  unreadCount = 0,
  onCompose,
  onRefresh,
  loading,
}: MailSidebarProps) {
  const [foldersOpen, setFoldersOpen] = useLocalStorage("mail-folders-open", true)

  return (
    <div className="w-64 shrink-0 border-r bg-muted/30 flex flex-col">
      {/* Header with Account Selector */}
      <div className="p-3 border-b space-y-3">
        {/* Account Switcher */}
        {grants.length > 0 && (
          <Select value={selectedGrantId || undefined} onValueChange={onSelectGrant}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {grants.map((grant) => (
                <SelectItem key={grant.id} value={grant.id}>
                  <div className="flex items-center gap-2">
                    <span className="truncate">{grant.email}</span>
                    {grant.status !== 'active' && (
                      <Badge variant="destructive" className="text-xs">
                        {grant.status}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="default" size="sm" className="flex-1" onClick={onCompose}>
            <Plus className="h-4 w-4 mr-1" />
            Compose
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={loading}
            className="h-8 w-8"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Folders Section */}
          <Collapsible open={foldersOpen} onOpenChange={setFoldersOpen} suppressHydrationWarning>
            <div className="flex items-center px-2 py-1.5">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  {foldersOpen ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                  Inbox
                </button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent>
              <div className="space-y-0.5">
                {folders.map((f) => {
                  const isActive = folder === f.id

                  return (
                    <button
                      key={f.id}
                      onClick={() => onFolderChange(f.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <f.icon className="size-4 shrink-0" />
                      <span className="truncate flex-1 text-left">{f.label}</span>
                      {f.id === "inbox" && unreadCount > 0 && (
                        <span
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded-full",
                            isActive
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-primary text-primary-foreground"
                          )}
                        >
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  )
}
