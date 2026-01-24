/**
 * Agent Rules Application
 *
 * Applies behavioral rules from the admin's agent_rules table to agent system prompts.
 * Rules are categorized as "always", "never", or "when" (conditional) rules.
 */

/**
 * Agent rule type from the admin's agent_rules table
 */
export interface AgentRule {
  id: string
  agent_id: string
  rule_type: "always" | "never" | "when"
  rule_content: string
  condition?: string | null
  priority?: number
  is_enabled: boolean
  created_at?: string
  updated_at?: string
}

/**
 * Apply rules to a base system prompt
 *
 * Rules are organized into sections:
 * - Always: Actions the agent must always perform
 * - Never: Actions the agent must never perform
 * - Conditional: Actions that depend on specific conditions
 *
 * @param basePrompt - The agent's base system prompt
 * @param rules - Array of rules from the agent_rules table
 * @returns The system prompt with rules appended
 */
export function applyRulesToPrompt(basePrompt: string, rules: AgentRule[]): string {
  if (!rules || rules.length === 0) {
    return basePrompt
  }

  // Filter enabled rules and sort by priority (lower number = higher priority)
  const enabledRules = rules
    .filter((r) => r.is_enabled !== false)
    .sort((a, b) => (a.priority || 100) - (b.priority || 100))

  // Categorize rules by type
  const alwaysRules = enabledRules.filter((r) => r.rule_type === "always")
  const neverRules = enabledRules.filter((r) => r.rule_type === "never")
  const whenRules = enabledRules.filter((r) => r.rule_type === "when")

  // Build rules section
  let rulesSection = "\n\n## Behavioral Rules\n\n"
  rulesSection += "Follow these rules strictly in all interactions:\n\n"

  if (alwaysRules.length > 0) {
    rulesSection += "### Always:\n"
    rulesSection += alwaysRules.map((r) => `- ${r.rule_content}`).join("\n")
    rulesSection += "\n\n"
  }

  if (neverRules.length > 0) {
    rulesSection += "### Never:\n"
    rulesSection += neverRules.map((r) => `- ${r.rule_content}`).join("\n")
    rulesSection += "\n\n"
  }

  if (whenRules.length > 0) {
    rulesSection += "### Conditional:\n"
    rulesSection += whenRules
      .map((r) => {
        if (r.condition) {
          return `- When ${r.condition}: ${r.rule_content}`
        }
        return `- ${r.rule_content}`
      })
      .join("\n")
    rulesSection += "\n\n"
  }

  return basePrompt + rulesSection
}
