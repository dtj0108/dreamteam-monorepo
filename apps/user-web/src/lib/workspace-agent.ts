import type { SupabaseClient } from "@supabase/supabase-js"
import { getWorkspaceDeployment } from "@dreamteam/database"

type DeploymentAgent = {
  id: string
  slug?: string
  name?: string
  system_prompt?: string
  provider?: string
  model?: string
  is_enabled?: boolean
}

type LegacyAgent = {
  id: string
  ai_agent_id: string
  workspace_id: string
  tools: string[] | null
  system_prompt: string | null
  reports_to: string[] | null
  style_presets: Record<string, unknown> | null
  custom_instructions: string | null
  profile_id: string | null
  name?: string | null
}

export type ResolveWorkspaceAgentResult = {
  source: "deployment" | "legacy" | "none"
  isEnabled: boolean
  deploymentAgent?: DeploymentAgent
  legacyAgent?: LegacyAgent
  agentProfileId?: string | null
  error?: string | null
}

export async function resolveWorkspaceAgent(params: {
  workspaceId: string
  aiAgentId: string
  supabase: SupabaseClient
  deployment?: { active_config?: unknown } | null
}): Promise<ResolveWorkspaceAgentResult> {
  const { workspaceId, aiAgentId, supabase } = params

  if (!workspaceId) {
    return {
      source: "none",
      isEnabled: false,
      error: "workspace_id is required to resolve workspace agent",
    }
  }

  const deployment = params.deployment ?? await getWorkspaceDeployment(workspaceId)

  if (deployment) {
    const activeConfig = deployment.active_config as {
      agents?: DeploymentAgent[]
    } | null

    const deployedAgent = activeConfig?.agents?.find(agent => agent.id === aiAgentId)

    if (!deployedAgent || deployedAgent.is_enabled === false) {
      return {
        source: "deployment",
        isEnabled: false,
        deploymentAgent: deployedAgent,
        error: deployedAgent ? "Agent is disabled in deployment" : "Agent not found in deployment",
      }
    }

    const { data: agentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("linked_agent_id", aiAgentId)
      .eq("agent_workspace_id", workspaceId)
      .eq("is_agent", true)
      .limit(1)
      .maybeSingle()

    return {
      source: "deployment",
      isEnabled: true,
      deploymentAgent: deployedAgent,
      agentProfileId: agentProfile?.id ?? null,
      error: profileError?.message ?? null,
    }
  }

  const { data: legacyAgent, error: legacyError } = await supabase
    .from("agents")
    .select("id, ai_agent_id, workspace_id, tools, system_prompt, reports_to, style_presets, custom_instructions, profile_id, name")
    .eq("workspace_id", workspaceId)
    .eq("ai_agent_id", aiAgentId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()

  if (legacyError || !legacyAgent) {
    return {
      source: "legacy",
      isEnabled: false,
      error: legacyError?.message || "Agent not found in workspace",
    }
  }

  return {
    source: "legacy",
    isEnabled: true,
    legacyAgent: legacyAgent as LegacyAgent,
    agentProfileId: legacyAgent.profile_id ?? null,
  }
}
