"use client"

import { useState, useEffect } from "react"
import { useCalendar, CalendarEvent } from "@/providers/calendar-provider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@dreamteam/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Clock, MapPin, Users, Loader2, Trash2 } from "lucide-react"

interface EventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialDate?: Date | null
  event?: CalendarEvent | null
  mode?: 'create' | 'edit'
}

export function EventDialog({ open, onOpenChange, initialDate, event, mode = 'create' }: EventDialogProps) {
  const { createEvent, updateEvent, deleteEvent } = useCalendar()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("")
  const [participants, setParticipants] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditMode = mode === 'edit' && event

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      if (isEditMode && event) {
        // Edit mode - populate from existing event
        const eventStart = new Date(event.when.startTime * 1000)
        const eventEnd = new Date(event.when.endTime * 1000)

        setTitle(event.title || "")
        setDescription(event.description || "")
        setLocation(event.location || "")
        setStartDate(formatDateForInput(eventStart))
        setStartTime(formatTimeForInput(eventStart))
        setEndDate(formatDateForInput(eventEnd))
        setEndTime(formatTimeForInput(eventEnd))
        setParticipants(event.participants?.map(p => p.email).join(', ') || "")
      } else {
        // Create mode - use initialDate or now
        const date = initialDate ? new Date(initialDate) : new Date()

        // Round to next hour
        date.setMinutes(0, 0, 0)
        if (date.getMinutes() > 0 || date.getSeconds() > 0) {
          date.setHours(date.getHours() + 1)
        }

        const endDateTime = new Date(date)
        endDateTime.setHours(date.getHours() + 1)

        setStartDate(formatDateForInput(date))
        setStartTime(formatTimeForInput(date))
        setEndDate(formatDateForInput(endDateTime))
        setEndTime(formatTimeForInput(endDateTime))

        setTitle("")
        setDescription("")
        setLocation("")
        setParticipants("")
      }
      setError(null)
    }
  }, [open, initialDate, isEditMode, event])

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const formatTimeForInput = (date: Date) => {
    return date.toTimeString().slice(0, 5)
  }

  const parseDateTime = (dateStr: string, timeStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number)
    const [hours, minutes] = timeStr.split(':').map(Number)
    return new Date(year, month - 1, day, hours, minutes)
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Please enter a title")
      return
    }

    if (!startDate || !startTime || !endDate || !endTime) {
      setError("Please set start and end times")
      return
    }

    const start = parseDateTime(startDate, startTime)
    const end = parseDateTime(endDate, endTime)

    if (end <= start) {
      setError("End time must be after start time")
      return
    }

    setSaving(true)
    setError(null)

    const participantsList = participants
      .split(',')
      .map(p => p.trim())
      .filter(p => p)
      .map(email => ({ email }))

    let success: boolean

    if (isEditMode && event) {
      // Update existing event
      success = await updateEvent(event.id, {
        title,
        description: description || undefined,
        location: location || undefined,
        startTime: start,
        endTime: end,
        participants: participantsList.length > 0 ? participantsList : undefined,
      })
    } else {
      // Create new event
      success = await createEvent({
        title,
        description: description || undefined,
        location: location || undefined,
        startTime: start,
        endTime: end,
        participants: participantsList.length > 0 ? participantsList : undefined,
      })
    }

    setSaving(false)

    if (success) {
      onOpenChange(false)
    } else {
      setError(isEditMode ? "Failed to update event" : "Failed to create event")
    }
  }

  const handleDelete = async () => {
    if (!event) return

    setDeleting(true)
    const success = await deleteEvent(event.id)
    setDeleting(false)
    setDeleteDialogOpen(false)

    if (success) {
      onOpenChange(false)
    } else {
      setError("Failed to delete event")
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Event' : 'New Event'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
            />
          </div>

          {/* Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Start
              </Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-24"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                End
              </Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-24"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
            />
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <Label htmlFor="participants" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participants
            </Label>
            <Input
              id="participants"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple emails with commas
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description"
              rows={3}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-2">
            {isEditMode ? (
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={saving}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditMode ? 'Save Changes' : 'Create Event'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Event</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{event?.title || 'this event'}&quot;? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
