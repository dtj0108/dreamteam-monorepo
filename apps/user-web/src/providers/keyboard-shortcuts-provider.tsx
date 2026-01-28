"use client"

import { createContext, useContext, useState } from "react"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"

interface KeyboardShortcutsContextType {
  createLeadOpen: boolean
  setCreateLeadOpen: (open: boolean) => void
  quickSearchOpen: boolean
  setQuickSearchOpen: (open: boolean) => void
  emailDialogOpen: boolean
  setEmailDialogOpen: (open: boolean) => void
  activityFormOpen: boolean
  setActivityFormOpen: (open: boolean) => void
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | null>(null)

export function useKeyboardShortcutsContext() {
  const context = useContext(KeyboardShortcutsContext)
  if (!context) throw new Error("Must be within KeyboardShortcutsProvider")
  return context
}

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [createLeadOpen, setCreateLeadOpen] = useState(false)
  const [quickSearchOpen, setQuickSearchOpen] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [activityFormOpen, setActivityFormOpen] = useState(false)

  useKeyboardShortcuts([
    { key: "c", description: "Create lead", callback: () => setCreateLeadOpen(true) },
    { key: "k", meta: true, description: "Quick search", callback: () => setQuickSearchOpen(true) },
    { key: "e", description: "Quick email", callback: () => setEmailDialogOpen(true) },
    { key: "a", description: "Quick activity", callback: () => setActivityFormOpen(true) }
  ])

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        createLeadOpen, setCreateLeadOpen,
        quickSearchOpen, setQuickSearchOpen,
        emailDialogOpen, setEmailDialogOpen,
        activityFormOpen, setActivityFormOpen
      }}
    >
      {children}
    </KeyboardShortcutsContext.Provider>
  )
}
