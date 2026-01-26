import { generateText, stepCountIs, type LanguageModel } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { xai } from "@ai-sdk/xai"
import { buildAgentTools } from "./agent/tool-registry"
import type { ToolContext } from "./agent/types"
import type { SupabaseClient } from "@supabase/supabase-js"
import { buildFullSystemPrompt, type StylePresets } from "./style-instructions"

export type AIProvider = "anthropic" | "xai" | "openai" | "google"

export interface ExecuteParams {
  taskPrompt: string
  systemPrompt: string
  tools: string[]
  workspaceId: string
  supabase: SupabaseClient
  /** AI provider to use (default: anthropic for backward compatibility) */
  provider?: AIProvider
  /** Model name/ID to use */
  model?: string
  /** Style presets for personality customization */
  stylePresets?: Partial<StylePresets> | null
  /** Custom instructions from agent configuration */
  customInstructions?: string | null
}

/**
 * Get the language model instance for the given provider and model.
 * Supports Anthropic and xAI (Grok) providers.
 */
function getModel(provider: AIProvider, model: string): LanguageModel {
  // Model aliases for convenience
  const modelAliases: Record<string, Record<string, string>> = {
    anthropic: {
      sonnet: "claude-sonnet-4-20250514",
      opus: "claude-opus-4-20250514",
      haiku: "claude-haiku-4-20250514",
    },
    xai: {
      grok: "grok-4-fast",
      "grok-2": "grok-2-1212",
      "grok-3": "grok-3",
      "grok-3-fast": "grok-3-fast",
      "grok-4": "grok-4",
      "grok-4-fast": "grok-4-fast",
      "grok-4.1": "grok-4-fast", // Map grok-4.1 to grok-4-fast
    },
  }

  // Resolve model alias if exists
  const resolvedModel = modelAliases[provider]?.[model] || model

  switch (provider) {
    case "xai":
      return xai(resolvedModel)
    case "anthropic":
    default:
      return anthropic(resolvedModel)
  }
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
  const provider = params.provider || "anthropic"
  const model = params.model || (provider === "xai" ? "grok-4-fast" : "claude-sonnet-4-20250514")

  // #region agent log
  const apiKeyEnvVar = provider === "xai" ? "XAI_API_KEY" : "ANTHROPIC_API_KEY"
  fetch('http://127.0.0.1:7251/ingest/ad122d98-a0b2-4935-b292-9bab921eccb9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'agent-executor.ts:executeAgentTask:entry',message:'Checking API key presence',data:{provider,model,apiKeyEnvVar,hasApiKey:!!process.env[apiKeyEnvVar],keyLength:process.env[apiKeyEnvVar]?.length||0,nodeEnv:process.env.NODE_ENV},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A-provider-check'})}).catch(()=>{});
  // #endregion
  const startTime = Date.now()

  const context: ToolContext = {
    userId: "system",
    workspaceId: params.workspaceId,
    supabase: params.supabase,
  }

  const tools = buildAgentTools(params.tools, context)

  // Build full system prompt with style and custom instructions
  const fullSystemPrompt = buildFullSystemPrompt(
    params.systemPrompt,
    params.stylePresets,
    params.customInstructions
  )

  // #region agent log
  fetch('http://127.0.0.1:7251/ingest/ad122d98-a0b2-4935-b292-9bab921eccb9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'agent-executor.ts:beforeGenerateText',message:'About to call generateText',data:{provider,model,workspaceId:params.workspaceId,toolCount:params.tools.length,systemPromptLength:fullSystemPrompt.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B-before-api-call'})}).catch(()=>{});
  // #endregion

  let result
  try {
    result = await generateText({
      model: getModel(provider, model),
      system: fullSystemPrompt,
      messages: [{ role: "user", content: params.taskPrompt }],
      tools,
      stopWhen: stepCountIs(10),
    })
    // #region agent log
    fetch('http://127.0.0.1:7251/ingest/ad122d98-a0b2-4935-b292-9bab921eccb9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'agent-executor.ts:afterGenerateText',message:'generateText succeeded',data:{textLength:result.text?.length||0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C-api-success'})}).catch(()=>{});
    // #endregion
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7251/ingest/ad122d98-a0b2-4935-b292-9bab921eccb9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'agent-executor.ts:generateTextError',message:'generateText failed',data:{error:err instanceof Error ? err.message : String(err),errorName:err instanceof Error ? err.name : 'unknown',hasApiKey:!!process.env.ANTHROPIC_API_KEY},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D-api-error'})}).catch(()=>{});
    // #endregion
    throw err
  }

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
