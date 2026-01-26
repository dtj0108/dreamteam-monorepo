import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

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

    const { data: agent, error } = await supabase
      .from("agents")
      .select(`
        *,
        creator:created_by(id, name, avatar_url)
      `)
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching agent:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!agent) {
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
    const { name, description, systemPrompt, tools, model, avatarUrl, isActive, reportsTo, stylePresets, customInstructions } = body

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
    // Style presets and custom instructions for personality customization
    if (stylePresets !== undefined) updateData.style_presets = stylePresets
    if (customInstructions !== undefined) updateData.custom_instructions = customInstructions?.trim() || null

    const { data: updated, error: updateError } = await supabase
      .from("agents")
      .update(updateData)
      .eq("id", id)
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

