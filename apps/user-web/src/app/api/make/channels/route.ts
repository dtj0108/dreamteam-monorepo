import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"

/**
 * GET /api/make/channels
 *
 * List all channels in the workspace.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "100")
    const offset = parseInt(searchParams.get("offset") || "0")

    const { data, error } = await supabase
      .from("channels")
      .select("id, name, description, is_private, is_archived, created_at")
      .eq("workspace_id", auth.workspaceId)
      .eq("is_archived", false)
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("Error fetching channels:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Error in channels GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/make/channels
 *
 * Create a new channel.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, is_private, member_ids } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get the API key owner
    const { data: apiKey } = await supabase
      .from("workspace_api_keys")
      .select("created_by")
      .eq("id", auth.keyId)
      .single()

    const { data, error } = await supabase
      .from("channels")
      .insert({
        workspace_id: auth.workspaceId,
        name,
        description,
        is_private: is_private || false,
        created_by: apiKey?.created_by || null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A channel with this name already exists" },
          { status: 409 }
        )
      }
      console.error("Error creating channel:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add members to channel_members table
    const membersToAdd: { channel_id: string; profile_id: string }[] = []

    // Always add the API key creator so they can see the channel
    if (apiKey?.created_by) {
      membersToAdd.push({
        channel_id: data.id,
        profile_id: apiKey.created_by,
      })
    }

    // Add any specified members
    if (member_ids && Array.isArray(member_ids)) {
      for (const memberId of member_ids) {
        if (memberId && memberId !== apiKey?.created_by) {
          membersToAdd.push({
            channel_id: data.id,
            profile_id: memberId,
          })
        }
      }
    }

    // Insert all members
    if (membersToAdd.length > 0) {
      const { error: memberError } = await supabase
        .from("channel_members")
        .insert(membersToAdd)

      if (memberError) {
        console.error("Error adding channel members:", memberError)
      }
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in channels POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
