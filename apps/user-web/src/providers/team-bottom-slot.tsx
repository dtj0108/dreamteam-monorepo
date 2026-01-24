"use client"

import { createContext, useContext, useState, ReactNode, useCallback } from "react"

interface TeamBottomSlotContextType {
  bottomContent: ReactNode | null
  setBottomContent: (content: ReactNode | null) => void
}

const TeamBottomSlotContext = createContext<TeamBottomSlotContextType | null>(null)

export function useTeamBottomSlot() {
  const context = useContext(TeamBottomSlotContext)
  if (!context) {
    throw new Error("useTeamBottomSlot must be used within a TeamBottomSlotProvider")
  }
  return context
}

export function TeamBottomSlotProvider({ children }: { children: ReactNode }) {
  const [bottomContent, setBottomContent] = useState<ReactNode | null>(null)

  return (
    <TeamBottomSlotContext.Provider value={{ bottomContent, setBottomContent }}>
      {children}
    </TeamBottomSlotContext.Provider>
  )
}

// Hook for pages to register their bottom content
export function useRegisterBottomContent(content: ReactNode) {
  const { setBottomContent } = useTeamBottomSlot()
  
  // Use useEffect would cause issues, using callback pattern instead
  const register = useCallback(() => {
    setBottomContent(content)
    return () => setBottomContent(null)
  }, [content, setBottomContent])
  
  return register
}

