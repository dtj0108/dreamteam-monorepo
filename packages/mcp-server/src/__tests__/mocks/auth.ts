/**
 * Mock helpers for authentication and workspace access
 *
 * These helpers allow tests to control workspace access validation
 * without hitting the actual database.
 */

import { vi } from 'vitest'

// Types for workspace member access
interface WorkspaceMember {
  role: string
  profile_id: string
}

/**
 * Mock validateWorkspaceAccess to return a valid member
 */
export function mockValidAccess(
  validateWorkspaceAccess: ReturnType<typeof vi.fn>,
  role: string = 'admin'
): void {
  validateWorkspaceAccess.mockResolvedValue({
    role,
    profile_id: 'test-user-id',
  } satisfies WorkspaceMember)
}

/**
 * Mock validateWorkspaceAccess to deny access
 */
export function mockDeniedAccess(
  validateWorkspaceAccess: ReturnType<typeof vi.fn>
): void {
  validateWorkspaceAccess.mockResolvedValue(null)
}

/**
 * Mock validateWorkspaceAccess for specific workspace IDs
 */
export function mockAccessForWorkspaces(
  validateWorkspaceAccess: ReturnType<typeof vi.fn>,
  accessMap: Record<string, WorkspaceMember | null>
): void {
  validateWorkspaceAccess.mockImplementation(async (workspaceId: string) => {
    return accessMap[workspaceId] ?? null
  })
}

/**
 * Default workspace member for tests
 */
export const defaultMember: WorkspaceMember = {
  role: 'admin',
  profile_id: 'test-user-id',
}

/**
 * Workspace member with owner role
 */
export const ownerMember: WorkspaceMember = {
  role: 'owner',
  profile_id: 'test-user-id',
}

/**
 * Workspace member with basic member role
 */
export const basicMember: WorkspaceMember = {
  role: 'member',
  profile_id: 'test-user-id',
}
