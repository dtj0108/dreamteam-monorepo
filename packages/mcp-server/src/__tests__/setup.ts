/**
 * Global test setup for MCP server tools
 *
 * This file sets up mocks that are needed across all tool tests:
 * - Supabase client mock
 * - Workspace access validation mock
 * - Context resolution mock
 */

import { vi } from 'vitest'

// Set up default environment for workspace context
process.env.WORKSPACE_ID = 'test-workspace-id'
process.env.USER_ID = 'test-user-id'

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})
