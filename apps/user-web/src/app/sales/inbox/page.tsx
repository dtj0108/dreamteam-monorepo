"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useInbox } from "@/providers/inbox-provider"
import { useCompose } from "./layout"
import { MailList, MailDisplay } from "@/components/mail"
import { CallsList, CallItem } from "@/components/mail/calls-list"
import { CallsDisplay } from "@/components/mail/calls-display"
import { TextsList, TextThread } from "@/components/mail/texts-list"
import { TextsDisplay } from "@/components/mail/texts-display"
import { GoogleSignInButton, MicrosoftSignInButton } from "@/components/nylas"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Mail, Search, Loader2, AlertCircle, X } from "lucide-react"

export default function InboxPage() {
  const {
    grants,
    emails,
    selectedEmailId,
    selectedEmail,
    loading,
    loadingEmail,
    error,
    clearError,
    fetchGrants,
    selectEmail,
    toggleStar,
    toggleRead,
    searchQuery,
    searchEmails,
    isSearching,
    folder,
  } = useInbox()

  const { openCompose } = useCompose()

  const [localSearch, setLocalSearch] = useState("")
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Calls state
  const [selectedCall, setSelectedCall] = useState<CallItem | null>(null)

  // Texts state
  const [selectedThread, setSelectedThread] = useState<TextThread | null>(null)

  // Reset selections when folder changes
  useEffect(() => {
    setSelectedCall(null)
    setSelectedThread(null)
  }, [folder])

  // Debounced search (only for emails)
  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value)

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      debounceRef.current = setTimeout(() => {
        searchEmails(value)
      }, 300)
    },
    [searchEmails]
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // No accounts connected - show onboarding (only for emails)
  if (!loading && grants.length === 0 && folder === "inbox") {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Mail className="h-16 w-16 text-muted-foreground mb-6" />
            <CardTitle className="mb-2">Connect Your Email</CardTitle>
            <CardDescription className="mb-6">
              Connect your Google or Microsoft account to view and manage your emails directly from
              here.
            </CardDescription>
            <div className="flex flex-col gap-3 w-full">
              <GoogleSignInButton onSuccess={() => fetchGrants()} />
              <MicrosoftSignInButton onSuccess={() => fetchGrants()} />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render Calls view
  if (folder === "calls") {
    return (
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Calls List Panel */}
        <div className="w-[400px] shrink-0 border-r flex flex-col">
          <CallsList
            selectedId={selectedCall?.id || null}
            onSelect={(call) => setSelectedCall(call)}
          />
        </div>

        {/* Call Display Panel */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <CallsDisplay call={selectedCall} />
        </div>
      </div>
    )
  }

  // Render Texts view
  if (folder === "texts") {
    return (
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Texts List Panel */}
        <div className="w-[400px] shrink-0 border-r flex flex-col">
          <TextsList
            selectedId={selectedThread?.id || null}
            onSelect={(thread) => setSelectedThread(thread)}
          />
        </div>

        {/* Text Display Panel */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TextsDisplay thread={selectedThread} />
        </div>
      </div>
    )
  }

  // Default: Render Emails view
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Email List Panel */}
      <div className="w-[400px] shrink-0 border-r flex flex-col">
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

        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            {isSearching ? (
              <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            )}
            <Input
              placeholder="Search emails..."
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
          {searchQuery && (
            <p className="text-xs text-muted-foreground mt-1">
              Showing results for &quot;{searchQuery}&quot;
            </p>
          )}
        </div>

        {/* Email List */}
        <ScrollArea className="flex-1 h-0">
          {loading && emails.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <MailList
              emails={emails}
              selectedId={selectedEmailId}
              onSelect={selectEmail}
              onToggleStar={toggleStar}
            />
          )}
        </ScrollArea>
      </div>

      {/* Email Display Panel */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <MailDisplay
          email={selectedEmail}
          loading={loadingEmail}
          onToggleStar={(starred) => selectedEmailId && toggleStar(selectedEmailId, starred)}
          onToggleRead={toggleRead}
          onReply={() => selectedEmail && openCompose("reply", selectedEmail)}
          onReplyAll={() => selectedEmail && openCompose("reply-all", selectedEmail)}
          onForward={() => selectedEmail && openCompose("forward", selectedEmail)}
        />
      </div>
    </div>
  )
}
