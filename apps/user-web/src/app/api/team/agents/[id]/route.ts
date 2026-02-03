import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getWorkspaceDeployment } from "@dreamteam/database"
import { getSession } from "@dreamteam/auth/session"

// Type for deployed agent from active_config
interface DeployedAgent {
  id: string
  slug: string
  name: string
  description: string | null
  avatar_url: string | null
  system_prompt: string
  model: string
  provider?: string
  is_enabled: boolean
  tools: unknown[]
  skills: unknown[]
  mind: unknown[]
  rules: unknown[]
  department_id?: string | null
}

interface DeployedTeamConfig {
  team: {
    id: string
    name: string
    slug: string
    head_agent_id: string | null
  }
  agents: DeployedAgent[]
  delegations: unknown[]
  team_mind: unknown[]
}

// GET /api/team/agents/[id] - Get a specific agent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { id } = await params
    
    // First try to find by agents.id (workspace-specific agent)
    let { data: agent, error } = await supabase
      .from("agents")
      .select(`
        *,
        creator:created_by(id, name, avatar_url)
      `)
      .eq("id", id)
      .maybeSingle()

    if (error) {
      console.error("Error fetching agent by id:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If not found by id, try to find by ai_agent_id (the ID might be from ai_agents table)
    if (!agent) {
      const { data: agentByAiId, error: aiIdError } = await supabase
        .from("agents")
        .select(`
          *,
          creator:created_by(id, name, avatar_url)
        `)
        .eq("ai_agent_id", id)
        .eq("is_active", true)
        .maybeSingle()
      
      if (aiIdError) {
        console.error("Error fetching agent by ai_agent_id:", aiIdError)
        return NextResponse.json({ error: aiIdError.message }, { status: 500 })
      }
      
      agent = agentByAiId
    }

    // If still not found, check deployed team configurations
    if (!agent) {
      // Get all workspaces the user is a member of
      const { data: memberships } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("profile_id", session.id)

      if (memberships && memberships.length > 0) {
        for (const membership of memberships) {
          const deployment = await getWorkspaceDeployment(membership.workspace_id)
          if (deployment) {
            const activeConfig = deployment.active_config as DeployedTeamConfig
            const deployedAgent = activeConfig?.agents?.find((a: DeployedAgent) => a.id === id)
            
            if (deployedAgent) {
              // Return a synthesized agent object from deployed config
              const customizations = (deployment.customizations as Record<string, unknown>) || {}
              const agentCustomizations = (customizations.agents as Record<string, Record<string, unknown>>) || {}
              const agentCustom = agentCustomizations[id] || {}
              
              return NextResponse.json({
                id: deployedAgent.id,
                ai_agent_id: deployedAgent.id,
                workspace_id: membership.workspace_id,
                name: deployedAgent.name,
                description: deployedAgent.description,
                avatar_url: deployedAgent.avatar_url,
                system_prompt: deployedAgent.system_prompt,
                model: deployedAgent.model,
                is_active: deployedAgent.is_enabled,
                tools: deployedAgent.tools,
                reports_to: (agentCustom.reports_to as string[]) || [],
                reports_to_profiles: [],
                style_presets: agentCustom.style_presets || null,
                custom_instructions: agentCustom.custom_instructions || null,
                business_context: agentCustom.business_context || null,
                created_at: deployment.deployed_at,
                updated_at: deployment.deployed_at,
                // Mark as deployed agent
                _isDeployedAgent: true,
              })
            }
          }
        }
      }
      
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Verify user is a member of the workspace
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", agent.workspace_id)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not authorized to view this agent" },
        { status: 403 }
      )
    }

    // Fetch profiles for reports_to array
    let reportsToProfiles: { id: string; name: string; avatar_url: string | null }[] = []
    if (agent.reports_to && agent.reports_to.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", agent.reports_to)

      reportsToProfiles = profiles || []
    }

    return NextResponse.json({
      ...agent,
      reports_to_profiles: reportsToProfiles,
    })
  } catch (error) {
    console.error("Error in GET /api/team/agents/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/team/agents/[id] - Update an agent
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { id } = await params
    const body = await request.json()
    const { name, description, systemPrompt, tools, model, avatarUrl, isActive, reportsTo, stylePresets, customInstructions, businessContext } = body

    // Get the agent first from agents table
    let { data: agent, error: fetchError } = await supabase
      .from("agents")
      .select("workspace_id, created_by")
      .eq("id", id)
      .maybeSingle()

    // If not found by id, try to find by ai_agent_id
    if (!agent) {
      const { data: agentByAiId } = await supabase
        .from("agents")
        .select("workspace_id, created_by, id")
        .eq("ai_agent_id", id)
        .eq("is_active", true)
        .maybeSingle()
      
      agent = agentByAiId
    }

    // If still not found, check if it's a deployed agent and update customizations
    if (!agent) {
      // Get all workspaces the user is a member of
      const { data: memberships } = await supabase
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("profile_id", session.id)

      if (memberships && memberships.length > 0) {
        for (const membership of memberships) {
          const deployment = await getWorkspaceDeployment(membership.workspace_id)
          if (deployment) {
            const activeConfig = deployment.active_config as DeployedTeamConfig
            const deployedAgent = activeConfig?.agents?.find((a: DeployedAgent) => a.id === id)
            
            if (deployedAgent) {
              // Check if user is admin or owner
              if (membership.role !== "admin" && membership.role !== "owner") {
                return NextResponse.json(
                  { error: "Not authorized to update this agent" },
                  { status: 403 }
                )
              }
              
              // Update customizations in the deployment
              const currentCustomizations = (deployment.customizations as Record<string, unknown>) || {}
              const agentCustomizations = (currentCustomizations.agents as Record<string, Record<string, unknown>>) || {}
              
              // Build new agent customization
              const newAgentCustom: Record<string, unknown> = { ...agentCustomizations[id] }
              if (reportsTo !== undefined) newAgentCustom.reports_to = Array.isArray(reportsTo) ? reportsTo : []
              if (stylePresets !== undefined) newAgentCustom.style_presets = stylePresets
              if (customInstructions !== undefined) newAgentCustom.custom_instructions = customInstructions?.trim() || null
              if (businessContext !== undefined) newAgentCustom.business_context = businessContext
              
              const newCustomizations = {
                ...currentCustomizations,
                agents: {
                  ...agentCustomizations,
                  [id]: newAgentCustom,
                },
              }
              
              // Save to database
              const { error: updateError } = await supabase
                .from("workspace_deployed_teams")
                .update({ customizations: newCustomizations })
                .eq("id", deployment.id)
              
              if (updateError) {
                console.error("Error updating deployment customizations:", updateError)
                return NextResponse.json({ error: updateError.message }, { status: 500 })
              }
              
              // Return the updated agent
              return NextResponse.json({
                id: deployedAgent.id,
                ai_agent_id: deployedAgent.id,
                workspace_id: membership.workspace_id,
                name: deployedAgent.name,
                description: deployedAgent.description,
                avatar_url: deployedAgent.avatar_url,
                system_prompt: deployedAgent.system_prompt,
                model: deployedAgent.model,
                is_active: deployedAgent.is_enabled,
                tools: deployedAgent.tools,
                reports_to: newAgentCustom.reports_to || [],
                reports_to_profiles: [],
                style_presets: newAgentCustom.style_presets || null,
                custom_instructions: newAgentCustom.custom_instructions || null,
                business_context: newAgentCustom.business_context || null,
                created_at: deployment.deployed_at,
                updated_at: new Date().toISOString(),
                _isDeployedAgent: true,
              })
            }
          }
        }
      }
      
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Check if user is creator or admin
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", agent.workspace_id)
      .eq("profile_id", session.id)
      .single()

    const isCreatorOrAdmin =
      agent.created_by === session.id ||
      membership?.role === "admin" ||
      membership?.role === "owner"

    if (!isCreatorOrAdmin) {
      return NextResponse.json(
        { error: "Not authorized to update this agent" },
        { status: 403 }
      )
    }

    // Validate tools array if provided
    const validTools = ["transactions", "budgets", "accounts", "goals"]
    const filteredTools = tools 
      ? tools.filter((t: string) => validTools.includes(t))
      : undefined

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (systemPrompt !== undefined) updateData.system_prompt = systemPrompt.trim()
    if (filteredTools !== undefined) updateData.tools = filteredTools
    if (model !== undefined) updateData.model = model
    if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl || null
    if (isActive !== undefined) updateData.is_active = isActive
    // reportsTo is now an array of profile IDs
    if (reportsTo !== undefined) updateData.reports_to = Array.isArray(reportsTo) ? reportsTo : []
    // Style presets, custom instructions, and business context for personality customization
    if (stylePresets !== undefined) updateData.style_presets = stylePresets
    if (customInstructions !== undefined) updateData.custom_instructions = customInstructions?.trim() || null
    if (businessContext !== undefined) updateData.business_context = businessContext

    // Use the agent's actual ID (may differ from param if found by ai_agent_id)
    const agentId = (agent as { id?: string }).id || id
    
    const { data: updated, error: updateError } = await supabase
      .from("agents")
      .update(updateData)
      .eq("id", agentId)
      .select(`
        *,
        creator:created_by(id, name, avatar_url)
      `)
      .single()

    if (updateError) {
      console.error("Error updating agent:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Fetch profiles for reports_to array
    let reportsToProfiles: { id: string; name: string; avatar_url: string | null }[] = []
    if (updated.reports_to && updated.reports_to.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", updated.reports_to)

      reportsToProfiles = profiles || []
    }

    return NextResponse.json({
      ...updated,
      reports_to_profiles: reportsToProfiles,
    })
  } catch (error) {
    console.error("Error in PUT /api/team/agents/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/team/agents/[id] - Delete an agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { id } = await params

    // Get the agent first
    const { data: agent, error: fetchError } = await supabase
      .from("agents")
      .select("workspace_id, created_by")
      .eq("id", id)
      .single()

    if (fetchError || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Check if user is creator or admin
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", agent.workspace_id)
      .eq("profile_id", session.id)
      .single()

    const isCreatorOrAdmin =
      agent.created_by === session.id ||
      membership?.role === "admin" ||
      membership?.role === "owner"

    if (!isCreatorOrAdmin) {
      return NextResponse.json(
        { error: "Not authorized to delete this agent" },
        { status: 403 }
      )
    }

    // Soft delete by setting is_active to false
    const { error: deleteError } = await supabase
      .from("agents")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (deleteError) {
      console.error("Error deleting agent:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/team/agents/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

