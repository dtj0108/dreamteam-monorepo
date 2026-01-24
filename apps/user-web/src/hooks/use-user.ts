"use client"

import { useUserContext, type User, type WorkspaceRole, type ProductId } from "@/providers/user-provider"

// Re-export types for backwards compatibility
export type { User, WorkspaceRole, ProductId }

export function useUser() {
  return useUserContext()
}
