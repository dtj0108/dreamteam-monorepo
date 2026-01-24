/**
 * Tools Index
 *
 * Aggregates all MCP tool definitions for the workspace server.
 */

export { messagingToolDefinition, messagingSchema, type MessagingToolName } from "./messaging"
export { salesToolDefinition, salesSchema, type SalesToolName } from "./sales"
export { analyticsToolDefinition, analyticsSchema, type AnalyticsToolName } from "./analytics"

// Combined new tool types
export type NewToolName = "manageMessaging" | "manageSales" | "queryAnalytics"
