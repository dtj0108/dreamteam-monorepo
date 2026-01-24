"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  MailIcon,
  PhoneIcon,
  CalendarIcon,
  FileTextIcon,
  CheckCircle2Icon,
  SearchIcon,
  SparklesIcon,
  MessageSquareIcon,
  PhoneIncomingIcon,
  PhoneOutgoingIcon,
  Loader2Icon,
} from "lucide-react"
import { CallActivityCard, type CallCommunication } from "./call-activity-card"

interface Activity {
  id: string
  type: "call" | "email" | "meeting" | "note" | "task"
  subject?: string
  description?: string
  contact?: {
    id: string
    first_name: string
    last_name?: string
  }
  is_completed: boolean
  created_at: string
}

interface CallRecording {
  id: string
  twilio_recording_url?: string
  storage_path?: string
  duration_seconds?: number
}

interface Communication {
  id: string
  type: "sms" | "call"
  direction: "inbound" | "outbound"
  body?: string
  from_number?: string
  to_number?: string
  duration_seconds?: number
  twilio_status: string
  twilio_sid?: string
  recording_url?: string
  recordings?: CallRecording[]
  answered_at?: string
  error_message?: string
  created_at: string
  contact?: {
    id: string
    first_name: string
    last_name?: string
  }
}

interface TimelineItem {
  id: string
  itemType: "activity" | "communication"
  type: string
  direction?: "inbound" | "outbound"
  subject?: string
  body?: string
  description?: string
  from_number?: string
  to_number?: string
  duration_seconds?: number
  twilio_status?: string
  twilio_sid?: string
  recording_url?: string
  recordings?: CallRecording[]
  answered_at?: string
  error_message?: string
  contact?: {
    id: string
    first_name: string
    last_name?: string
  }
  is_completed?: boolean
  created_at: string
  // Store the original communication for calls
  originalComm?: Communication
}

interface LeadActivityTimelineProps {
  activities: Activity[]
  leadName: string
  leadId?: string
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "1d ago"
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function LeadActivityTimeline({ activities, leadName, leadId }: LeadActivityTimelineProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("all")
  const [communications, setCommunications] = React.useState<Communication[]>([])
  const [isLoadingComms, setIsLoadingComms] = React.useState(false)

  // Fetch communications when leadId is provided
  React.useEffect(() => {
    if (!leadId) return

    setIsLoadingComms(true)
    fetch(`/api/communications?leadId=${leadId}`)
      .then((res) => res.json())
      .then((data) => {
        setCommunications(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        console.error("Failed to fetch communications:", err)
      })
      .finally(() => setIsLoadingComms(false))
  }, [leadId])

  const getItemIcon = (item: TimelineItem) => {
    if (item.itemType === "communication") {
      if (item.type === "sms") {
        return <MessageSquareIcon className="size-4 text-green-600" />
      }
      if (item.type === "call") {
        if (item.direction === "inbound") {
          return <PhoneIncomingIcon className="size-4 text-blue-600" />
        }
        return <PhoneOutgoingIcon className="size-4 text-blue-600" />
      }
    }
    switch (item.type) {
      case "call":
        return <PhoneIcon className="size-4 text-blue-600" />
      case "email":
        return <MailIcon className="size-4 text-purple-600" />
      case "meeting":
        return <CalendarIcon className="size-4 text-amber-600" />
      case "note":
        return <FileTextIcon className="size-4 text-gray-600" />
      case "task":
        return <CheckCircle2Icon className="size-4 text-cyan-600" />
      default:
        return <FileTextIcon className="size-4 text-gray-600" />
    }
  }

  const getItemBgColor = (item: TimelineItem) => {
    if (item.itemType === "communication") {
      if (item.type === "sms") return "bg-green-100"
      if (item.type === "call") return "bg-blue-100"
    }
    switch (item.type) {
      case "call":
        return "bg-blue-100"
      case "email":
        return "bg-purple-100"
      case "meeting":
        return "bg-amber-100"
      case "note":
        return "bg-gray-100"
      case "task":
        return "bg-cyan-100"
      default:
        return "bg-gray-100"
    }
  }

  // Merge activities and communications into a unified timeline
  const timelineItems: TimelineItem[] = React.useMemo(() => {
    const items: TimelineItem[] = []

    // Add activities
    activities.forEach((activity) => {
      items.push({
        id: `activity-${activity.id}`,
        itemType: "activity",
        type: activity.type,
        subject: activity.subject,
        description: activity.description,
        contact: activity.contact,
        is_completed: activity.is_completed,
        created_at: activity.created_at,
      })
    })

    // Add communications
    communications.forEach((comm) => {
      items.push({
        id: `comm-${comm.id}`,
        itemType: "communication",
        type: comm.type,
        direction: comm.direction,
        body: comm.body,
        from_number: comm.from_number,
        to_number: comm.to_number,
        duration_seconds: comm.duration_seconds,
        twilio_status: comm.twilio_status,
        twilio_sid: comm.twilio_sid,
        recording_url: comm.recording_url,
        recordings: comm.recordings,
        answered_at: comm.answered_at,
        error_message: comm.error_message,
        contact: comm.contact,
        created_at: comm.created_at,
        originalComm: comm,
      })
    })

    // Sort by date (newest first)
    return items.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [activities, communications])

  // Filter items based on search and tab
  const filteredItems = timelineItems.filter((item) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSubject = item.subject?.toLowerCase().includes(query)
      const matchesDescription = item.description?.toLowerCase().includes(query)
      const matchesBody = item.body?.toLowerCase().includes(query)
      const matchesContact = item.contact?.first_name?.toLowerCase().includes(query)
      if (!matchesSubject && !matchesDescription && !matchesBody && !matchesContact) {
        return false
      }
    }

    if (activeTab === "conversations") {
      return item.type === "email" || item.type === "call" || item.type === "sms"
    }
    if (activeTab === "notes") {
      return item.type === "note"
    }

    return true
  })

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
      {/* Summarize Lead Button */}
      <div className="px-4 py-4 shrink-0">
        <Button variant="outline" className="w-full justify-start gap-2 text-primary rounded-xl border-dashed hover:bg-primary/5 transition-all duration-200">
          <SparklesIcon className="size-4" />
          SUMMARIZE LEAD
          <span className="text-muted-foreground font-normal ml-1">
            Get a snapshot of key details and activities
          </span>
        </Button>
      </div>

      {/* Tabs header with search */}
      <div className="px-4 pt-3 pb-3 border-b border-border/50 shrink-0">
        <div className="flex items-center justify-between">
          <TabsList className="h-9 bg-muted/50 rounded-xl p-1">
            <TabsTrigger value="all" className="text-sm rounded-lg data-[state=active]:shadow-sm">All</TabsTrigger>
            <TabsTrigger value="important" className="text-sm rounded-lg data-[state=active]:shadow-sm">Important</TabsTrigger>
            <TabsTrigger value="conversations" className="text-sm rounded-lg data-[state=active]:shadow-sm">Conversations</TabsTrigger>
            <TabsTrigger value="notes" className="text-sm rounded-lg data-[state=active]:shadow-sm">Notes & Summaries</TabsTrigger>
          </TabsList>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search keywords, people, and activities"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[280px] h-9 rounded-xl"
            />
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-hidden">
        <TabsContent value="all" className="m-0 p-0">
            {isLoadingComms && (
              <div className="flex items-center justify-center py-4 border-b">
                <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading communications...</span>
              </div>
            )}

            {/* Unified Timeline */}
            {filteredItems.map((item) => {
              // Use CallActivityCard for call communications
              if (item.itemType === "communication" && item.type === "call" && item.from_number && item.to_number) {
                return (
                  <CallActivityCard
                    key={item.id}
                    call={{
                      id: item.id.replace("comm-", ""),
                      type: "call",
                      direction: item.direction as "inbound" | "outbound",
                      from_number: item.from_number,
                      to_number: item.to_number,
                      duration_seconds: item.duration_seconds,
                      twilio_status: item.twilio_status || "unknown",
                      twilio_sid: item.twilio_sid,
                      recording_url: item.recording_url,
                      recordings: item.recordings,
                      answered_at: item.answered_at,
                      error_message: item.error_message,
                      contact: item.contact,
                      created_at: item.created_at,
                    }}
                  />
                )
              }

              // Default rendering for other items
              return (
                <div key={item.id} className="border-b">
                  <div className="flex items-start gap-3 p-4 hover:bg-muted/50">
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${getItemBgColor(item)}`}>
                      {getItemIcon(item)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {item.itemType === "communication" ? (
                            item.type === "sms" ? (
                              item.direction === "inbound" ? "Incoming SMS" : "Outgoing SMS"
                            ) : (
                              item.direction === "inbound" ? "Incoming Call" : "Outgoing Call"
                            )
                          ) : (
                            item.subject || item.type.charAt(0).toUpperCase() + item.type.slice(1)
                          )}
                        </span>
                        {item.is_completed && (
                          <Badge variant="secondary" className="text-xs">Completed</Badge>
                        )}
                        {item.twilio_status && item.type !== "call" && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {item.twilio_status}
                          </Badge>
                        )}
                      </div>
                      {/* SMS body */}
                      {item.itemType === "communication" && item.type === "sms" && item.body && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.body}</p>
                      )}
                      {/* Activity description */}
                      {item.itemType === "activity" && item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                      )}
                      {item.contact && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.contact.first_name} {item.contact.last_name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize text-xs">
                        {item.type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}

            {filteredItems.length === 0 && !isLoadingComms && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileTextIcon className="size-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No activities yet</h3>
                <p className="text-sm text-muted-foreground">
                  Activities will appear here as you interact with this lead.
                </p>
              </div>
            )}
        </TabsContent>

        <TabsContent value="important" className="m-0 p-4">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileTextIcon className="size-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No important items</h3>
              <p className="text-sm text-muted-foreground">
                Star important activities to see them here.
              </p>
            </div>
        </TabsContent>

        <TabsContent value="conversations" className="m-0 p-0">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquareIcon className="size-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No conversations</h3>
                <p className="text-sm text-muted-foreground">
                  SMS, calls, and emails will appear here.
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                // Use CallActivityCard for call communications
                if (item.itemType === "communication" && item.type === "call" && item.from_number && item.to_number) {
                  return (
                    <CallActivityCard
                      key={item.id}
                      call={{
                        id: item.id.replace("comm-", ""),
                        type: "call",
                        direction: item.direction as "inbound" | "outbound",
                        from_number: item.from_number,
                        to_number: item.to_number,
                        duration_seconds: item.duration_seconds,
                        twilio_status: item.twilio_status || "unknown",
                        twilio_sid: item.twilio_sid,
                        recording_url: item.recording_url,
                        recordings: item.recordings,
                        answered_at: item.answered_at,
                        error_message: item.error_message,
                        contact: item.contact,
                        created_at: item.created_at,
                      }}
                    />
                  )
                }

                return (
                  <div key={item.id} className="border-b">
                    <div className="flex items-start gap-3 p-4 hover:bg-muted/50">
                      <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${getItemBgColor(item)}`}>
                        {getItemIcon(item)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm">
                          {item.itemType === "communication" ? (
                            item.type === "sms" ? (
                              item.direction === "inbound" ? "Incoming SMS" : "Outgoing SMS"
                            ) : (
                              item.direction === "inbound" ? "Incoming Call" : "Outgoing Call"
                            )
                          ) : (
                            item.subject || item.type
                          )}
                        </span>
                        {item.body && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{item.body}</p>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
        </TabsContent>

        <TabsContent value="notes" className="m-0 p-0">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileTextIcon className="size-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No notes</h3>
                <p className="text-sm text-muted-foreground">
                  Notes and summaries will appear here.
                </p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div key={item.id} className="border-b">
                  <div className="flex items-start gap-3 p-4 hover:bg-muted/50">
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${getItemBgColor(item)}`}>
                      {getItemIcon(item)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">
                        {item.subject || "Note"}
                      </span>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatRelativeTime(item.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
        </TabsContent>
      </ScrollArea>
    </Tabs>
  )
}
