"use client"

import { useState, useEffect, useCallback } from "react"
import {
  X,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Phone,
  Download,
  FileText,
  Calendar,
  Loader2,
  Check,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RecordingPlayer } from "@/components/sales/recording-player"
import { CallItem } from "@/components/mail/calls-list"

// Disposition options with colors
const DISPOSITION_OPTIONS = [
  { value: "interested", label: "Interested", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  { value: "not_interested", label: "Not Interested", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  { value: "follow_up", label: "Follow Up Required", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  { value: "voicemail", label: "Left Voicemail", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "no_answer", label: "No Answer", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
  { value: "wrong_number", label: "Wrong Number", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "do_not_call", label: "Do Not Call", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  { value: "other", label: "Other", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
]

interface CallDetailProps {
  call: CallItem
  onClose: () => void
  onCallBack?: (phoneNumber: string) => void
  onScheduleCallback?: (call: CallItem) => void
  onCallUpdated?: (call: CallItem) => void
}

export function CallDetail({
  call,
  onClose,
  onCallBack,
  onScheduleCallback,
  onCallUpdated,
}: CallDetailProps) {
  const [notes, setNotes] = useState(call.notes || "")
  const [disposition, setDisposition] = useState(call.disposition || "")
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [savingDisposition, setSavingDisposition] = useState(false)
  const [transcribing, setTranscribing] = useState<string | null>(null)

  const isMissed =
    call.twilio_status === "no-answer" ||
    call.twilio_status === "busy" ||
    call.twilio_status === "failed"

  const phoneNumber = call.direction === "inbound" ? call.from_number : call.to_number

  // Update local state when call prop changes
  useEffect(() => {
    setNotes(call.notes || "")
    setDisposition(call.disposition || "")
  }, [call.id, call.notes, call.disposition])

  const formatPhoneNumber = (number: string) => {
    if (number.startsWith("+1") && number.length === 12) {
      return `(${number.slice(2, 5)}) ${number.slice(5, 8)}-${number.slice(8)}`
    }
    return number
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getCallIcon = () => {
    if (isMissed) {
      return <PhoneMissed className="h-5 w-5 text-destructive" />
    }
    if (call.direction === "inbound") {
      return <PhoneIncoming className="h-5 w-5 text-green-600" />
    }
    return <PhoneOutgoing className="h-5 w-5 text-blue-600" />
  }

  const getStatusLabel = () => {
    if (isMissed) return "Missed"
    if (call.direction === "inbound") return "Incoming"
    return "Outgoing"
  }

  const getDispositionOption = (value: string) => {
    return DISPOSITION_OPTIONS.find((opt) => opt.value === value)
  }

  // Save notes with debounce
  const saveNotes = useCallback(
    async (newNotes: string) => {
      setSavingNotes(true)
      setNotesSaved(false)
      try {
        const res = await fetch(`/api/communications/${call.id}/notes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: newNotes }),
        })
        if (res.ok) {
          setNotesSaved(true)
          setTimeout(() => setNotesSaved(false), 2000)
          onCallUpdated?.({ ...call, notes: newNotes })
        }
      } catch (err) {
        console.error("Failed to save notes:", err)
      } finally {
        setSavingNotes(false)
      }
    },
    [call, onCallUpdated]
  )

  // Debounced notes save
  useEffect(() => {
    if (notes === (call.notes || "")) return

    const timer = setTimeout(() => {
      saveNotes(notes)
    }, 1000)

    return () => clearTimeout(timer)
  }, [notes, call.notes, saveNotes])

  // Save disposition immediately
  const saveDisposition = async (newDisposition: string) => {
    setSavingDisposition(true)
    try {
      const res = await fetch(`/api/communications/${call.id}/disposition`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disposition: newDisposition }),
      })
      if (res.ok) {
        setDisposition(newDisposition)
        onCallUpdated?.({ ...call, disposition: newDisposition })
      }
    } catch (err) {
      console.error("Failed to save disposition:", err)
    } finally {
      setSavingDisposition(false)
    }
  }

  // Trigger transcription
  const transcribeRecording = async (recordingId: string) => {
    setTranscribing(recordingId)
    try {
      const res = await fetch(
        `/api/communications/recordings/${recordingId}/transcribe`,
        { method: "POST" }
      )
      if (res.ok) {
        const data = await res.json()
        // Update local state with transcription
        if (call.recordings) {
          const updatedRecordings = call.recordings.map((r) =>
            r.id === recordingId
              ? { ...r, transcription: data.transcription, transcription_status: "completed" }
              : r
          )
          onCallUpdated?.({ ...call, recordings: updatedRecordings })
        }
      }
    } catch (err) {
      console.error("Failed to transcribe recording:", err)
    } finally {
      setTranscribing(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Call Details</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Call Info */}
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-full ${
              isMissed
                ? "bg-destructive/10"
                : call.direction === "inbound"
                ? "bg-green-100 dark:bg-green-900/30"
                : "bg-blue-100 dark:bg-blue-900/30"
            }`}
          >
            {getCallIcon()}
          </div>
          <div className="flex-1">
            <p className="text-xl font-semibold">{formatPhoneNumber(phoneNumber)}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={isMissed ? "destructive" : "secondary"}>
                {getStatusLabel()}
              </Badge>
              <span className="text-sm text-muted-foreground capitalize">
                {call.twilio_status?.replace("-", " ") || "Unknown"}
              </span>
              {disposition && (
                <Badge className={getDispositionOption(disposition)?.color}>
                  {getDispositionOption(disposition)?.label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Disposition Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            Call Disposition
            {savingDisposition && <Loader2 className="h-3 w-3 animate-spin" />}
          </label>
          <Select value={disposition} onValueChange={saveDisposition}>
            <SelectTrigger>
              <SelectValue placeholder="Select disposition..." />
            </SelectTrigger>
            <SelectContent>
              {DISPOSITION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Details */}
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Date & Time</span>
            <span>{formatDate(call.created_at)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Duration</span>
            <span>{formatDuration(call.duration_seconds)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Direction</span>
            <span className="capitalize">{call.direction}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">From</span>
            <span>{formatPhoneNumber(call.from_number)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">To</span>
            <span>{formatPhoneNumber(call.to_number)}</span>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Notes
            {savingNotes && <Loader2 className="h-3 w-3 animate-spin" />}
            {notesSaved && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this call..."
            rows={4}
          />
        </div>

        {/* Recordings */}
        {call.recordings && call.recordings.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">Recordings</h3>
            <div className="space-y-4">
              {call.recordings.map((recording) => (
                <div key={recording.id} className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <RecordingPlayer
                    recordingId={recording.id}
                    duration={recording.duration_seconds}
                  />

                  {/* Transcription */}
                  {recording.transcription ? (
                    <div className="mt-2 p-3 bg-background rounded border">
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
                      onClick={() => transcribeRecording(recording.id)}
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
                          Transcribe Recording
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={async () => {
                      try {
                        const res = await fetch(
                          `/api/communications/recordings/${recording.id}`
                        )
                        if (res.ok) {
                          const data = await res.json()
                          if (data.playback_url) {
                            window.open(data.playback_url, "_blank")
                          }
                        }
                      } catch (err) {
                        console.error("Failed to get download URL:", err)
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Recording
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t space-y-2">
        {onScheduleCallback && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onScheduleCallback(call)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Follow-up
          </Button>
        )}
        <Button
          className="w-full"
          onClick={() => onCallBack?.(phoneNumber)}
          disabled={!onCallBack}
        >
          <Phone className="h-4 w-4 mr-2" />
          Call Back
        </Button>
      </div>
    </div>
  )
}

export { DISPOSITION_OPTIONS }
