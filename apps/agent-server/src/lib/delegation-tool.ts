/**
 * Delegation Tool Builder
 *
 * Builds the `delegate_to_agent` tool dynamically based on the team's
 * delegation rules. This tool allows the head agent to delegate tasks
 * to specialist agents on the team.
 */

import type { DeployedTeamConfig, DeployedDelegation } from "../types/team.js"

/**
 * Tool definition compatible with Claude API
 */
export interface DelegationTool {
  name: "delegate_to_agent"
  description: string
  input_schema: {
    type: "object"
    properties: {
      agent_slug: {
        type: "string"
        enum: string[]
        description: string
      }
      task: {
        type: "string"
        description: string
      }
      context: {
        type: "string"
        description: string
      }
    }
    required: string[]
  }
}

/**
 * Delegation tool input (validated at runtime)
 */
export interface DelegationInput {
  agent_slug: string
  task: string
  context?: string
}

/**
 * Build the delegation tool for a head agent
 *
 * Creates a tool that lists all agents the head agent can delegate to,
 * based on the team's delegation rules.
 *
 * @param config - The deployed team configuration
 * @param headAgentSlug - The slug of the head agent
 * @returns The delegation tool, or null if no delegations are available
 */
export function buildDelegationTool(
  config: DeployedTeamConfig,
  headAgentSlug: string
): DelegationTool | null {
  // Get delegations FROM the head agent
  const delegations = config.delegations.filter(
    (d) => d.from_agent_slug === headAgentSlug && d.is_enabled
  )

  if (delegations.length === 0) {
    console.log(
      `[Delegation Tool] No delegations from head agent "${headAgentSlug}"`
    )
    return null
  }

  console.log(
    `[Delegation Tool] Building tool with ${delegations.length} delegation(s) for "${headAgentSlug}"`
  )

  // Build agent descriptions for the tool
  const agentDescriptions = delegations
    .map((d) => {
      const agent = config.agents.find((a) => a.slug === d.to_agent_slug)
      const description =
        d.condition || agent?.description || "handles general tasks"
      return `- ${d.to_agent_slug}: ${description}`
    })
    .join("\n")

  // Get unique agent slugs
  const agentSlugs = [...new Set(delegations.map((d) => d.to_agent_slug))]

  return {
    name: "delegate_to_agent",
    description: `Delegate a task to a specialist agent on your team. Use this when a user's request is better handled by a specialist.

Available agents:
${agentDescriptions}

Choose the agent whose specialty best matches the user's request.`,
    input_schema: {
      type: "object",
      properties: {
        agent_slug: {
          type: "string",
          enum: agentSlugs,
          description: "The slug of the agent to delegate to",
        },
        task: {
          type: "string",
          description:
            "A clear description of what you need the specialist agent to do",
        },
        context: {
          type: "string",
          description:
            "Relevant context from the conversation that the specialist needs to know",
        },
      },
      required: ["agent_slug", "task"],
    },
  }
}

/**
 * Get the delegation rule for a specific agent
 *
 * Returns the delegation rule from the head agent to the target agent.
 * Used to apply context templates.
 *
 * @param config - The deployed team configuration
 * @param fromAgentSlug - The head agent's slug
 * @param toAgentSlug - The target agent's slug
 * @returns The delegation rule, or undefined if not found
 */
export function getDelegationRule(
  config: DeployedTeamConfig,
  fromAgentSlug: string,
  toAgentSlug: string
): DeployedDelegation | undefined {
  return config.delegations.find(
    (d) =>
      d.from_agent_slug === fromAgentSlug &&
      d.to_agent_slug === toAgentSlug &&
      d.is_enabled
  )
}
