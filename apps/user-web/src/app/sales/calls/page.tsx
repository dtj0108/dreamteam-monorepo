"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Search,
  Loader2,
  X,
  FileText,
  Calendar,
} from "lucide-react"
import { CallDetail, DISPOSITION_OPTIONS } from "@/components/sales/call-detail"
import { ScheduleCallbackDialog } from "@/components/sales/schedule-callback-dialog"
import { CallItem } from "@/components/mail/calls-list"

type FilterTab = "all" | "inbound" | "outbound" | "missed" | "scheduled"

interface ScheduledCall {
  id: string
  user_id: string
  lead_id: string | null
  contact_id: string | null
  from_number: string
  to_number: string
  scheduled_for: string
  status: string
  notes: string | null
  reminder_sent_at: string | null
  created_at: string
}

interface CallStats {
  total: number
  inbound: number
  outbound: number
  missed: number
}

export default function CallsPage() {
  const [calls, setCalls] = useState<CallItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCall, setSelectedCall] = useState<CallItem | null>(null)
  const [stats, setStats] = useState<CallStats>({ total: 0, inbound: 0, outbound: 0, missed: 0 })
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [scheduleCallInfo, setScheduleCallInfo] = useState<{
    phoneNumber: string
    leadId?: string
    contactId?: string
  } | null>(null)
  const [scheduledCalls, setScheduledCalls] = useState<ScheduledCall[]>([])
  const [loadingScheduled, setLoadingScheduled] = useState(false)

  const fetchCalls = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: "call", limit: "200" })

      if (filter === "inbound") {
        params.set("direction", "inbound")
      } else if (filter === "outbound") {
        params.set("direction", "outbound")
      } else if (filter === "missed") {
        params.set("status", "missed")
      }

      if (searchQuery) {
        params.set("search", searchQuery)
      }

      const res = await fetch(`/api/communications?${params}`)
      if (!res.ok) throw new Error("Failed to fetch calls")
      const data = await res.json()
      setCalls(data)

      // Calculate stats from all calls (without filter)
      if (filter === "all" && !searchQuery) {
        const statsData = {
          total: data.length,
          inbound: data.filter((c: CallItem) => c.direction === "inbound").length,
          outbound: data.filter((c: CallItem) => c.direction === "outbound").length,
          missed: data.filter(
            (c: CallItem) =>
              c.twilio_status === "no-answer" ||
              c.twilio_status === "busy" ||
              c.twilio_status === "failed"
          ).length,
        }
        setStats(statsData)
      }
    } catch (err) {
      console.error("Failed to fetch calls:", err)
    } finally {
      setLoading(false)
    }
  }, [filter, searchQuery])

  useEffect(() => {
    if (filter !== "scheduled") {
      fetchCalls()
    }
  }, [fetchCalls, filter])

  const fetchScheduledCalls = useCallback(async () => {
    setLoadingScheduled(true)
    try {
      const res = await fetch("/api/communications/call/scheduled")
      if (!res.ok) throw new Error("Failed to fetch scheduled calls")
      const data = await res.json()
      setScheduledCalls(data)
    } catch (err) {
      console.error("Failed to fetch scheduled calls:", err)
    } finally {
      setLoadingScheduled(false)
    }
  }, [])

  useEffect(() => {
    if (filter === "scheduled") {
      fetchScheduledCalls()
    }
  }, [filter, fetchScheduledCalls])

  // Fetch stats separately on mount
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/communications?type=call&limit=500")
        if (res.ok) {
          const data = await res.json()
          setStats({
            total: data.length,
            inbound: data.filter((c: CallItem) => c.direction === "inbound").length,
            outbound: data.filter((c: CallItem) => c.direction === "outbound").length,
            missed: data.filter(
              (c: CallItem) =>
                c.twilio_status === "no-answer" ||
                c.twilio_status === "busy" ||
                c.twilio_status === "failed"
            ).length,
          })
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err)
      }
    }
    fetchStats()
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffDays === 1) {
      return "Yesterday"
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatPhoneNumber = (number: string) => {
    if (number.startsWith("+1") && number.length === 12) {
      return `(${number.slice(2, 5)}) ${number.slice(5, 8)}-${number.slice(8)}`
    }
    return number
  }

  const getCallIcon = (call: CallItem) => {
    const isMissed =
      call.twilio_status === "no-answer" ||
      call.twilio_status === "busy" ||
      call.twilio_status === "failed"

    if (isMissed) {
      return <PhoneMissed className="h-4 w-4 text-destructive" />
    }
    if (call.direction === "inbound") {
      return <PhoneIncoming className="h-4 w-4 text-green-600" />
    }
    return <PhoneOutgoing className="h-4 w-4 text-blue-600" />
  }

  const getCallLabel = (call: CallItem) => {
    const isMissed =
      call.twilio_status === "no-answer" ||
      call.twilio_status === "busy" ||
      call.twilio_status === "failed"

    if (isMissed) return "Missed"
    if (call.direction === "inbound") return "Incoming"
    return "Outgoing"
  }

  const handleCallBack = async (phoneNumber: string) => {
    try {
      const res = await fetch("/api/communications/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phoneNumber,
          contactId: selectedCall?.contact_id,
          leadId: selectedCall?.lead_id,
        }),
      })
      if (res.ok) {
        fetchCalls()
      }
    } catch (err) {
      console.error("Failed to initiate call:", err)
    }
  }

  const handleCallUpdated = (updatedCall: CallItem) => {
    setCalls((prev) =>
      prev.map((c) => (c.id === updatedCall.id ? updatedCall : c))
    )
    setSelectedCall(updatedCall)
  }

  const getDispositionOption = (value: string) => {
    return DISPOSITION_OPTIONS.find((opt) => opt.value === value)
  }

  const handleScheduleCallback = (call: CallItem) => {
    const phoneNumber =
      call.direction === "inbound" ? call.from_number : call.to_number
    setScheduleCallInfo({
      phoneNumber,
      leadId: call.lead_id,
      contactId: call.contact_id,
    })
    setScheduleDialogOpen(true)
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="p-6 border-b space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Call History</h1>
              <p className="text-muted-foreground">
                View and manage all your calls
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">{stats.total}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Inbound
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <PhoneIncoming className="h-4 w-4 text-green-600" />
                  <span className="text-2xl font-bold">{stats.inbound}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Outbound
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <PhoneOutgoing className="h-4 w-4 text-blue-600" />
                  <span className="text-2xl font-bold">{stats.outbound}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Missed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <PhoneMissed className="h-4 w-4 text-destructive" />
                  <span className="text-2xl font-bold">{stats.missed}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Tabs and Search */}
          <div className="flex items-center gap-4">
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as FilterTab)}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="inbound">Inbound</TabsTrigger>
                <TabsTrigger value="outbound">Outbound</TabsTrigger>
                <TabsTrigger value="missed">Missed</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-6 w-6"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Call List */}
        <ScrollArea className="flex-1">
          {filter === "scheduled" ? (
            // Scheduled calls view
            loadingScheduled ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : scheduledCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Phone className="h-12 w-12 mb-4" />
                <p className="text-lg font-medium">No scheduled callbacks</p>
                <p className="text-sm">
                  Schedule a follow-up call from the call detail panel
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {scheduledCalls.map((scheduled) => {
                  const scheduledTime = new Date(scheduled.scheduled_for)
                  const isReminded = scheduled.status === "reminded"

                  return (
                    <div
                      key={scheduled.id}
                      className={cn(
                        "flex items-center gap-4 p-4 transition-colors hover:bg-accent",
                        isReminded && "bg-yellow-50 dark:bg-yellow-900/10"
                      )}
                    >
                      <div className="p-2 rounded-full bg-primary/10">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {formatPhoneNumber(scheduled.to_number)}
                          </span>
                          <Badge
                            variant={isReminded ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {isReminded ? "Reminder Sent" : "Pending"}
                          </Badge>
                        </div>
                        {scheduled.notes && (
                          <p className="text-sm text-muted-foreground truncate">
                            {scheduled.notes}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {scheduledTime.toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {scheduledTime.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await fetch("/api/communications/call", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                to: scheduled.to_number,
                                leadId: scheduled.lead_id,
                                contactId: scheduled.contact_id,
                              }),
                            })
                            fetchScheduledCalls()
                          } catch (err) {
                            console.error("Failed to initiate call:", err)
                          }
                        }}
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        Call Now
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          try {
                            await fetch(`/api/communications/call/scheduled/${scheduled.id}`, {
                              method: "DELETE",
                            })
                            fetchScheduledCalls()
                          } catch (err) {
                            console.error("Failed to cancel scheduled call:", err)
                          }
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : calls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Phone className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No calls found</p>
              <p className="text-sm">
                {searchQuery
                  ? "Try a different search term"
                  : "Your call history will appear here"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {calls.map((call) => {
                const isMissed =
                  call.twilio_status === "no-answer" ||
                  call.twilio_status === "busy" ||
                  call.twilio_status === "failed"
                const phoneNumber =
                  call.direction === "inbound" ? call.from_number : call.to_number

                return (
                  <div
                    key={call.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedCall(call)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setSelectedCall(call)
                      }
                    }}
                    className={cn(
                      "flex items-center gap-4 p-4 transition-colors hover:bg-accent cursor-pointer",
                      selectedCall?.id === call.id && "bg-accent",
                      isMissed && "bg-destructive/5"
                    )}
                  >
                    <div
                      className={cn(
                        "p-2 rounded-full",
                        isMissed
                          ? "bg-destructive/10"
                          : call.direction === "inbound"
                          ? "bg-green-100 dark:bg-green-900/30"
                          : "bg-blue-100 dark:bg-blue-900/30"
                      )}
                    >
                      {getCallIcon(call)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "font-medium truncate",
                            isMissed && "text-destructive"
                          )}
                        >
                          {formatPhoneNumber(phoneNumber)}
                        </span>
                        <Badge
                          variant={isMissed ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {getCallLabel(call)}
                        </Badge>
                        {call.recordings && call.recordings.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Recording
                          </Badge>
                        )}
                        {call.disposition && (
                          <Badge className={`text-xs ${getDispositionOption(call.disposition)?.color}`}>
                            {getDispositionOption(call.disposition)?.label}
                          </Badge>
                        )}
                        {call.notes && (
                          <FileText className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDuration(call.duration_seconds)}
                        <span className="mx-2">·</span>
                        <span className="capitalize">
                          {call.twilio_status?.replace("-", " ") || "Unknown"}
                        </span>
                      </div>
                    </div>

                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(call.created_at)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Detail Panel */}
      {selectedCall && (
        <div className="w-[400px] border-l bg-background">
          <CallDetail
            call={selectedCall}
            onClose={() => setSelectedCall(null)}
            onCallBack={handleCallBack}
            onScheduleCallback={handleScheduleCallback}
            onCallUpdated={handleCallUpdated}
          />
        </div>
      )}

      {/* Schedule Callback Dialog */}
      <ScheduleCallbackDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        phoneNumber={scheduleCallInfo?.phoneNumber}
        leadId={scheduleCallInfo?.leadId}
        contactId={scheduleCallInfo?.contactId}
        onScheduled={() => {
          setScheduleDialogOpen(false)
          setScheduleCallInfo(null)
          if (filter === "scheduled") {
            fetchScheduledCalls()
          }
        }}
      />
    </div>
  )
}
