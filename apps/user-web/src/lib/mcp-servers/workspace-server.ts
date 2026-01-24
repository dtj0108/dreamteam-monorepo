/**
 * Workspace-Scoped MCP Server Factory
 *
 * Creates an MCP server instance scoped to a specific workspace.
 * All tools are workspace-isolated, ensuring data security.
 */

import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { MCPToolContext } from "./types"

// Import tool definitions directly to avoid circular dependency with index.ts
import { financeToolDefinitions, type FinanceToolName } from "./finance-tools"
import { businessToolDefinitions, type BusinessToolName } from "./business-tools"
import { knowledgeToolDefinitions, type KnowledgeToolName } from "./knowledge-tools"
import {
  messagingToolDefinition,
  salesToolDefinition,
  analyticsToolDefinition,
  type NewToolName,
} from "./tools"

// Local type to avoid circular import
type AllToolName = FinanceToolName | BusinessToolName | KnowledgeToolName | NewToolName

// Build tool definitions locally to avoid circular import
const allToolDefinitions = {
  ...financeToolDefinitions,
  ...businessToolDefinitions,
  ...knowledgeToolDefinitions,
  manageMessaging: messagingToolDefinition,
  manageSales: salesToolDefinition,
  queryAnalytics: analyticsToolDefinition,
} as const

export interface WorkspaceServerConfig {
  workspaceId: string
  userId: string
  enabledTools: AllToolName[]
  supabase: SupabaseClient
  agentId?: string
}

/**
 * Create a workspace-scoped MCP server
 *
 * @param config - Server configuration
 * @returns MCP server instance with tools scoped to the workspace
 */
export function createWorkspaceServer(config: WorkspaceServerConfig) {
  const { workspaceId, userId, enabledTools, supabase, agentId } = config

  // Create tool context scoped to this workspace
  const context: MCPToolContext = {
    userId,
    workspaceId,
    supabase,
  }

  // Add agentId to context if provided (for memory scoping)
  if (agentId) {
    (context as any).agentId = agentId
  }

  // Build tools array from enabled tool names
  const tools = enabledTools
    .map((toolName) => {
      const toolDef = allToolDefinitions[toolName]
      if (!toolDef) return null

      // Get the schema shape for the SDK tool function
      const schemaShape = (toolDef.schema as any)._def?.shape?.() || {}

      return tool(
        toolName,
        toolDef.description,
        schemaShape,
        async (args: Record<string, unknown>) => {
          try {
            // Validate input
            const parsed = toolDef.schema.safeParse(args)
            if (!parsed.success) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: JSON.stringify({
                      success: false,
                      error: `Invalid input: ${parsed.error.message}`,
                    }),
                  },
                ],
                isError: true,
              }
            }

            // Execute the tool with workspace context
            const result = await toolDef.execute(parsed.data as never, context)

            return {
              content: [{ type: "text" as const, text: JSON.stringify(result) }],
            }
          } catch (error) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    success: false,
                    error: error instanceof Error ? error.message : "Tool execution failed",
                  }),
                },
              ],
              isError: true,
            }
          }
        }
      )
    })
    .filter(Boolean)

  // Create the MCP server with workspace-scoped name
  return createSdkMcpServer({
    name: `workspace-${workspaceId}`,
    version: "1.0.0",
    tools: tools as any[],
  })
}

/**
 * Build the allowed tools list for a workspace server
 *
 * @param workspaceId - The workspace ID
 * @param toolNames - Array of tool names enabled for this workspace
 * @returns Array of tool identifiers in format "mcp__workspace-{id}__{tool}"
 */
export function buildWorkspaceAllowedTools(
  workspaceId: string,
  toolNames: AllToolName[]
): string[] {
  return toolNames.map((name) => `mcp__workspace-${workspaceId}__${name}`)
}

export default {
  createWorkspaceServer,
  buildWorkspaceAllowedTools,
}
