import { z } from 'zod'

// Common schemas for tool parameters
export const workspaceIdSchema = z.object({
  workspace_id: z
    .string()
    .uuid()
    .optional()
    .describe('Workspace ID (auto-filled from context if omitted)'),
})

export const paginationSchema = z.object({
  limit: z.number().int().positive().max(100).optional().describe('Maximum number of results to return'),
  offset: z.number().int().nonnegative().optional().describe('Number of results to skip'),
})

export const dateRangeSchema = z.object({
  start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
  end_date: z.string().optional().describe('End date (YYYY-MM-DD)'),
})

// Account types
export const accountTypeSchema = z.enum([
  'checking',
  'savings',
  'credit',
  'cash',
  'investment',
  'loan',
  'other',
])

// Category types
export const categoryTypeSchema = z.enum(['income', 'expense'])

// Budget period types
export const budgetPeriodSchema = z.enum(['weekly', 'biweekly', 'monthly', 'yearly'])

// Subscription frequency types
export const frequencySchema = z.enum([
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
])

// Tool result type - matches MCP SDK CallToolResult
export interface ToolResult {
  content: Array<{
    type: 'text'
    text: string
  }>
  isError?: boolean
  [key: string]: unknown // Allow additional properties for MCP compatibility
}

// Helper to create successful tool result
export function success(data: unknown): ToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  }
}

// Error categories help the agent make smarter recovery decisions
export type ErrorCategory =
  | 'access_denied'      // User doesn't have permission
  | 'not_found'          // Resource doesn't exist
  | 'validation'         // Invalid input parameters
  | 'database'           // Database operation failed
  | 'external_service'   // Third-party API failed
  | 'unknown'            // Unexpected error

// Helper to create error tool result with optional category for smarter agent recovery
export function error(message: string, category: ErrorCategory = 'unknown'): ToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: message,
          category,
          recoverable: category !== 'access_denied', // Most errors are recoverable
        }, null, 2),
      },
    ],
    isError: true,
  }
}
