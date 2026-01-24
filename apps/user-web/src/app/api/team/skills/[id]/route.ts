import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// GET /api/team/skills/[id] - Get a specific skill
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    // Get the skill
    const { data: skill, error } = await supabase
      .from("agent_skills")
      .select(`
        *,
        creator:created_by(id, name, avatar_url)
      `)
      .eq("id", id)
      .single()

    if (error || !skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 })
    }

    // Verify user is a member of the workspace
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", skill.workspace_id)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      )
    }

    return NextResponse.json(skill)
  } catch (error) {
    console.error("Error in GET /api/team/skills/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/team/skills/[id] - Update a skill
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()
    const body = await request.json()

    // Get the skill first
    const { data: existingSkill, error: fetchError } = await supabase
      .from("agent_skills")
      .select("workspace_id, is_system")
      .eq("id", id)
      .single()

    if (fetchError || !existingSkill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 })
    }

    // Verify user is admin/owner
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", existingSkill.workspace_id)
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
        { error: "Only admins can update skills" },
        { status: 403 }
      )
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (body.displayName !== undefined) updates.display_name = body.displayName.trim()
    if (body.description !== undefined) updates.description = body.description.trim()
    if (body.content !== undefined) updates.content = body.content.trim()
    if (body.icon !== undefined) updates.icon = body.icon
    if (body.isActive !== undefined) updates.is_active = body.isActive

    // Don't allow changing name of system skills
    if (body.name !== undefined && !existingSkill.is_system) {
      const nameRegex = /^[a-z0-9-]+$/
      if (!nameRegex.test(body.name)) {
        return NextResponse.json(
          { error: "Skill name must be lowercase with only letters, numbers, and hyphens" },
          { status: 400 }
        )
      }
      updates.name = body.name.trim()
    }

    // Update the skill
    const { data: skill, error: updateError } = await supabase
      .from("agent_skills")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        creator:created_by(id, name, avatar_url)
      `)
      .single()

    if (updateError) {
      console.error("Error updating skill:", updateError)
      if (updateError.code === "23505") {
        return NextResponse.json(
          { error: "A skill with this name already exists" },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(skill)
  } catch (error) {
    console.error("Error in PATCH /api/team/skills/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/team/skills/[id] - Delete a skill
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    // Get the skill first
    const { data: existingSkill, error: fetchError } = await supabase
      .from("agent_skills")
      .select("workspace_id, is_system, name")
      .eq("id", id)
      .single()

    if (fetchError || !existingSkill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 })
    }

    // Don't allow deleting system skills
    if (existingSkill.is_system) {
      return NextResponse.json(
        { error: "System skills cannot be deleted" },
        { status: 403 }
      )
    }

    // Verify user is admin/owner
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", existingSkill.workspace_id)
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
        { error: "Only admins can delete skills" },
        { status: 403 }
      )
    }

    // Delete the skill (assignments will cascade delete)
    const { error: deleteError } = await supabase
      .from("agent_skills")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Error deleting skill:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `Skill "${existingSkill.name}" deleted` })
  } catch (error) {
    console.error("Error in DELETE /api/team/skills/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
