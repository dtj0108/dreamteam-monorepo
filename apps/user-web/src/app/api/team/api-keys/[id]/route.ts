import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// GET /api/team/api-keys/[id] - Get a single API key
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

    // Get the key
    const { data: key, error } = await supabase
      .from("workspace_api_keys")
      .select(
        `
        id,
        workspace_id,
        name,
        key_prefix,
        created_at,
        last_used_at,
        expires_at,
        is_revoked,
        revoked_at,
        created_by:profiles!workspace_api_keys_created_by_fkey(id, name),
        revoked_by:profiles!workspace_api_keys_revoked_by_fkey(id, name)
      `
      )
      .eq("id", id)
      .single()

    if (error || !key) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 })
    }

    // Verify user is a member of the workspace
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", key.workspace_id)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not authorized to view this key" },
        { status: 403 }
      )
    }

    return NextResponse.json(key)
  } catch (error) {
    console.error("Error in GET /api/team/api-keys/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/team/api-keys/[id] - Revoke an API key
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

    // Get the key to find its workspace
    const { data: key, error: keyError } = await supabase
      .from("workspace_api_keys")
      .select("workspace_id, is_revoked")
      .eq("id", id)
      .single()

    if (keyError || !key) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 })
    }

    if (key.is_revoked) {
      return NextResponse.json(
        { error: "API key is already revoked" },
        { status: 400 }
      )
    }

    // Verify user is an owner or admin
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", key.workspace_id)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      // Check if they're the workspace owner
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("owner_id")
        .eq("id", key.workspace_id)
        .single()

      if (!workspace || workspace.owner_id !== session.id) {
        return NextResponse.json(
          { error: "Not authorized to revoke this key" },
          { status: 403 }
        )
      }
    } else if (membership.role !== "owner" && membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only owners and admins can revoke API keys" },
        { status: 403 }
      )
    }

    // Revoke the key
    const { error: updateError } = await supabase
      .from("workspace_api_keys")
      .update({
        is_revoked: true,
        revoked_at: new Date().toISOString(),
        revoked_by: session.id,
      })
      .eq("id", id)

    if (updateError) {
      console.error("Error revoking API key:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/team/api-keys/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
