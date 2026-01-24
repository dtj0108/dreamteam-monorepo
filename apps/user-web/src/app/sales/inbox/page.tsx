"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useInbox } from "@/providers/inbox-provider"
import { useCompose } from "./layout"
import { MailList, MailDisplay, MailItem } from "@/components/mail"
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
import { Mail, Search, Loader2, AlertCircle, X, Trash2 } from "lucide-react"

export default function InboxPage() {
  const {
    grants,
    selectedGrantId,
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
    deleteEmail,
    searchQuery,
    searchEmails,
    isSearching,
    folder,
  } = useInbox()

  const { openCompose, openDraft } = useCompose()

  const [localSearch, setLocalSearch] = useState("")
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [loadingDraft, setLoadingDraft] = useState(false)

  // Calls state
  const [selectedCall, setSelectedCall] = useState<CallItem | null>(null)

  // Texts state
  const [selectedThread, setSelectedThread] = useState<TextThread | null>(null)

  // Reset selections when folder changes
  useEffect(() => {
    setSelectedCall(null)
    setSelectedThread(null)
  }, [folder])

  // State for list action delete confirmation
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  // Handle email deletion (from display panel)
  const handleDeleteEmail = useCallback(async () => {
    if (!selectedEmailId) return

    setIsDeleting(true)
    const success = await deleteEmail(selectedEmailId)
    setIsDeleting(false)
    setDeleteDialogOpen(false)

    if (!success) {
      // Error will be shown via the error state in the provider
    }
  }, [selectedEmailId, deleteEmail])

  // Handle delete from list (with confirmation)
  const handleListDelete = useCallback((emailId: string) => {
    setDeleteTargetId(emailId)
    setDeleteDialogOpen(true)
  }, [])

  // Handle confirmed deletion (works for both list and display panel)
  const handleConfirmDelete = useCallback(async () => {
    const targetId = deleteTargetId || selectedEmailId
    if (!targetId) return

    setIsDeleting(true)
    const success = await deleteEmail(targetId)
    setIsDeleting(false)
    setDeleteDialogOpen(false)
    setDeleteTargetId(null)

    if (!success) {
      // Error will be shown via the error state in the provider
    }
  }, [deleteTargetId, selectedEmailId, deleteEmail])


  // Handle selecting a draft - fetch and open in compose dialog
  const handleSelectDraft = useCallback(async (email: MailItem) => {
    if (!selectedGrantId) return

    setLoadingDraft(true)
    try {
      const params = new URLSearchParams({ grantId: selectedGrantId })
      const response = await fetch(`/api/nylas/drafts/${email.id}?${params}`)

      if (response.ok) {
        const data = await response.json()
        const draft = data.draft
        openDraft({
          id: draft.id,
          to: draft.to || [],
          cc: draft.cc || [],
          bcc: draft.bcc || [],
          subject: draft.subject,
          body: draft.body || '',
        })
      }
    } catch (err) {
      console.error('Failed to fetch draft:', err)
    } finally {
      setLoadingDraft(false)
    }
  }, [selectedGrantId, openDraft])

  // Handle email/draft selection based on folder
  const handleEmailSelect = useCallback((email: MailItem) => {
    if (folder === 'drafts') {
      handleSelectDraft(email)
    } else {
      selectEmail(email)
    }
  }, [folder, handleSelectDraft, selectEmail])

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
      <div className="w-[550px] shrink-0 border-r flex flex-col">
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
          {(loading || loadingDraft) && emails.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <MailList
              emails={emails}
              selectedId={folder === 'drafts' ? null : selectedEmailId}
              folder={folder}
              onSelect={handleEmailSelect}
              onToggleStar={toggleStar}
              onToggleRead={toggleRead}
              onDelete={handleListDelete}
            />
          )}
        </ScrollArea>
      </div>

      {/* Email Display Panel */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <MailDisplay
          email={selectedEmail}
          grantId={selectedGrantId}
          loading={loadingEmail}
          onToggleStar={(starred) => selectedEmailId && toggleStar(selectedEmailId, starred)}
          onToggleRead={(unread) => selectedEmailId && toggleRead(selectedEmailId, unread)}
          onDelete={() => setDeleteDialogOpen(true)}
          onReply={() => selectedEmail && openCompose("reply", selectedEmail)}
          onReplyAll={() => selectedEmail && openCompose("reply-all", selectedEmail)}
          onForward={() => selectedEmail && openCompose("forward", selectedEmail)}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open)
        if (!open) setDeleteTargetId(null)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this email? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
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
    </div>
  )
}
