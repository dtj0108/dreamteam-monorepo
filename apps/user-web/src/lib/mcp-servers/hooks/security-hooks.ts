/**
 * Security Hooks for Claude Agent SDK
 *
 * Provides pre-tool and post-tool hooks for security, auditing, and rate limiting.
 */

import type {
  HookCallbackMatcher,
  HookInput,
  HookJSONOutput,
} from "@anthropic-ai/claude-agent-sdk"

// Tool execution context stored during the session
interface ToolExecutionContext {
  userId: string
  workspaceId: string
  sessionId: string
  executionCount: Record<string, number>
  lastExecution: Record<string, number>
}

// Rate limits per tool (requests per minute)
const TOOL_RATE_LIMITS: Record<string, number> = {
  manageTransactions: 30,
  manageBudgets: 20,
  manageAccounts: 20,
  manageGoals: 20,
  exportData: 5,
  manageCRM: 30,
  manageProjects: 30,
  manageKnowledge: 20,
  manageMemory: 30,
  searchWeb: 10,
}

// Default rate limit
const DEFAULT_RATE_LIMIT = 20

/**
 * Validate user has access to the tool
 * This is a basic check - actual authorization happens in tool execution
 */
export async function validateUserAccess(
  input: HookInput,
  _toolUseID: string | undefined,
  _options: { signal: AbortSignal }
): Promise<HookJSONOutput> {
  // Only handle PreToolUse events
  if (input.hook_event_name !== "PreToolUse") {
    return { continue: true }
  }

  const toolName = input.tool_name

  // Extract tool name from MCP format (mcp__server__tool)
  const mcpToolName = toolName.split("__").pop() || toolName

  // Log tool access attempt
  console.log(`[Security] Tool access: ${mcpToolName}`, {
    sessionId: input.session_id,
    toolInput: summarizeToolInput(input.tool_input),
  })

  // Allow all tools to proceed - actual authorization is in tool execution
  return { continue: true }
}

/**
 * Check rate limits for tool usage
 */
export function createRateLimitCheck(context: ToolExecutionContext) {
  return async function rateLimitCheck(
    input: HookInput,
    _toolUseID: string | undefined,
    _options: { signal: AbortSignal }
  ): Promise<HookJSONOutput> {
    // Only handle PreToolUse events
    if (input.hook_event_name !== "PreToolUse") {
      return { continue: true }
    }

    const toolName = input.tool_name.split("__").pop() || input.tool_name
    const now = Date.now()
    const oneMinuteAgo = now - 60000

    // Initialize tracking if needed
    if (!context.executionCount[toolName]) {
      context.executionCount[toolName] = 0
      context.lastExecution[toolName] = 0
    }

    // Reset count if more than a minute since last execution
    if (context.lastExecution[toolName] < oneMinuteAgo) {
      context.executionCount[toolName] = 0
    }

    // Get rate limit for this tool
    const limit = TOOL_RATE_LIMITS[toolName] || DEFAULT_RATE_LIMIT

    // Check if over limit
    if (context.executionCount[toolName] >= limit) {
      console.warn(`[RateLimit] Tool ${toolName} rate limited`, {
        userId: context.userId,
        count: context.executionCount[toolName],
        limit,
      })

      return {
        continue: false,
        decision: "block",
        reason: `Rate limit exceeded for ${toolName}. Please wait a moment before trying again.`,
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: "Rate limit exceeded",
        },
      }
    }

    // Increment counter
    context.executionCount[toolName]++
    context.lastExecution[toolName] = now

    return { continue: true }
  }
}

/**
 * Audit tool usage after execution
 */
export async function auditToolUsage(
  input: HookInput,
  _toolUseID: string | undefined,
  _options: { signal: AbortSignal }
): Promise<HookJSONOutput> {
  // Only handle PostToolUse events
  if (input.hook_event_name !== "PostToolUse") {
    return { continue: true }
  }

  const toolName = input.tool_name.split("__").pop() || input.tool_name

  // Log successful tool execution
  console.log(`[Audit] Tool executed: ${toolName}`, {
    sessionId: input.session_id,
    success: !isErrorResponse(input.tool_response),
    inputSummary: summarizeToolInput(input.tool_input),
    responseSummary: summarizeToolResponse(input.tool_response),
  })

  return { continue: true }
}

/**
 * Create security hooks for a session
 */
export function createSecurityHooks(context: {
  userId: string
  workspaceId: string
  sessionId: string
}): {
  PreToolUse: HookCallbackMatcher[]
  PostToolUse: HookCallbackMatcher[]
} {
  const executionContext: ToolExecutionContext = {
    ...context,
    executionCount: {},
    lastExecution: {},
  }

  return {
    PreToolUse: [
      {
        matcher: ".*",
        hooks: [validateUserAccess, createRateLimitCheck(executionContext)],
        timeout: 5, // 5 second timeout
      },
    ],
    PostToolUse: [
      {
        hooks: [auditToolUsage],
        timeout: 5,
      },
    ],
  }
}

// Helper functions

function summarizeToolInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object") {
    return { raw: input }
  }

  const obj = input as Record<string, unknown>
  const summary: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string" && value.length > 100) {
      summary[key] = `${value.slice(0, 100)}... (${value.length} chars)`
    } else if (Array.isArray(value)) {
      summary[key] = `[Array: ${value.length} items]`
    } else {
      summary[key] = value
    }
  }

  return summary
}

function summarizeToolResponse(response: unknown): Record<string, unknown> {
  if (!response || typeof response !== "object") {
    return { raw: response }
  }

  const obj = response as Record<string, unknown>

  // Check for success/error pattern
  if ("success" in obj) {
    return {
      success: obj.success,
      hasData: "data" in obj,
      error: obj.error,
    }
  }

  return { type: typeof response }
}

function isErrorResponse(response: unknown): boolean {
  if (!response || typeof response !== "object") {
    return false
  }

  const obj = response as Record<string, unknown>
  return obj.success === false || "error" in obj
}

export default {
  createSecurityHooks,
  validateUserAccess,
  auditToolUsage,
}
