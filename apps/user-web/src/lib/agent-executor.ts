import { generateText, stepCountIs } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { buildAgentTools } from "./agent/tool-registry"
import type { ToolContext } from "./agent/types"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface ExecuteParams {
  taskPrompt: string
  systemPrompt: string
  tools: string[]
  workspaceId: string
  supabase: SupabaseClient
}

export interface ToolCallRecord {
  toolName: string
  args: unknown
  result: unknown
}

export interface ExecuteResult {
  text: string
  toolCalls: ToolCallRecord[]
  usage: { promptTokens: number; completionTokens: number }
  durationMs: number
}

/**
 * Execute an agent task using generateText (non-streaming).
 * Used for scheduled/background tasks where streaming isn't needed.
 */
export async function executeAgentTask(params: ExecuteParams): Promise<ExecuteResult> {
  const startTime = Date.now()

  const context: ToolContext = {
    userId: "system",
    workspaceId: params.workspaceId,
    supabase: params.supabase,
  }

  const tools = buildAgentTools(params.tools, context)

  const result = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: params.systemPrompt,
    messages: [{ role: "user", content: params.taskPrompt }],
    tools,
    stopWhen: stepCountIs(10),
  })

  // Extract tool calls from all steps
  const toolCalls: ToolCallRecord[] = []
  for (const step of result.steps) {
    if (step.toolCalls) {
      for (const tc of step.toolCalls) {
        // Use type assertion since the AI SDK has complex union types
        const toolCall = tc as { toolName: string; args?: unknown }
        toolCalls.push({
          toolName: toolCall.toolName,
          args: toolCall.args ?? {},
          result: undefined, // Results are in toolResults, not on the call itself
        })
      }
    }
    // Match tool results to their calls
    if (step.toolResults) {
      for (const tr of step.toolResults) {
        const resultRecord = tr as { toolName: string; result?: unknown }
        const matchingCall = toolCalls.find(
          (tc) => tc.toolName === resultRecord.toolName && tc.result === undefined
        )
        if (matchingCall) {
          matchingCall.result = resultRecord.result
        }
      }
    }
  }

  // Extract usage with safe defaults
  const usage = result.usage as { promptTokens?: number; completionTokens?: number } | undefined

  return {
    text: result.text,
    toolCalls,
    usage: {
      promptTokens: usage?.promptTokens ?? 0,
      completionTokens: usage?.completionTokens ?? 0,
    },
    durationMs: Date.now() - startTime,
  }
}
