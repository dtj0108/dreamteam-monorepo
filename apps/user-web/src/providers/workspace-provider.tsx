"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"

export type WorkspaceRole = "owner" | "admin" | "member"

export interface Workspace {
  id: string
  name: string
  slug: string
  avatarUrl: string | null
  ownerId: string
  role: WorkspaceRole
  memberCount?: number
}

interface WorkspaceContextType {
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  isLoading: boolean
  error: string | null
  switchWorkspace: (workspaceId: string) => Promise<void>
  refreshWorkspaces: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider")
  }
  return context
}

// Safe hook that returns null if not in provider (useful for optional workspace context)
export function useWorkspaceOptional() {
  return useContext(WorkspaceContext)
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { user, loading: userLoading, refreshUser } = useUser()
  const previousUserIdRef = useRef<string | null>(null)

  const fetchWorkspaces = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch("/api/workspaces")

      if (!response.ok) {
        if (response.status === 401) {
          setWorkspaces([])
          setCurrentWorkspace(null)
          return
        }
        throw new Error("Failed to fetch workspaces")
      }

      const data = await response.json()
      setWorkspaces(data.workspaces || [])

      // Set current workspace from cookie or default
      let selectedWorkspace: Workspace | null = null

      if (data.currentWorkspaceId && data.workspaces?.length > 0) {
        const current = data.workspaces.find(
          (w: Workspace) => w.id === data.currentWorkspaceId
        )
        if (current) {
          selectedWorkspace = current
        } else if (data.workspaces.length > 0) {
          // Fallback to first workspace if cookie workspace not found
          selectedWorkspace = data.workspaces[0]
        }
      } else if (data.workspaces?.length > 0) {
        selectedWorkspace = data.workspaces[0]
      }

      setCurrentWorkspace(selectedWorkspace)

      // Sync user context only when workspace selection differs.
      if ((selectedWorkspace?.id ?? null) !== (user?.workspaceId ?? null)) {
        await refreshUser()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch workspaces")
      setWorkspaces([])
      setCurrentWorkspace(null)
    } finally {
      setIsLoading(false)
    }
  }, [refreshUser, user?.workspaceId])

  useEffect(() => {
    if (userLoading) {
      return
    }

    const currentUserId = user?.id ?? null
    const previousUserId = previousUserIdRef.current
    previousUserIdRef.current = currentUserId

    if (!currentUserId) {
      setWorkspaces([])
      setCurrentWorkspace(null)
      setError(null)
      setIsLoading(false)
      return
    }

    // Initial auth hydration and account-switch scenarios.
    if (previousUserId !== currentUserId) {
      setIsLoading(true)
      void fetchWorkspaces()
    }
  }, [fetchWorkspaces, user?.id, userLoading])

  const switchWorkspace = useCallback(async (workspaceId: string) => {
    const workspace = workspaces.find((w) => w.id === workspaceId)
    if (!workspace) {
      throw new Error("Workspace not found")
    }

    try {
      // Set loading while switching to prevent stale data fetches
      setIsLoading(true)

      // Update cookie via API
      const response = await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      })

      if (!response.ok) {
        throw new Error("Failed to switch workspace")
      }

      setCurrentWorkspace(workspace)
      await refreshUser()
      setIsLoading(false)

      // Navigate to home on workspace switch
      router.push("/")
      router.refresh()
    } catch (err) {
      setIsLoading(false)
      throw err
    }
  }, [refreshUser, router, workspaces])

  const refreshWorkspaces = useCallback(async () => {
    setIsLoading(true)
    await fetchWorkspaces()
  }, [fetchWorkspaces])

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspace,
        workspaces,
        isLoading,
        error,
        switchWorkspace,
        refreshWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}
