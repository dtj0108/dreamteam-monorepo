#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { initializeSupabase } from './auth.js'
import { financeTools } from './tools/finance/index.js'
import { crmTools } from './tools/crm/index.js'
import { teamTools } from './tools/team/index.js'
import { projectsTools } from './tools/projects/index.js'
import { knowledgeTools } from './tools/knowledge/index.js'
import { communicationsTools } from './tools/communications/index.js'
import { goalsTools } from './tools/goals/index.js'
import { agentsTools } from './tools/agents/index.js'

// Server metadata
const SERVER_NAME = 'financebro-mcp'
const SERVER_VERSION = '0.0.3'

// All available tools (master registry)
const allTools = {
  ...financeTools,
  ...crmTools,
  ...teamTools,
  ...projectsTools,
  ...knowledgeTools,
  ...communicationsTools,
  ...goalsTools,
  ...agentsTools,
}

// Filter tools based on ENABLED_TOOLS environment variable
// This dramatically reduces token consumption by only advertising assigned tools
function getEnabledTools(): Record<string, typeof allTools[keyof typeof allTools]> {
  const enabledToolsEnv = process.env.ENABLED_TOOLS

  // If no filter specified, return all tools (backwards compatibility)
  if (!enabledToolsEnv) {
    return allTools
  }

  // Parse comma-separated list of tool names
  const enabledToolNames = enabledToolsEnv.split(',').map(t => t.trim()).filter(Boolean)

  // If empty after parsing, return all tools
  if (enabledToolNames.length === 0) {
    return allTools
  }

  // Filter to only include enabled tools
  const filtered: Record<string, typeof allTools[keyof typeof allTools]> = {}
  for (const toolName of enabledToolNames) {
    if (toolName in allTools) {
      filtered[toolName] = allTools[toolName as keyof typeof allTools]
    }
  }

  return filtered
}

// Convert our tool definitions to MCP format
// Uses filtered tools based on ENABLED_TOOLS env var
function convertToMCPTools() {
  const enabledTools = getEnabledTools()
  return Object.entries(enabledTools).map(([name, tool]) => ({
    name,
    description: tool.description,
    inputSchema: {
      type: 'object' as const,
      properties: tool.inputSchema.shape
        ? Object.fromEntries(
            Object.entries(tool.inputSchema.shape).map(([key, value]) => [
              key,
              {
                type: getZodType(value as z.ZodTypeAny),
                description: (value as z.ZodTypeAny).description,
              },
            ])
          )
        : {},
      required: tool.inputSchema.shape
        ? Object.entries(tool.inputSchema.shape)
            .filter(([, value]) => !(value as z.ZodTypeAny).isOptional())
            .map(([key]) => key)
        : [],
    },
  }))
}

// Helper to extract Zod type as JSON Schema type
function getZodType(zodType: z.ZodTypeAny): string {
  if (zodType instanceof z.ZodString) return 'string'
  if (zodType instanceof z.ZodNumber) return 'number'
  if (zodType instanceof z.ZodBoolean) return 'boolean'
  if (zodType instanceof z.ZodArray) return 'array'
  if (zodType instanceof z.ZodObject) return 'object'
  if (zodType instanceof z.ZodOptional) return getZodType(zodType._def.innerType)
  if (zodType instanceof z.ZodDefault) return getZodType(zodType._def.innerType)
  if (zodType instanceof z.ZodEnum) return 'string'
  return 'string'
}

async function main() {
  // Initialize Supabase from environment
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required')
    console.error('Set these in your MCP server configuration or .env file')
    process.exit(1)
  }

  initializeSupabase(supabaseUrl, supabaseKey)

  // Create MCP server
  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: convertToMCPTools(),
    }
  })

  // Handle tool call request
  // Uses filtered tools to ensure only enabled tools can be called
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    const enabledTools = getEnabledTools()
    const tool = enabledTools[name]
    if (!tool) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ error: `Unknown tool: ${name}` }),
          },
        ],
        isError: true,
      }
    }

    try {
      // Validate input
      const validatedArgs = tool.inputSchema.parse(args)

      // Call the handler
      const result = await tool.handler(validatedArgs as never)
      return result
    } catch (err) {
      if (err instanceof z.ZodError) {
        // Return graceful success with validation guidance instead of error
        const validationIssues = err.errors.map((e) => {
          const issue: Record<string, unknown> = {
            field: e.path.join('.'),
            message: e.message,
          }
          
          // Add helpful context for enum errors
          if (e.code === 'invalid_enum_value' && 'options' in e) {
            issue.valid_options = e.options
            issue.received = 'received' in e ? e.received : undefined
          }
          
          // Add context for array size errors
          if (e.code === 'too_small' && 'minimum' in e) {
            issue.minimum_required = e.minimum
          }
          
          return issue
        })

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                message: 'Invalid input provided. Please check the validation details below.',
                valid: false,
                validation_issues: validationIssues,
              }),
            },
          ],
          isError: false, // Return as success with validation guidance
        }
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: err instanceof Error ? err.message : 'Unknown error',
            }),
          },
        ],
        isError: true,
      }
    }
  })

  // Start the server
  const transport = new StdioServerTransport()
  await server.connect(transport)

  // Log startup with tool count info (filtered vs total)
  const enabledTools = getEnabledTools()
  const enabledCount = Object.keys(enabledTools).length
  const totalCount = Object.keys(allTools).length
  console.error(`${SERVER_NAME} v${SERVER_VERSION} started`)
  if (process.env.ENABLED_TOOLS) {
    console.error(`Loaded ${enabledCount} of ${totalCount} tools (filtered by ENABLED_TOOLS)`)
  } else {
    console.error(`Loaded ${totalCount} tools (no filter applied)`)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
