import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// GET /api/team/agents/[id]/skills - Get skills assigned to an agent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: agentId } = await params
    const supabase = createAdminClient()

    // Get the agent to verify workspace access
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("workspace_id")
      .eq("id", agentId)
      .single()

    if (agentError || !agent) {
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
        { error: "Not a member of this workspace" },
        { status: 403 }
      )
    }

    // Get assigned skills
    const { data: assignments, error } = await supabase
      .from("agent_skill_assignments")
      .select(`
        id,
        created_at,
        skill:skill_id(
          id,
          name,
          display_name,
          description,
          icon,
          is_system,
          content
        )
      `)
      .eq("agent_id", agentId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching agent skills:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Extract just the skills for cleaner response
    const skills = (assignments || []).map((a: any) => ({
      assignmentId: a.id,
      ...a.skill,
    }))

    return NextResponse.json(skills)
  } catch (error) {
    console.error("Error in GET /api/team/agents/[id]/skills:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/team/agents/[id]/skills - Assign a skill to an agent
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: agentId } = await params
    const supabase = createAdminClient()
    const body = await request.json()
    const { skillId } = body

    if (!skillId) {
      return NextResponse.json({ error: "Skill ID is required" }, { status: 400 })
    }

    // Get the agent to verify workspace access
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("workspace_id, name")
      .eq("id", agentId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Verify user is admin/owner
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", agent.workspace_id)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      )
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can assign skills to agents" },
        { status: 403 }
      )
    }

    // Verify the skill exists and belongs to the same workspace
    const { data: skill, error: skillError } = await supabase
      .from("agent_skills")
      .select("id, name, workspace_id")
      .eq("id", skillId)
      .single()

    if (skillError || !skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 })
    }

    if (skill.workspace_id !== agent.workspace_id) {
      return NextResponse.json(
        { error: "Skill must belong to the same workspace as the agent" },
        { status: 400 }
      )
    }

    // Create the assignment
    const { data: assignment, error: assignError } = await supabase
      .from("agent_skill_assignments")
      .insert({
        agent_id: agentId,
        skill_id: skillId,
      })
      .select(`
        id,
        created_at,
        skill:skill_id(
          id,
          name,
          display_name,
          description,
          icon,
          is_system
        )
      `)
      .single()

    if (assignError) {
      console.error("Error assigning skill:", assignError)
      if (assignError.code === "23505") {
        return NextResponse.json(
          { error: "This skill is already assigned to this agent" },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: assignError.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        ...assignment,
        message: `Skill "${skill.name}" assigned to agent "${agent.name}"`,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error in POST /api/team/agents/[id]/skills:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/team/agents/[id]/skills - Unassign a skill from an agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: agentId } = await params
    const { searchParams } = new URL(request.url)
    const skillId = searchParams.get("skillId")

    if (!skillId) {
      return NextResponse.json({ error: "Skill ID is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get the agent to verify workspace access
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("workspace_id, name")
      .eq("id", agentId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Verify user is admin/owner
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", agent.workspace_id)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      )
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can unassign skills from agents" },
        { status: 403 }
      )
    }

    // Delete the assignment
    const { error: deleteError } = await supabase
      .from("agent_skill_assignments")
      .delete()
      .eq("agent_id", agentId)
      .eq("skill_id", skillId)

    if (deleteError) {
      console.error("Error unassigning skill:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Skill unassigned from agent" })
  } catch (error) {
    console.error("Error in DELETE /api/team/agents/[id]/skills:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
