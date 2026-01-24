/**
 * Runtime context from agent-server environment variables.
 * Set when MCP server is spawned for a specific user/workspace session.
 */

/**
 * Get the workspace ID from environment (set by agent-server)
 */
export function getWorkspaceId(): string | undefined {
  return process.env.WORKSPACE_ID
}

/**
 * Get the authenticated user ID from environment (set by agent-server)
 */
export function getUserId(): string | undefined {
  return process.env.USER_ID
}

/**
 * Resolve workspace ID: explicit param > env var > error
 * This allows tools to work both with explicit workspace_id params
 * and with auto-injected context from the agent-server.
 */
export function resolveWorkspaceId(input: { workspace_id?: string }): string {
  const workspaceId = input.workspace_id || getWorkspaceId()
  if (!workspaceId) {
    throw new Error(
      'workspace_id required - pass explicitly or ensure WORKSPACE_ID env var is set'
    )
  }
  return workspaceId
}

/**
 * Alias for getUserId - clearer name for auth contexts
 */
export function getAuthenticatedUserId(): string | undefined {
  return getUserId()
}
