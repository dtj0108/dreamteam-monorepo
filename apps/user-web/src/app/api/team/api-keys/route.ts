import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"
import { generateApiKey } from "@/lib/api-key-auth"

// GET /api/team/api-keys - List all API keys for a workspace
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
      return NextResponse.json(
        { error: "Workspace ID required" },
        { status: 400 }
      )
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

    // Get all API keys (excluding the hash)
    const { data: keys, error } = await supabase
      .from("workspace_api_keys")
      .select(
        `
        id,
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
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching API keys:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(keys)
  } catch (error) {
    console.error("Error in GET /api/team/api-keys:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/team/api-keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    const body = await request.json()
    const { workspaceId, name, expiresAt } = body

    if (!workspaceId || !name) {
      return NextResponse.json(
        { error: "Workspace ID and name required" },
        { status: 400 }
      )
    }

    // Verify user is an owner or admin
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      // Also check if they're the workspace owner
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("owner_id")
        .eq("id", workspaceId)
        .single()

      if (!workspace || workspace.owner_id !== session.id) {
        return NextResponse.json(
          { error: "Not a member of this workspace" },
          { status: 403 }
        )
      }
    } else if (membership.role !== "owner" && membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only owners and admins can create API keys" },
        { status: 403 }
      )
    }

    // Generate the API key
    const { key, prefix, hash } = generateApiKey()

    // Insert the key
    const { data: newKey, error: insertError } = await supabase
      .from("workspace_api_keys")
      .insert({
        workspace_id: workspaceId,
        name,
        key_prefix: prefix,
        key_hash: hash,
        created_by: session.id,
        expires_at: expiresAt || null,
      })
      .select(
        `
        id,
        name,
        key_prefix,
        created_at,
        expires_at
      `
      )
      .single()

    if (insertError) {
      console.error("Error creating API key:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Return the full key ONLY this one time
    return NextResponse.json(
      {
        ...newKey,
        key, // Full key - only shown once!
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error in POST /api/team/api-keys:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
