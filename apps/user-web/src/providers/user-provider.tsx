"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import type { IndustryType } from "@/lib/types"

export type WorkspaceRole = "owner" | "admin" | "member"
export type ProductId = "finance" | "sales" | "team" | "projects" | "knowledge" | "agents"

export interface User {
  id: string
  email: string
  name: string
  phone: string
  companyName?: string | null
  industryType?: IndustryType
  workspaceId?: string | null
  workspaceName?: string | null
  workspaceRole?: WorkspaceRole | null
  allowedProducts?: ProductId[]
  pending2FA?: boolean
  phoneVerified?: boolean
}

interface UserContextType {
  user: User | null
  loading: boolean
  error: string | null
  refreshUser: () => void
}

const UserContext = createContext<UserContextType | null>(null)

export function useUserContext() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUserContext must be used within UserProvider")
  }
  return context
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me")

      if (!response.ok) {
        if (response.status === 401) {
          setUser(null)
          return
        }
        throw new Error("Failed to fetch user")
      }

      const data = await response.json()
      setUser(data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch user")
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const refreshUser = useCallback(() => {
    setLoading(true)
    fetchUser()
  }, [fetchUser])

  return (
    <UserContext.Provider value={{ user, loading, error, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}
