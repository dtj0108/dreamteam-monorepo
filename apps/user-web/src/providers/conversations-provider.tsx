"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react"
import { ConversationContact } from "@/app/api/conversations/route"
import { TimelineItem } from "@/app/api/conversations/[contactId]/timeline/route"

interface ConversationContactWithLead extends Omit<ConversationContact, 'lead'> {
  lead: { id: string; name: string }
}

interface ConversationsContextValue {
  // Contacts list
  contacts: ConversationContactWithLead[]
  loading: boolean
  error: string | null
  clearError: () => void

  // Selected contact
  selectedContactId: string | null
  selectedContact: ConversationContactWithLead | null
  setSelectedContactId: (id: string | null) => void

  // Timeline
  timeline: TimelineItem[]
  loadingTimeline: boolean
  timelineContact: {
    id: string
    first_name: string
    last_name: string | null
    email: string | null
    phone: string | null
    lead: { id: string; name: string }
  } | null

  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void

  // Actions
  fetchContacts: () => Promise<void>
  fetchTimeline: (contactId: string) => Promise<void>
  refreshTimeline: () => Promise<void>

  // Nylas grant (for email access)
  grantId: string | null
  setGrantId: (id: string | null) => void
  grants: Array<{ id: string; email: string; provider: string }>
  fetchGrants: () => Promise<void>
}

const ConversationsContext = createContext<ConversationsContextValue | null>(null)

export function useConversations() {
  const context = useContext(ConversationsContext)
  if (!context) {
    throw new Error("useConversations must be used within a ConversationsProvider")
  }
  return context
}

export function ConversationsProvider({ children }: { children: ReactNode }) {
  // Contacts state
  const [contacts, setContacts] = useState<ConversationContactWithLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Selected contact state
  const [selectedContactId, setSelectedContactIdState] = useState<string | null>(null)
  const [selectedContact, setSelectedContact] = useState<ConversationContactWithLead | null>(null)

  // Timeline state
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [timelineContact, setTimelineContact] = useState<{
    id: string
    first_name: string
    last_name: string | null
    email: string | null
    phone: string | null
    lead: { id: string; name: string }
  } | null>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState("")

  // Nylas grants state
  const [grants, setGrants] = useState<Array<{ id: string; email: string; provider: string }>>([])
  const [grantId, setGrantId] = useState<string | null>(null)

  // Refs
  const hasInitializedRef = useRef(false)
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const hasAutoSelectedGrantRef = useRef(false)

  const clearError = useCallback(() => setError(null), [])

  // Fetch Nylas grants
  const fetchGrants = useCallback(async () => {
    try {
      const res = await fetch('/api/nylas/grants')
      if (res.ok) {
        const data = await res.json()
        setGrants(data.grants || [])
        // Auto-select first grant if we have one and haven't auto-selected yet
        if (data.grants?.length > 0 && !hasAutoSelectedGrantRef.current) {
          hasAutoSelectedGrantRef.current = true
          setGrantId(data.grants[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch grants:', err)
    }
  }, []) // Empty dependency array to prevent race condition

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (searchQuery) {
        params.set('search', searchQuery)
      }
      if (grantId) {
        params.set('grantId', grantId)
      }

      const res = await fetch(`/api/conversations?${params}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to load contacts')
        setContacts([])
        return
      }

      const data = await res.json()
      setContacts(data.contacts || [])
    } catch (err) {
      console.error('Failed to fetch contacts:', err)
      setError('Failed to connect to server')
      setContacts([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, grantId])

  // Fetch timeline for a contact
  const fetchTimeline = useCallback(async (contactId: string) => {
    setLoadingTimeline(true)
    try {
      const params = new URLSearchParams()
      if (grantId) {
        params.set('grantId', grantId)
      }

      const res = await fetch(`/api/conversations/${contactId}/timeline?${params}`)
      if (!res.ok) {
        console.error('Failed to fetch timeline')
        setTimeline([])
        setTimelineContact(null)
        return
      }

      const data = await res.json()
      setTimeline(data.timeline || [])
      setTimelineContact(data.contact || null)
    } catch (err) {
      console.error('Failed to fetch timeline:', err)
      setTimeline([])
      setTimelineContact(null)
    } finally {
      setLoadingTimeline(false)
    }
  }, [grantId])

  // Refresh timeline (for use after sending messages)
  const refreshTimeline = useCallback(async () => {
    if (selectedContactId) {
      await fetchTimeline(selectedContactId)
    }
  }, [selectedContactId, fetchTimeline])

  // Handle contact selection
  const setSelectedContactId = useCallback((id: string | null) => {
    setSelectedContactIdState(id)
    if (id) {
      const contact = contacts.find(c => c.id === id)
      setSelectedContact(contact || null)
      fetchTimeline(id)
    } else {
      setSelectedContact(null)
      setTimeline([])
      setTimelineContact(null)
    }
  }, [contacts, fetchTimeline])

  // Handle search with debounce
  const handleSetSearchQuery = useCallback((query: string) => {
    setSearchQuery(query)

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }

    searchDebounceRef.current = setTimeout(() => {
      fetchContacts()
    }, 300)
  }, [fetchContacts])

  // Initial load
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      fetchGrants()
      fetchContacts()
    }
  }, [fetchGrants, fetchContacts])

  // Refetch timeline when grantId changes (to include/exclude emails)
  useEffect(() => {
    if (selectedContactId) {
      fetchTimeline(selectedContactId)
    }
  }, [grantId, selectedContactId, fetchTimeline])

  // Refetch contacts when grantId changes (to detect email conversations)
  useEffect(() => {
    if (hasInitializedRef.current && grantId) {
      fetchContacts()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grantId]) // Intentionally not including fetchContacts to avoid infinite loops

  // Cleanup
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [])

  return (
    <ConversationsContext.Provider
      value={{
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
        setSearchQuery: handleSetSearchQuery,
        fetchContacts,
        fetchTimeline,
        refreshTimeline,
        grantId,
        setGrantId,
        grants,
        fetchGrants,
      }}
    >
      {children}
    </ConversationsContext.Provider>
  )
}
