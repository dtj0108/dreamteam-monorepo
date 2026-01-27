/**
 * AI Provider Registry
 *
 * Unified interface for multiple AI providers using Vercel AI SDK.
 * Supports: Anthropic, OpenAI, xAI (Grok), Google (Gemini), Groq, Mistral, etc.
 */

import { anthropic } from "@ai-sdk/anthropic"
import { openai } from "@ai-sdk/openai"
import { xai } from "@ai-sdk/xai"
import { google } from "@ai-sdk/google"
import type { LanguageModelV1 } from "ai"

/**
 * Supported AI providers
 */
export type AIProvider =
  | "anthropic"
  | "openai"
  | "xai"
  | "google"
  | "groq"
  | "mistral"
  | "together"
  | "fireworks"
  | "deepseek"
  | "perplexity"

/**
 * Provider configuration with model aliases
 */
interface ProviderConfig {
  provider: (model: string) => LanguageModelV1
  modelAliases?: Record<string, string>
  defaultModel: string
}

/**
 * Provider registry - maps provider names to their SDK implementations
 */
const providerRegistry: Record<string, ProviderConfig> = {
  anthropic: {
    provider: anthropic,
    modelAliases: {
      sonnet: "claude-sonnet-4-20250514",
      opus: "claude-opus-4-20250514",
      haiku: "claude-haiku-4-20250514",
    },
    defaultModel: "claude-sonnet-4-20250514",
  },
  openai: {
    provider: openai,
    modelAliases: {
      gpt4: "gpt-4-turbo",
      gpt4o: "gpt-4o",
      "gpt4o-mini": "gpt-4o-mini",
      o1: "o1",
      "o1-mini": "o1-mini",
      "o1-preview": "o1-preview",
    },
    defaultModel: "gpt-4o",
  },
  xai: {
    provider: xai,
    modelAliases: {
      grok: "grok-4-fast",
      "grok-2": "grok-2-1212",
      "grok-3": "grok-3",
      "grok-3-fast": "grok-3-fast",
      "grok-4": "grok-4",
      "grok-4-fast": "grok-4-fast",
    },
    defaultModel: "grok-4-fast",
  },
  google: {
    provider: google,
    modelAliases: {
      gemini: "gemini-2.0-flash",
      "gemini-pro": "gemini-1.5-pro",
      "gemini-flash": "gemini-2.0-flash",
    },
    defaultModel: "gemini-2.0-flash",
  },
}

/**
 * Get a language model instance for the given provider and model
 *
 * @param provider - The AI provider name (e.g., 'anthropic', 'openai', 'xai')
 * @param model - The model name or alias (e.g., 'sonnet', 'gpt-4o', 'grok-3')
 * @returns LanguageModelV1 instance ready for use with Vercel AI SDK
 */
export function getModel(provider: string, model: string): LanguageModelV1 {
  const config = providerRegistry[provider]

  if (!config) {
    throw new Error(`Unknown AI provider: ${provider}. Supported: ${Object.keys(providerRegistry).join(", ")}`)
  }

  // Resolve model alias if it exists
  const resolvedModel = config.modelAliases?.[model] || model || config.defaultModel

  console.log(`[AI Providers] Creating model: ${provider}/${resolvedModel}`)

  return config.provider(resolvedModel)
}

/**
 * Check if a provider is supported
 */
export function isProviderSupported(provider: string): boolean {
  return provider in providerRegistry
}

/**
 * Get list of supported providers
 */
export function getSupportedProviders(): string[] {
  return Object.keys(providerRegistry)
}

/**
 * Get environment variable name for a provider's API key
 */
export function getApiKeyEnvVar(provider: string): string {
  const envVars: Record<string, string> = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    xai: "XAI_API_KEY",
    google: "GOOGLE_GENERATIVE_AI_API_KEY",
    groq: "GROQ_API_KEY",
    mistral: "MISTRAL_API_KEY",
    together: "TOGETHER_AI_API_KEY",
    fireworks: "FIREWORKS_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    perplexity: "PERPLEXITY_API_KEY",
  }
  return envVars[provider] || `${provider.toUpperCase()}_API_KEY`
}

/**
 * Check if API key is configured for a provider
 */
export function isProviderConfigured(provider: string): boolean {
  const envVar = getApiKeyEnvVar(provider)
  return !!process.env[envVar]
}

/**
 * Check if Vercel AI SDK should be used for this provider
 * Returns true for all providers - we now use Vercel AI SDK exclusively
 */
export function shouldUseVercelAI(provider: string | undefined): boolean {
  // Always use Vercel AI SDK for all providers (including Anthropic)
  return true
}
