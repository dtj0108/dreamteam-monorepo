"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useConversations } from "@/providers/conversations-provider"
import { useConversationsCompose } from "./layout"
import { ConversationsList, ConversationTimeline } from "@/components/conversations"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dreamteam/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Search, Loader2, AlertCircle, X, MessageCircle, Mail } from "lucide-react"
import { GoogleSignInButton, MicrosoftSignInButton } from "@/components/nylas"
import { toast } from "sonner"

export default function ConversationsPage() {
  const {
    contacts,
    loading,
    error,
    clearError,
    selectedContactId,
    selectedContact,
    setSelectedContactId,
    timeline,
    loadingTimeline,
    timelineContact,
    searchQuery,
    setSearchQuery,
    grantId,
    grants,
    fetchGrants,
    refreshTimeline,
  } = useConversations()

  const { openCompose } = useConversationsCompose()

  const [localSearch, setLocalSearch] = useState("")
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // SMS Dialog state
  const [smsDialogOpen, setSmsDialogOpen] = useState(false)
  const [smsText, setSmsText] = useState("")
  const [sendingSms, setSendingSms] = useState(false)

  // Handle search input with debounce
  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      setSearchQuery(value)
    }, 300)
  }, [setSearchQuery])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // Handle reply email
  const handleReplyEmail = useCallback(() => {
    if (timelineContact?.email && grantId) {
      openCompose('reply', null, timelineContact.email)
    }
  }, [timelineContact, grantId, openCompose])

  // Handle send text
  const handleSendText = useCallback(() => {
    setSmsText("")
    setSmsDialogOpen(true)
  }, [])

  // Actually send the SMS
  const handleSendSms = useCallback(async () => {
    if (!timelineContact?.phone || !smsText.trim()) return

    setSendingSms(true)
    try {
      const res = await fetch('/api/communications/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: timelineContact.phone,
          body: smsText,
          contactId: timelineContact.id,
        }),
      })

      if (res.ok) {
        setSmsDialogOpen(false)
        setSmsText("")
        // Refresh timeline to show the new message
        refreshTimeline()
      } else {
        const data = await res.json().catch(() => ({}))
        console.error('Failed to send SMS:', data.error)
        toast.error("Failed to send text message", {
          description: data.error || "Please try again or contact support",
        })
      }
    } catch (err) {
      console.error('Failed to send SMS:', err)
      toast.error("Failed to send text message", {
        description: "Please try again or contact support",
      })
    } finally {
      setSendingSms(false)
    }
  }, [timelineContact, smsText, refreshTimeline])

  // Handle call
  const handleCall = useCallback(async () => {
    if (!timelineContact?.phone) return

    try {
      const res = await fetch('/api/communications/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: timelineContact.phone,
          contactId: timelineContact.id,
        }),
      })

      if (res.ok) {
        // Call initiated - timeline will update when call completes via webhook
        refreshTimeline()
      } else {
        const data = await res.json().catch(() => ({}))
        console.error('Failed to initiate call:', data.error)
        toast.error("Failed to initiate call", {
          description: data.error || "Please try again or contact support",
        })
      }
    } catch (err) {
      console.error('Failed to initiate call:', err)
      toast.error("Failed to initiate call", {
        description: "Please try again or contact support",
      })
    }
  }, [timelineContact, refreshTimeline])

  // No contacts state
  if (!loading && contacts.length === 0 && !searchQuery) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="h-16 w-16 text-muted-foreground mb-6" />
            <CardTitle className="mb-2">No Conversations Yet</CardTitle>
            <CardDescription className="mb-6">
              Add contacts to your leads to start conversations. You can communicate
              via email, text, or phone calls.
            </CardDescription>
            {grants.length === 0 && (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your email to include emails in conversations:
                </p>
                <div className="flex flex-col gap-3 w-full">
                  <GoogleSignInButton onSuccess={() => fetchGrants()} />
                  <MicrosoftSignInButton onSuccess={() => fetchGrants()} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Contacts List Panel */}
      <div className="w-[450px] shrink-0 border-r flex flex-col">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="m-3 mb-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between flex-1">
              <span>{error}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2" onClick={clearError}>
                <X className="h-3 w-3" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Email connection prompt */}
        {grants.length === 0 && (
          <div className="p-3 border-b bg-muted/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Mail className="h-4 w-4" />
              <span>Connect email for full conversations</span>
            </div>
            <div className="flex gap-2">
              <GoogleSignInButton onSuccess={() => fetchGrants()} className="text-xs py-1.5 px-2.5" />
              <MicrosoftSignInButton onSuccess={() => fetchGrants()} className="text-xs py-1.5 px-2.5" />
            </div>
          </div>
        )}

        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8"
            />
            {localSearch && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-6 w-6"
                onClick={() => handleSearchChange("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Contacts List */}
        <ScrollArea className="flex-1 h-0">
          {loading && contacts.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ConversationsList
              contacts={contacts}
              selectedId={selectedContactId}
              onSelect={(contact) => setSelectedContactId(contact.id)}
            />
          )}
        </ScrollArea>
      </div>

      {/* Timeline Panel */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <ConversationTimeline
          contact={timelineContact}
          timeline={timeline}
          loading={loadingTimeline}
          grantId={grantId}
          onReplyEmail={handleReplyEmail}
          onSendText={handleSendText}
          onCall={handleCall}
        />
      </div>

      {/* SMS Dialog */}
      <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Text Message</DialogTitle>
            <DialogDescription>
              Send a text message to {timelineContact?.first_name} {timelineContact?.last_name} at {timelineContact?.phone}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Type your message..."
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSmsDialogOpen(false)} disabled={sendingSms}>
              Cancel
            </Button>
            <Button onClick={handleSendSms} disabled={sendingSms || !smsText.trim()}>
              {sendingSms ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
