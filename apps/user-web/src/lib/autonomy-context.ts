/**
 * Business context types and utilities for agent autonomy configuration
 */

export interface GuidedBusinessContext {
  primaryGoal?: string        // "What's your primary business goal?"
  industry?: string           // "What industry are you in?"
  successMetrics?: string     // "What metrics matter most?"
  audienceType?: string       // "Who is your primary audience?"
  decisionMaking?: string     // "How do you prefer recommendations?"
  communicationStyle?: string // "How should results be presented?"
}

export interface BusinessContext {
  guided: GuidedBusinessContext
  customContext?: string
}

export const DEFAULT_BUSINESS_CONTEXT: BusinessContext = {
  guided: {},
  customContext: '',
}

export interface GuidedQuestionOption {
  value: string
  label: string
}

export interface GuidedQuestion {
  key: keyof GuidedBusinessContext
  label: string
  description: string
  placeholder: string
  type: 'text' | 'dropdown'
  options?: GuidedQuestionOption[]
}

export const GUIDED_QUESTIONS: GuidedQuestion[] = [
  {
    key: 'primaryGoal',
    label: 'Primary Business Goal',
    description: "What's your main objective this agent should help with?",
    placeholder: 'e.g., Increase monthly revenue, reduce expenses, improve cash flow',
    type: 'text',
  },
  {
    key: 'industry',
    label: 'Industry',
    description: 'What industry or sector are you in?',
    placeholder: 'Select your industry',
    type: 'dropdown',
    options: [
      { value: 'ecommerce', label: 'E-commerce / Retail' },
      { value: 'saas', label: 'SaaS / Software' },
      { value: 'services', label: 'Professional Services' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'finance', label: 'Finance / Banking' },
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'hospitality', label: 'Hospitality / Food Service' },
      { value: 'realestate', label: 'Real Estate' },
      { value: 'nonprofit', label: 'Nonprofit' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    key: 'successMetrics',
    label: 'Success Metrics',
    description: 'What numbers or KPIs matter most to you?',
    placeholder: 'e.g., Profit margins, customer acquisition cost, monthly recurring revenue',
    type: 'text',
  },
  {
    key: 'audienceType',
    label: 'Primary Audience',
    description: 'Who will primarily interact with this agent?',
    placeholder: 'e.g., Business owner, finance team, operations manager',
    type: 'text',
  },
  {
    key: 'decisionMaking',
    label: 'Decision Making Style',
    description: 'How do you prefer to receive recommendations?',
    placeholder: 'Select your preference',
    type: 'dropdown',
    options: [
      { value: 'data-driven', label: 'Data-driven - Show me the numbers' },
      { value: 'balanced', label: 'Balanced - Mix of data and intuition' },
      { value: 'quick', label: 'Quick decisions - Give me the top recommendation' },
      { value: 'thorough', label: 'Thorough analysis - Show all options' },
    ],
  },
  {
    key: 'communicationStyle',
    label: 'Results Communication',
    description: 'How should results and insights be presented?',
    placeholder: 'Select your preference',
    type: 'dropdown',
    options: [
      { value: 'executive', label: 'Executive summary - Key points only' },
      { value: 'detailed', label: 'Detailed breakdown - Full analysis' },
      { value: 'actionable', label: 'Action items - What to do next' },
      { value: 'visual', label: 'Visual - Charts and comparisons' },
    ],
  },
]

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
export function parseBusinessContext(stored: unknown): BusinessContext {
  if (!stored || typeof stored !== 'object') {
    return DEFAULT_BUSINESS_CONTEXT
  }

  const obj = stored as Record<string, unknown>

  return {
    guided: (obj.guided as GuidedBusinessContext) || {},
    customContext: typeof obj.customContext === 'string' ? obj.customContext : '',
  }
}
