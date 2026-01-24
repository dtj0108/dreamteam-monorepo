"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Mail, Phone, MessageSquare, PhoneIncoming, PhoneOutgoing, ChevronDown, ChevronUp, Play, Pause } from "lucide-react"
import { TimelineItem as TimelineItemType } from "@/app/api/conversations/[contactId]/timeline/route"

interface TimelineItemProps {
  item: TimelineItemType
  contactName: string
  grantId: string | null
}

export function TimelineItem({ item, contactName, grantId }: TimelineItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [emailBody, setEmailBody] = useState<string | null>(null)
  const [loadingBody, setLoadingBody] = useState(false)
  const [playingRecording, setPlayingRecording] = useState<string | null>(null)

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const fetchEmailBody = async () => {
    if (!grantId || !item.email_id || emailBody) return

    setLoadingBody(true)
    try {
      const params = new URLSearchParams({ grantId })
      const res = await fetch(`/api/nylas/emails/${item.email_id}?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEmailBody(data.email?.body || 'No content')
      }
    } catch (err) {
      console.error('Failed to fetch email body:', err)
    } finally {
      setLoadingBody(false)
    }
  }

  const handleExpandEmail = () => {
    if (!expanded && !emailBody) {
      fetchEmailBody()
    }
    setExpanded(!expanded)
  }

  // Email item
  if (item.type === 'email') {
    return (
      <Card className={cn(
        "max-w-[85%]",
        item.direction === 'outbound' ? "ml-auto" : "mr-auto"
      )}>
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  {item.direction === 'inbound' ? 'Received' : 'Sent'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDate(item.timestamp)}
                </span>
              </div>

              {/* Subject */}
              {item.subject && (
                <p className="font-medium text-sm mb-1">{item.subject}</p>
              )}

              {/* Snippet or expanded body */}
              {expanded ? (
                <div className="text-sm">
                  {loadingBody ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  ) : emailBody ? (
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: emailBody }}
                    />
                  ) : (
                    <p className="text-muted-foreground">{item.snippet}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.snippet}
                </p>
              )}

              {/* Expand/collapse button */}
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-6 px-2 text-xs"
                onClick={handleExpandEmail}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show more
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // SMS item - bubble style
  if (item.type === 'sms') {
    return (
      <div
        className={cn(
          "max-w-[75%] px-4 py-2 rounded-2xl",
          item.direction === 'outbound'
            ? "ml-auto bg-primary text-primary-foreground rounded-br-md"
            : "mr-auto bg-muted rounded-bl-md"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{item.body}</p>
        <div className={cn(
          "flex items-center gap-1 mt-1 text-xs",
          item.direction === 'outbound' ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          <MessageSquare className="h-3 w-3" />
          <span>{formatDate(item.timestamp)}</span>
        </div>
      </div>
    )
  }

  // Call item - card style
  if (item.type === 'call') {
    const CallIcon = item.direction === 'inbound' ? PhoneIncoming : PhoneOutgoing

    return (
      <Card className="max-w-[85%] mx-auto">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full",
              item.twilio_status === 'completed' ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" :
              item.twilio_status === 'no-answer' || item.twilio_status === 'busy' ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" :
              "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
            )}>
              <CallIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {item.direction === 'inbound' ? 'Incoming call' : 'Outgoing call'}
                </span>
                <Badge variant="outline" className="text-xs capitalize">
                  {item.twilio_status?.replace('-', ' ') || 'unknown'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{formatDate(item.timestamp)}</span>
                {item.duration_seconds !== undefined && item.duration_seconds > 0 && (
                  <>
                    <span>·</span>
                    <span>{formatDuration(item.duration_seconds)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Recordings */}
          {item.recordings && item.recordings.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-2">Recordings</p>
              <div className="space-y-2">
                {item.recordings.map((recording) => (
                  <div key={recording.id} className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        if (playingRecording === recording.id) {
                          setPlayingRecording(null)
                        } else {
                          setPlayingRecording(recording.id)
                          // In a real implementation, we would play the audio
                        }
                      }}
                    >
                      {playingRecording === recording.id ? (
                        <Pause className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(recording.duration_seconds)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return null
}
