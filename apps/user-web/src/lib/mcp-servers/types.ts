import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Context passed to MCP tool handlers
 * Contains user identity and database access
 */
export interface MCPToolContext {
  userId: string
  workspaceId?: string
  supabase: SupabaseClient
}

/**
 * Standard response format for MCP tools
 * Following Anthropic's best practices for actionable error messages
 */
export interface MCPToolResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  /** Hint for the agent on what to do next */
  hint?: string
}

/**
 * Response format options for token efficiency
 * Concise responses use ~1/3 the tokens of detailed responses
 */
export type ResponseFormat = "concise" | "detailed"

/**
 * Base parameters included in all MCP tools
 */
export interface BaseMCPParams {
  responseFormat?: ResponseFormat
}

/**
 * Helper to create actionable error messages
 */
export function formatActionableError(error: unknown): string {
  if (error instanceof Error) {
    // Make common errors more actionable
    const msg = error.message

    if (msg.includes("not found")) {
      return `${msg}. Try listing available items first or check the ID is correct.`
    }
    if (msg.includes("permission") || msg.includes("unauthorized")) {
      return `${msg}. You may not have access to this resource.`
    }
    if (msg.includes("required")) {
      return msg // Already actionable
    }
    if (msg.includes("invalid")) {
      return `${msg}. Check the format and try again.`
    }

    return msg
  }
  return String(error)
}

/**
 * Format a date for display
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount)
}

/**
 * Truncate text for concise responses
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + "..."
}
