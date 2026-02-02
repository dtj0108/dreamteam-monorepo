/**
 * MCP Client for Vercel AI SDK
 *
 * Connects to our MCP server via stdio and provides tools
 * in Vercel AI SDK format for use with non-Anthropic providers (xAI, etc.)
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { tool } from "ai"
import { z } from "zod"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface MCPClientConfig {
  workspaceId: string
  userId: string
  enabledTools: string[]
}

export interface MCPClientInstance {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: Record<string, any>
  close: () => Promise<void>
}

/**
 * Convert JSON Schema type to Zod schema
 * This is a simplified conversion - handles common cases
 */
function jsonSchemaToZod(schema: Record<string, unknown>): z.ZodTypeAny {
  const type = schema.type as string

  switch (type) {
    case "string":
      return z.string().describe((schema.description as string) || "")
    case "number":
      return z.number().describe((schema.description as string) || "")
    case "integer":
      return z.number().int().describe((schema.description as string) || "")
    case "boolean":
      return z.boolean().describe((schema.description as string) || "")
    case "array":
      const items = schema.items as Record<string, unknown> | undefined
      if (items) {
        return z.array(jsonSchemaToZod(items)).describe((schema.description as string) || "")
      }
      return z.array(z.unknown()).describe((schema.description as string) || "")
    case "object":
      const properties = schema.properties as Record<string, Record<string, unknown>> | undefined
      const required = (schema.required as string[]) || []

      if (properties) {
        const shape: Record<string, z.ZodTypeAny> = {}
        for (const [key, prop] of Object.entries(properties)) {
          let zodProp = jsonSchemaToZod(prop)
          if (!required.includes(key)) {
            zodProp = zodProp.optional()
          }
          shape[key] = zodProp
        }
        return z.object(shape).describe((schema.description as string) || "")
      }
      return z.record(z.string(), z.unknown()).describe((schema.description as string) || "")
    default:
      return z.unknown()
  }
}

/**
 * Create an MCP client that connects to our MCP server
 * and provides tools in Vercel AI SDK format
 */
export async function createMCPClient(config: MCPClientConfig): Promise<MCPClientInstance> {
  // Path to MCP server
  const mcpServerPath = path.resolve(__dirname, "../../../../packages/mcp-server/dist/index.js")

  // Create stdio transport to spawn and connect to MCP server
  const transport = new StdioClientTransport({
    command: "node",
    args: [mcpServerPath],
    env: {
      ...process.env,
      SUPABASE_URL: process.env.SUPABASE_URL || "",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      WORKSPACE_ID: config.workspaceId,
      USER_ID: config.userId,
      ENABLED_TOOLS: config.enabledTools.join(","),
    },
  })

  // Create MCP client
  const client = new Client(
    {
      name: "agent-server-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  )

  // Connect to server
  await client.connect(transport)

  // List available tools from server
  const toolsResponse = await client.listTools()
  const mcpTools = toolsResponse.tools

  console.log(`[MCP Client] Connected, found ${mcpTools.length} tools`)

  // Convert MCP tools to Vercel AI SDK format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiTools: Record<string, any> = {}

  for (const mcpTool of mcpTools) {
    const toolName = mcpTool.name
    const inputSchema = mcpTool.inputSchema as Record<string, unknown>

    // Convert JSON Schema to Zod
    const zodSchema = jsonSchemaToZod(inputSchema) as z.ZodObject<Record<string, z.ZodTypeAny>>

    // Create Vercel AI SDK tool (AI SDK 6 syntax)
    aiTools[toolName] = tool({
      description: mcpTool.description || "",
      inputSchema: zodSchema,
      execute: async (args: z.infer<typeof zodSchema>) => {
        try {
          // Call the MCP tool
          const result = await client.callTool({
            name: toolName,
            arguments: args as Record<string, unknown>,
          })

          // Extract text content from MCP response
          const content = result.content as Array<{ type: string; text?: string }>
          const textContent = content
            .filter((c) => c.type === "text" && c.text)
            .map((c) => c.text)
            .join("\n")

          // Try to parse as JSON, otherwise return as string
          try {
            return JSON.parse(textContent)
          } catch {
            return textContent
          }
        } catch (error) {
          console.error(`[MCP Client] Tool ${toolName} error:`, error)
          return {
            error: error instanceof Error ? error.message : "Tool execution failed",
          }
        }
      },
    })
  }

  return {
    tools: aiTools,
    close: async () => {
      await client.close()
    },
  }
}
