"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Voicemail, Loader2, Phone, Check, Sparkles } from "lucide-react"
import { RecordingPlayer } from "@/components/sales/recording-player"
import { CallItem } from "@/components/mail/calls-list"

interface VoicemailItem extends CallItem {
  isRead?: boolean
}

export default function VoicemailPage() {
  const [voicemails, setVoicemails] = useState<VoicemailItem[]>([])
  const [loading, setLoading] = useState(true)
  const [readVoicemails, setReadVoicemails] = useState<Set<string>>(new Set())
  const [transcribing, setTranscribing] = useState<string | null>(null)

  useEffect(() => {
    async function fetchVoicemails() {
      try {
        const res = await fetch("/api/communications?type=call&isVoicemail=true&limit=100")
        if (!res.ok) throw new Error("Failed to fetch voicemails")
        const data = await res.json()
        setVoicemails(data)
      } catch (err) {
        console.error("Failed to fetch voicemails:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchVoicemails()

    // Load read status from localStorage
    const stored = localStorage.getItem("readVoicemails")
    if (stored) {
      setReadVoicemails(new Set(JSON.parse(stored)))
    }
  }, [])

  const markAsRead = (id: string) => {
    const newRead = new Set(readVoicemails)
    newRead.add(id)
    setReadVoicemails(newRead)
    localStorage.setItem("readVoicemails", JSON.stringify([...newRead]))
  }

  const markAllAsRead = () => {
    const allIds = voicemails.map((v) => v.id)
    const newRead = new Set(allIds)
    setReadVoicemails(newRead)
    localStorage.setItem("readVoicemails", JSON.stringify(allIds))
  }

  const formatPhoneNumber = (number: string) => {
    if (number.startsWith("+1") && number.length === 12) {
      return `(${number.slice(2, 5)}) ${number.slice(5, 8)}-${number.slice(8)}`
    }
    return number
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) {
      return `${diffMins}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays === 1) {
      return "Yesterday"
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
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

  const unreadCount = voicemails.filter((v) => !readVoicemails.has(v.id)).length

  const handleCallBack = async (voicemail: VoicemailItem) => {
    try {
      await fetch("/api/communications/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: voicemail.from_number,
          contactId: voicemail.contact_id,
          leadId: voicemail.lead_id,
        }),
      })
    } catch (err) {
      console.error("Failed to initiate call:", err)
    }
  }

  const handleTranscribe = async (voicemailId: string, recordingId: string) => {
    setTranscribing(recordingId)
    try {
      const res = await fetch(
        `/api/communications/recordings/${recordingId}/transcribe`,
        { method: "POST" }
      )
      if (res.ok) {
        const data = await res.json()
        // Update the voicemail in state with the transcription
        setVoicemails((prev) =>
          prev.map((v) => {
            if (v.id === voicemailId && v.recordings) {
              return {
                ...v,
                recordings: v.recordings.map((r) =>
                  r.id === recordingId
                    ? { ...r, transcription: data.transcription, transcription_status: "completed" }
                    : r
                ),
              }
            }
            return v
          })
        )
      }
    } catch (err) {
      console.error("Failed to transcribe:", err)
    } finally {
      setTranscribing(null)
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">Voicemail</h1>
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount} new</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Listen to voicemail messages from missed calls
            </p>
          </div>
          {voicemails.length > 0 && unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Voicemail List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : voicemails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Voicemail className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No voicemails</p>
            <p className="text-sm">
              Voicemails from missed calls will appear here
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {voicemails.map((voicemail) => {
              const isRead = readVoicemails.has(voicemail.id)
              const recording = voicemail.recordings?.[0]

              return (
                <Card
                  key={voicemail.id}
                  className={cn(
                    "transition-all",
                    !isRead && "border-primary bg-primary/5"
                  )}
                  onClick={() => markAsRead(voicemail.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "p-2 rounded-full",
                          isRead
                            ? "bg-muted"
                            : "bg-primary/10"
                        )}
                      >
                        <Voicemail
                          className={cn(
                            "h-5 w-5",
                            isRead ? "text-muted-foreground" : "text-primary"
                          )}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "font-medium",
                                !isRead && "font-semibold"
                              )}
                            >
                              {formatPhoneNumber(voicemail.from_number)}
                            </span>
                            {!isRead && (
                              <Badge variant="default" className="text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(voicemail.created_at)}
                          </span>
                        </div>

                        {/* Recording Player */}
                        {recording && (
                          <div className="mb-3">
                            <RecordingPlayer
                              recordingId={recording.id}
                              duration={recording.duration_seconds}
                            />
                          </div>
                        )}

                        {/* Duration and Actions */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Duration: {formatDuration(recording?.duration_seconds || voicemail.duration_seconds)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCallBack(voicemail)
                            }}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Call Back
                          </Button>
                        </div>

                        {/* Transcription */}
                        {recording && (
                          <div className="mt-3">
                            {recording.transcription ? (
                              <div className="p-3 bg-muted/50 rounded-md">
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Transcription
                                </p>
                                <p className="text-sm">{recording.transcription}</p>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleTranscribe(voicemail.id, recording.id)
                                }}
                                disabled={transcribing === recording.id}
                              >
                                {transcribing === recording.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Transcribing...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Transcribe Voicemail
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
