/**
 * Output configuration for AI response formatting
 */
export interface OutputConfig {
  tone?: 'friendly' | 'professional' | 'concise'
  format?: 'conversational' | 'bullet_points' | 'structured'
  custom_instructions?: string
}

/**
 * Build output instructions based on output_config.
 * These instructions guide the AI on HOW to present its response.
 * 
 * @param outputConfig - The output configuration
 * @returns Formatted instruction string
 */
export function buildOutputInstructions(outputConfig: OutputConfig | null | undefined): string {
  // Default human-like behavior when no config or empty config
  if (!outputConfig || Object.keys(outputConfig).length === 0) {
    return `## Response Style
- Write naturally, as if messaging a colleague
- Don't start by restating the task you were asked to do
- Be conversational, not robotic or templated
- Focus on what matters most, then details if needed
- Skip unnecessary preamble like "Here is the report" or "I have completed the task"`
  }

  const parts: string[] = ['## Response Style']

  // Tone instruction
  if (outputConfig.tone) {
    switch (outputConfig.tone) {
      case 'friendly':
        parts.push("- Use a warm, friendly tone - like messaging a colleague")
        parts.push("- It's okay to be casual and personable")
        break
      case 'professional':
        parts.push('- Use a professional, polished tone')
        parts.push('- Keep language clear and business-appropriate')
        break
      case 'concise':
        parts.push('- Be extremely concise - get to the point immediately')
        parts.push('- Minimize extra words and explanations')
        break
    }
  }

  // Format instruction
  if (outputConfig.format) {
    switch (outputConfig.format) {
      case 'conversational':
        parts.push('- Write in natural paragraphs, like a message')
        parts.push('- Avoid rigid structure or templates')
        break
      case 'bullet_points':
        parts.push('- Use bullet points for easy scanning')
        parts.push('- Keep each point brief')
        break
      case 'structured':
        parts.push('- Use clear sections with headers')
        parts.push('- Organize information logically')
        break
    }
  }

  // Always add these defaults
  parts.push("- Don't start by restating the task you were asked to do")
  parts.push('- Skip unnecessary preamble like "Here is the report"')

  // Custom instructions override/add to the above
  if (outputConfig.custom_instructions) {
    parts.push('')
    parts.push('Additional instructions:')
    parts.push(outputConfig.custom_instructions)
  }

  return parts.join('\n')
}

/**
 * Validate output configuration
 */
export function validateOutputConfig(config: unknown): OutputConfig | null {
  if (!config || typeof config !== 'object') {
    return null
  }
  
  const c = config as Record<string, unknown>
  const validTones = ['friendly', 'professional', 'concise']
  const validFormats = ['conversational', 'bullet_points', 'structured']
  
  const result: OutputConfig = {}
  
  if (c.tone && validTones.includes(c.tone as string)) {
    result.tone = c.tone as OutputConfig['tone']
  }
  
  if (c.format && validFormats.includes(c.format as string)) {
    result.format = c.format as OutputConfig['format']
  }
  
  if (c.custom_instructions && typeof c.custom_instructions === 'string') {
    result.custom_instructions = c.custom_instructions
  }
  
  return result
}
