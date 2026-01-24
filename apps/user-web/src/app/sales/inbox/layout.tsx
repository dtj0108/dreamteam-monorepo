"use client"

import { ReactNode, useState, createContext, useContext, useCallback } from "react"
import { InboxProvider, useInbox } from "@/providers/inbox-provider"
import { MailSidebar, ComposeDialog, type ComposeMode, type MailDetail } from "@/components/mail"

// Compose context for sharing compose state across components
interface ComposeContextValue {
  openCompose: (mode?: ComposeMode, email?: MailDetail | null) => void
}

const ComposeContext = createContext<ComposeContextValue | null>(null)

export function useCompose() {
  const context = useContext(ComposeContext)
  if (!context) {
    throw new Error("useCompose must be used within InboxLayout")
  }
  return context
}

function InboxLayoutContent({ children }: { children: ReactNode }) {
  const {
    grants,
    selectedGrantId,
    setSelectedGrantId,
    folder,
    setFolder,
    unreadCount,
    fetchEmails,
    loading,
  } = useInbox()

  // Compose dialog state
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeMode, setComposeMode] = useState<ComposeMode>('compose')
  const [composeEmail, setComposeEmail] = useState<MailDetail | null>(null)

  const openCompose = useCallback((mode: ComposeMode = 'compose', email: MailDetail | null = null) => {
    setComposeMode(mode)
    setComposeEmail(email)
    setComposeOpen(true)
  }, [])

  // Get sender email for the selected grant
  const selectedGrant = grants.find(g => g.id === selectedGrantId)
  const senderEmail = selectedGrant?.email

  // No connected accounts - show only onboarding (no sidebar)
  if (!loading && grants.length === 0) {
    return (
      <ComposeContext.Provider value={{ openCompose }}>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </ComposeContext.Provider>
    )
  }

  // Connected accounts - show full inbox UI with sidebar
  return (
    <ComposeContext.Provider value={{ openCompose }}>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Mail Sidebar */}
        <MailSidebar
          grants={grants}
          selectedGrantId={selectedGrantId}
          onSelectGrant={setSelectedGrantId}
          folder={folder}
          onFolderChange={setFolder}
          unreadCount={unreadCount}
          onCompose={() => openCompose('compose')}
          onRefresh={fetchEmails}
          loading={loading}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {children}
        </div>

        {/* Compose Dialog */}
        <ComposeDialog
          open={composeOpen}
          onOpenChange={setComposeOpen}
          mode={composeMode}
          originalEmail={composeEmail}
          grantId={selectedGrantId}
          senderEmail={senderEmail}
          onSend={() => fetchEmails()}
        />
      </div>
    </ComposeContext.Provider>
  )
}

export default function InboxLayout({ children }: { children: ReactNode }) {
  return (
    <InboxProvider>
      <InboxLayoutContent>{children}</InboxLayoutContent>
    </InboxProvider>
  )
}
