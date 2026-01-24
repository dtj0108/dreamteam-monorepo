import { z } from "zod"
import type { MCPToolContext, MCPToolResponse, ResponseFormat } from "../types"
import { formatActionableError } from "../types"

/**
 * Adapter to convert existing tool execute functions to MCP tool format.
 *
 * This allows us to reuse the existing tool logic while adapting to the
 * Claude Agent SDK's MCP tool interface.
 */
export interface ToolAdapter<TInput, TOutput> {
  name: string
  description: string
  schema: z.ZodType<TInput>
  execute: (input: TInput, context: MCPToolContext) => Promise<TOutput>
  /** Optional function to format output for concise responses */
  formatConcise?: (output: TOutput) => unknown
}

/**
 * Create an MCP-compatible tool handler from an adapter
 */
export function createMCPHandler<TInput extends { responseFormat?: ResponseFormat }, TOutput>(
  adapter: ToolAdapter<TInput, TOutput>,
  context: MCPToolContext
) {
  return async (args: TInput): Promise<MCPToolResponse<unknown>> => {
    try {
      // Validate input
      const validatedInput = adapter.schema.parse(args)

      // Execute the tool
      const result = await adapter.execute(validatedInput, context)

      // Format response based on requested format
      const responseFormat = validatedInput.responseFormat || "concise"
      const data =
        responseFormat === "concise" && adapter.formatConcise
          ? adapter.formatConcise(result)
          : result

      return {
        success: true,
        data,
      }
    } catch (error) {
      return {
        success: false,
        error: formatActionableError(error),
      }
    }
  }
}

/**
 * Base schema additions for all tools
 */
export const baseToolSchema = {
  responseFormat: z
    .enum(["concise", "detailed"])
    .optional()
    .default("concise")
    .describe("Response format: 'concise' for shorter responses (recommended), 'detailed' for full data"),
}

/**
 * Helper to merge base schema with tool-specific schema
 */
export function withBaseSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object({
    ...baseToolSchema,
    ...shape,
  })
}

/**
 * Concise formatters for common result types
 */
export const conciseFormatters = {
  /**
   * Format a list of items with count
   */
  list: <T extends { id: string }>(
    items: T[],
    itemFormatter: (item: T) => string,
    noun: string
  ): string => {
    if (items.length === 0) {
      return `No ${noun} found.`
    }
    const formatted = items.slice(0, 5).map(itemFormatter).join("\n")
    const more = items.length > 5 ? `\n... and ${items.length - 5} more` : ""
    return `Found ${items.length} ${noun}:\n${formatted}${more}`
  },

  /**
   * Format a summary object
   */
  summary: (data: Record<string, number | string>): string => {
    return Object.entries(data)
      .map(([key, value]) => {
        const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
        return `${label}: ${typeof value === "number" ? value.toLocaleString() : value}`
      })
      .join(" | ")
  },

  /**
   * Format currency amount
   */
  currency: (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount)
  },

  /**
   * Format percentage
   */
  percent: (value: number): string => {
    return `${Math.round(value)}%`
  },
}
