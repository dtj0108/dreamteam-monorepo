import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// GET /api/team/skills - Get all skills for workspace
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 })
    }

    // Verify user is a member of the workspace
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      )
    }

    // Get all active skills in the workspace
    const { data: skills, error } = await supabase
      .from("agent_skills")
      .select(`
        *,
        creator:created_by(id, name, avatar_url)
      `)
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching skills:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(skills || [])
  } catch (error) {
    console.error("Error in GET /api/team/skills:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/team/skills - Create a new skill
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const {
      workspaceId,
      name,
      displayName,
      description,
      content,
      icon = "📋",
      isSystem = false,
    } = body

    if (!workspaceId || !name || !displayName || !description || !content) {
      return NextResponse.json(
        { error: "Workspace ID, name, displayName, description, and content are required" },
        { status: 400 }
      )
    }

    // Verify user is admin/owner of the workspace
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
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
        { error: "Only admins can create skills" },
        { status: 403 }
      )
    }

    // Validate name format (lowercase, hyphens, numbers only)
    const nameRegex = /^[a-z0-9-]+$/
    if (!nameRegex.test(name)) {
      return NextResponse.json(
        { error: "Skill name must be lowercase with only letters, numbers, and hyphens" },
        { status: 400 }
      )
    }

    // Create the skill
    const { data: skill, error: createError } = await supabase
      .from("agent_skills")
      .insert({
        workspace_id: workspaceId,
        name: name.trim(),
        display_name: displayName.trim(),
        description: description.trim(),
        content: content.trim(),
        icon,
        is_system: isSystem,
        created_by: session.id,
      })
      .select(`
        *,
        creator:created_by(id, name, avatar_url)
      `)
      .single()

    if (createError) {
      console.error("Error creating skill:", createError)
      if (createError.code === "23505") {
        return NextResponse.json(
          { error: "A skill with this name already exists" },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json(skill, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/team/skills:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
