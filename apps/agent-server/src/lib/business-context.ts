/**
 * Business context types and utilities for agent autonomy configuration
 *
 * This file mirrors the logic from apps/user-web/src/lib/autonomy-context.ts
 * for use in the agent server.
 */

export interface GuidedBusinessContext {
  primaryGoal?: string
  industry?: string
  successMetrics?: string
  audienceType?: string
  decisionMaking?: string
  communicationStyle?: string
}

export interface BusinessContext {
  guided: GuidedBusinessContext
  customContext?: string
}

/**
 * Build natural language instructions from business context
 */
export function buildBusinessContextInstructions(context: BusinessContext | null | undefined): string {
  if (!context) return ''

  const instructions: string[] = []
  const guided = context.guided || {}

  // Primary goal
  if (guided.primaryGoal?.trim()) {
    instructions.push(`The user's primary business goal is: ${guided.primaryGoal.trim()}. Prioritize recommendations and insights that align with this objective.`)
  }

  // Industry
  if (guided.industry) {
    const industryLabels: Record<string, string> = {
      ecommerce: 'e-commerce/retail',
      saas: 'SaaS/software',
      services: 'professional services',
      healthcare: 'healthcare',
      finance: 'finance/banking',
      manufacturing: 'manufacturing',
      hospitality: 'hospitality/food service',
      realestate: 'real estate',
      nonprofit: 'nonprofit',
      other: 'their specific industry',
    }
    const label = industryLabels[guided.industry] || guided.industry
    instructions.push(`The user operates in the ${label} industry. Use relevant benchmarks and terminology for this sector.`)
  }

  // Success metrics
  if (guided.successMetrics?.trim()) {
    instructions.push(`Key metrics the user cares about: ${guided.successMetrics.trim()}. Highlight these in your analysis.`)
  }

  // Audience type
  if (guided.audienceType?.trim()) {
    instructions.push(`The primary audience is: ${guided.audienceType.trim()}. Tailor your communication appropriately.`)
  }

  // Decision making style
  if (guided.decisionMaking) {
    const styles: Record<string, string> = {
      'data-driven': 'Present recommendations with supporting data, statistics, and evidence. Include specific numbers and percentages.',
      'balanced': 'Balance data-driven insights with practical intuition. Provide both numbers and qualitative context.',
      'quick': 'Lead with your top recommendation. Be decisive and highlight the best option first, with brief justification.',
      'thorough': 'Present all viable options with pros and cons. Allow for comprehensive evaluation before decisions.',
    }
    if (styles[guided.decisionMaking]) {
      instructions.push(styles[guided.decisionMaking])
    }
  }

  // Communication style
  if (guided.communicationStyle) {
    const styles: Record<string, string> = {
      'executive': 'Keep responses concise with key takeaways first. Use bullet points for easy scanning.',
      'detailed': 'Provide comprehensive breakdowns with full context and analysis. Be thorough in explanations.',
      'actionable': 'Focus on next steps and action items. Structure responses around what the user should do.',
      'visual': 'When possible, describe data in ways that would translate well to charts. Use comparisons and contrasts.',
    }
    if (styles[guided.communicationStyle]) {
      instructions.push(styles[guided.communicationStyle])
    }
  }

  // Custom context
  if (context.customContext?.trim()) {
    instructions.push(`Additional context: ${context.customContext.trim()}`)
  }

  if (instructions.length === 0) return ''

  return `## Business Context\n${instructions.join('\n\n')}`
}

/**
 * Parse business context from stored JSON
 */
export function parseBusinessContext(stored: unknown): BusinessContext | null {
  if (!stored || typeof stored !== 'object') {
    return null
  }

  const obj = stored as Record<string, unknown>

  // Check if there's any actual content
  const guided = (obj.guided as GuidedBusinessContext) || {}
  const customContext = typeof obj.customContext === 'string' ? obj.customContext : ''

  const hasContent =
    Object.values(guided).some(v => v && typeof v === 'string' && v.trim()) ||
    customContext.trim()

  if (!hasContent) {
    return null
  }

  return {
    guided,
    customContext,
  }
}
