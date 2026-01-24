/**
 * Tool Testing Handler
 *
 * Tests individual tools by executing them via the MCP server.
 * This allows the admin panel to verify tools work correctly
 * before deploying them to agents.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import path from "path"
import { fileURLToPath } from "url"

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface ToolTestRequest {
  toolName: string
  toolInput: Record<string, unknown>
  workspaceId: string
}

export interface ToolTestResult {
  toolName: string
  success: boolean
  result?: unknown
  error?: string
  latencyMs: number
}

/**
 * Test a single tool by executing it via the MCP server
 */
export async function testTool(req: ToolTestRequest): Promise<ToolTestResult> {
  const startTime = Date.now()

  // Path to MCP server - adjusted for monorepo structure
  const mcpServerPath = path.resolve(
    __dirname,
    "../../../packages/mcp-server/dist/index.js"
  )

  // Create stdio transport to spawn MCP server
  const transport = new StdioClientTransport({
    command: "node",
    args: [mcpServerPath],
    env: {
      ...process.env,
      WORKSPACE_ID: req.workspaceId,
      // Pass through required env vars
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    },
  })

  const client = new Client(
    { name: "tool-tester", version: "1.0.0" },
    { capabilities: {} }
  )

  try {
    await client.connect(transport)

    // Call the tool with workspace_id injected into the input
    // This ensures the MCP server's resolveWorkspaceId() always has workspace context,
    // regardless of whether env vars are properly inherited by the subprocess
    const enrichedInput = {
      workspace_id: req.workspaceId,
      ...req.toolInput,
    }

    const result = await client.callTool({
      name: req.toolName,
      arguments: enrichedInput,
    })

    const latencyMs = Date.now() - startTime

    // Check if the result indicates an error
    const isError = result.isError === true

    return {
      toolName: req.toolName,
      success: !isError,
      result: result.content,
      error: isError ? extractErrorMessage(result.content) : undefined,
      latencyMs,
    }
  } catch (err) {
    const latencyMs = Date.now() - startTime
    const errorMessage = err instanceof Error ? err.message : "Unknown error"

    return {
      toolName: req.toolName,
      success: false,
      error: errorMessage,
      latencyMs,
    }
  } finally {
    try {
      await client.close()
    } catch {
      // Ignore close errors
    }
  }
}

/**
 * Extract error message from MCP result content
 */
function extractErrorMessage(content: unknown): string {
  if (Array.isArray(content)) {
    const textContent = content.find(
      (c): c is { type: "text"; text: string } => c?.type === "text"
    )
    if (textContent) {
      return textContent.text
    }
  }
  if (typeof content === "string") {
    return content
  }
  return "Tool execution failed"
}

/**
 * Test multiple tools sequentially
 */
export async function testTools(
  requests: ToolTestRequest[]
): Promise<ToolTestResult[]> {
  const results: ToolTestResult[] = []

  for (const req of requests) {
    const result = await testTool(req)
    results.push(result)

    // Brief delay between tests to avoid overwhelming the system
    if (requests.indexOf(req) < requests.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  return results
}
