/**
 * Style preset types and utilities for agent personality customization
 */

export interface StylePresets {
  verbosity: 'concise' | 'balanced' | 'detailed'
  tone: 'casual' | 'balanced' | 'formal'
  examples: 'few' | 'moderate' | 'many'
}

export const DEFAULT_STYLE_PRESETS: StylePresets = {
  verbosity: 'balanced',
  tone: 'balanced',
  examples: 'moderate',
}

/**
 * Convert style presets to natural language instructions
 * Returns empty string if all presets are at default (balanced/moderate) values
 */
export function buildStyleInstructions(presets: Partial<StylePresets> | null | undefined): string {
  if (!presets) return ''

  const instructions: string[] = []

  // Verbosity
  switch (presets.verbosity) {
    case 'concise':
      instructions.push('Be concise and get straight to the point. Keep responses brief.')
      break
    case 'detailed':
      instructions.push('Provide thorough, detailed explanations. Be comprehensive in your responses.')
      break
    // 'balanced' - no instruction needed
  }

  // Tone
  switch (presets.tone) {
    case 'casual':
      instructions.push('Use a friendly, conversational tone. Be approachable and relaxed.')
      break
    case 'formal':
      instructions.push('Maintain a professional, formal tone. Be polished and business-like.')
      break
    // 'balanced' - no instruction needed
  }

  // Examples
  switch (presets.examples) {
    case 'few':
      instructions.push('Use examples sparingly, only when essential for clarity.')
      break
    case 'many':
      instructions.push('Include examples frequently to illustrate points and aid understanding.')
      break
    // 'moderate' - no instruction needed
  }

  if (instructions.length === 0) return ''

  return `## Communication Style\n${instructions.join('\n')}`
}

/**
 * Parse style presets from stored JSON
 */
export function parseStylePresets(stored: unknown): StylePresets {
  if (!stored || typeof stored !== 'object') {
    return DEFAULT_STYLE_PRESETS
  }

  const obj = stored as Record<string, unknown>

  return {
    verbosity: isValidVerbosity(obj.verbosity) ? obj.verbosity : 'balanced',
    tone: isValidTone(obj.tone) ? obj.tone : 'balanced',
    examples: isValidExamples(obj.examples) ? obj.examples : 'moderate',
  }
}

function isValidVerbosity(value: unknown): value is StylePresets['verbosity'] {
  return value === 'concise' || value === 'balanced' || value === 'detailed'
}

function isValidTone(value: unknown): value is StylePresets['tone'] {
  return value === 'casual' || value === 'balanced' || value === 'formal'
}

function isValidExamples(value: unknown): value is StylePresets['examples'] {
  return value === 'few' || value === 'moderate' || value === 'many'
}

/**
 * Build the full system prompt with style and custom instructions
 */
export function buildFullSystemPrompt(
  basePrompt: string,
  stylePresets: Partial<StylePresets> | null | undefined,
  customInstructions: string | null | undefined
): string {
  const parts: string[] = [basePrompt]

  const styleInstructions = buildStyleInstructions(stylePresets)
  if (styleInstructions) {
    parts.push(styleInstructions)
  }

  if (customInstructions?.trim()) {
    parts.push(`## Additional Instructions\n${customInstructions.trim()}`)
  }

  return parts.join('\n\n')
}
