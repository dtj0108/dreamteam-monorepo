"use client"

import { ReactNode, useState, createContext, useContext, useCallback } from "react"
import { ConversationsProvider, useConversations } from "@/providers/conversations-provider"
import { ComposeDialog, type ComposeMode, type MailDetail, type DraftData } from "@/components/mail"

// Compose context for sharing compose state across components
interface ConversationsComposeContextValue {
  openCompose: (mode?: ComposeMode, email?: MailDetail | null, toEmail?: string) => void
}

const ConversationsComposeContext = createContext<ConversationsComposeContextValue | null>(null)

export function useConversationsCompose() {
  const context = useContext(ConversationsComposeContext)
  if (!context) {
    throw new Error("useConversationsCompose must be used within ConversationsLayout")
  }
  return context
}

function ConversationsLayoutContent({ children }: { children: ReactNode }) {
  const { grantId, grants, refreshTimeline, selectedContact } = useConversations()

  // Compose dialog state
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeMode, setComposeMode] = useState<ComposeMode>('compose')
  const [composeEmail, setComposeEmail] = useState<MailDetail | null>(null)
  const [prefilledTo, setPrefilledTo] = useState<string | null>(null)

  const openCompose = useCallback((mode: ComposeMode = 'compose', email: MailDetail | null = null, toEmail?: string) => {
    setComposeMode(mode)
    setComposeEmail(email)
    setPrefilledTo(toEmail || null)
    setComposeOpen(true)
  }, [])

  // Get sender email for the selected grant
  const selectedGrant = grants.find(g => g.id === grantId)
  const senderEmail = selectedGrant?.email

  // Create a fake "original email" for reply mode with prefilled to
  const effectiveEmail = composeEmail || (prefilledTo ? {
    id: '',
    from: [{ email: prefilledTo, name: selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name || ''}`.trim() : undefined }],
    to: [],
    cc: [],
    replyTo: [{ email: prefilledTo }],
    subject: null,
    body: '',
    date: Date.now() / 1000,
    unread: false,
    starred: false,
    hasAttachments: false,
  } as MailDetail : null)

  return (
    <ConversationsComposeContext.Provider value={{ openCompose }}>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {children}
      </div>

      {/* Compose Dialog */}
      {grantId && (
        <ComposeDialog
          open={composeOpen}
          onOpenChange={setComposeOpen}
          mode={composeMode}
          originalEmail={effectiveEmail}
          grantId={grantId}
          senderEmail={senderEmail}
          onSend={() => refreshTimeline()}
        />
      )}
    </ConversationsComposeContext.Provider>
  )
}

export default function ConversationsLayout({ children }: { children: ReactNode }) {
  return (
    <ConversationsProvider>
      <ConversationsLayoutContent>{children}</ConversationsLayoutContent>
    </ConversationsProvider>
  )
}
