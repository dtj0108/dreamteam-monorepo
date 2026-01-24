"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react"
import { NylasGrant, MailItem, MailDetail } from "@/components/mail"

interface InboxContextValue {
  // Grants (connected accounts)
  grants: NylasGrant[]
  selectedGrantId: string | null
  setSelectedGrantId: (id: string) => void
  fetchGrants: () => Promise<void>

  // Folder
  folder: string
  setFolder: (folder: string) => void

  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchEmails: (query: string) => Promise<void>
  isSearching: boolean

  // Emails
  emails: MailItem[]
  selectedEmailId: string | null
  selectedEmail: MailDetail | null
  loading: boolean
  loadingEmail: boolean

  // Error state
  error: string | null
  clearError: () => void

  // Actions
  fetchEmails: () => Promise<void>
  selectEmail: (email: MailItem) => void
  toggleStar: (emailId: string, starred: boolean) => Promise<void>
  toggleRead: (emailId: string, unread: boolean) => Promise<void>
  deleteEmail: (emailId: string) => Promise<boolean>

  // Computed
  unreadCount: number
}

const InboxContext = createContext<InboxContextValue | null>(null)

export function useInbox() {
  const context = useContext(InboxContext)
  if (!context) {
    throw new Error("useInbox must be used within an InboxProvider")
  }
  return context
}

export function InboxProvider({ children }: { children: ReactNode }) {
  // State
  const [grants, setGrants] = useState<NylasGrant[]>([])
  const [selectedGrantId, setSelectedGrantId] = useState<string | null>(null)
  const [emails, setEmails] = useState<MailItem[]>([])
  const [selectedEmail, setSelectedEmail] = useState<MailDetail | null>(null)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [folder, setFolder] = useState("inbox")
  const [loading, setLoading] = useState(true)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const clearError = useCallback(() => setError(null), [])

  // Ref to track if we've auto-selected a grant (prevents race condition)
  const hasAutoSelectedRef = useRef(false)

  // Fetch connected accounts
  const fetchGrants = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/nylas/grants')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to load email accounts')
        setLoading(false)
        return
      }
      const data = await res.json()
      setGrants(data.grants || [])

      // Auto-select first grant if we haven't already
      if (data.grants?.length > 0 && !hasAutoSelectedRef.current) {
        hasAutoSelectedRef.current = true
        setSelectedGrantId(data.grants[0].id)
        // fetchEmails will be triggered and will set loading to false
      } else {
        // No grants or grant already selected - stop loading
        setLoading(false)
      }
    } catch (err) {
      console.error('Failed to fetch grants:', err)
      setError('Failed to connect to server')
      setLoading(false)
    }
  }, []) // No dependencies - stable function reference

  // Map internal folder IDs to Nylas folder names
  const getNylasFolderName = (folderId: string): string | undefined => {
    const folderMap: Record<string, string> = {
      inbox: 'INBOX',
      sent: 'SENT',
      drafts: 'DRAFT',
      trash: 'TRASH',
    }
    return folderMap[folderId]
  }

  // Fetch emails for selected account
  const fetchEmails = useCallback(async () => {
    if (!selectedGrantId) {
      setEmails([])
      setLoading(false)
      return
    }

    // Skip email fetch for non-email folders (calls, texts)
    if (folder === 'calls' || folder === 'texts') {
      setEmails([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        grantId: selectedGrantId,
        limit: '50',
      })

      const nylasFolder = getNylasFolderName(folder)
      if (nylasFolder) {
        params.set('folder', nylasFolder)
      }

      const res = await fetch(`/api/nylas/emails?${params}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to load emails')
        setEmails([])
        return
      }

      const data = await res.json()
      setEmails(data.emails || [])
    } catch (err) {
      console.error('Failed to fetch emails:', err)
      setError('Failed to connect to server')
      setEmails([])
    } finally {
      setLoading(false)
    }
  }, [selectedGrantId, folder])

  // Search emails
  const searchEmails = useCallback(async (query: string) => {
    if (!selectedGrantId) return

    if (!query.trim()) {
      // Clear search, fetch regular emails
      setSearchQuery("")
      fetchEmails()
      return
    }

    setSearchQuery(query)
    setIsSearching(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        grantId: selectedGrantId,
        q: query,
        limit: '50',
      })

      const res = await fetch(`/api/nylas/emails/search?${params}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Search failed')
        return
      }

      const data = await res.json()
      setEmails(data.emails || [])
    } catch (err) {
      console.error('Search failed:', err)
      setError('Search failed')
    } finally {
      setIsSearching(false)
    }
  }, [selectedGrantId, fetchEmails])

  // Fetch full email when selected
  const fetchEmailDetail = useCallback(async (emailId: string) => {
    if (!selectedGrantId) return

    setLoadingEmail(true)
    try {
      const params = new URLSearchParams({ grantId: selectedGrantId })
      const res = await fetch(`/api/nylas/emails/${emailId}?${params}`)

      if (!res.ok) {
        console.error('Failed to fetch email detail')
        return
      }

      const data = await res.json()
      setSelectedEmail(data.email)

      // Mark as read if unread
      if (data.email?.unread) {
        await fetch(`/api/nylas/emails/${emailId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grantId: selectedGrantId, unread: false }),
        })
        setEmails(prev =>
          prev.map(e => e.id === emailId ? { ...e, unread: false } : e)
        )
      }
    } catch (error) {
      console.error('Failed to fetch email:', error)
    } finally {
      setLoadingEmail(false)
    }
  }, [selectedGrantId])

  // Handle email selection
  const selectEmail = useCallback((email: MailItem) => {
    setSelectedEmailId(email.id)
    fetchEmailDetail(email.id)
  }, [fetchEmailDetail])

  // Handle star toggle
  const toggleStar = useCallback(async (emailId: string, starred: boolean) => {
    if (!selectedGrantId) return

    try {
      await fetch(`/api/nylas/emails/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantId: selectedGrantId, starred }),
      })

      setEmails(prev =>
        prev.map(e => e.id === emailId ? { ...e, starred } : e)
      )
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(prev => prev ? { ...prev, starred } : null)
      }
    } catch (error) {
      console.error('Failed to toggle star:', error)
    }
  }, [selectedGrantId, selectedEmail])

  // Handle read toggle
  const toggleRead = useCallback(async (emailId: string, unread: boolean) => {
    if (!selectedGrantId) return

    try {
      await fetch(`/api/nylas/emails/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantId: selectedGrantId, unread }),
      })

      setEmails(prev =>
        prev.map(e => e.id === emailId ? { ...e, unread } : e)
      )
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(prev => prev ? { ...prev, unread } : null)
      }
    } catch (error) {
      console.error('Failed to toggle read status:', error)
    }
  }, [selectedGrantId, selectedEmail])

  // Handle email delete
  const deleteEmailFn = useCallback(async (emailId: string): Promise<boolean> => {
    if (!selectedGrantId) return false

    try {
      const params = new URLSearchParams({ grantId: selectedGrantId })
      const res = await fetch(`/api/nylas/emails/${emailId}?${params}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to delete email')
        return false
      }

      // Remove from local state
      setEmails(prev => prev.filter(e => e.id !== emailId))

      // Clear selection if deleted email was selected
      if (selectedEmailId === emailId) {
        setSelectedEmailId(null)
        setSelectedEmail(null)
      }

      return true
    } catch (error) {
      console.error('Failed to delete email:', error)
      setError('Failed to delete email')
      return false
    }
  }, [selectedGrantId, selectedEmailId])

  // Initial load
  useEffect(() => {
    fetchGrants()
  }, [fetchGrants])

  // Fetch emails when grant or folder changes
  useEffect(() => {
    if (selectedGrantId) {
      fetchEmails()
      setSelectedEmail(null)
      setSelectedEmailId(null)
    }
  }, [selectedGrantId, folder, fetchEmails])

  const unreadCount = emails.filter(e => e.unread).length

  return (
    <InboxContext.Provider
      value={{
        grants,
        selectedGrantId,
        setSelectedGrantId,
        fetchGrants,
        folder,
        setFolder,
        searchQuery,
        setSearchQuery,
        searchEmails,
        isSearching,
        emails,
        selectedEmailId,
        selectedEmail,
        loading,
        loadingEmail,
        error,
        clearError,
        fetchEmails,
        selectEmail,
        toggleStar,
        toggleRead,
        deleteEmail: deleteEmailFn,
        unreadCount,
      }}
    >
      {children}
    </InboxContext.Provider>
  )
}
