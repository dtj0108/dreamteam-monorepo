import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, createAdminClient } from "@dreamteam/database/server"

// GET /api/projects/[id]/activity - Get project activity feed
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createServerSupabaseClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()
    
    const { data: activity, error } = await adminSupabase
      .from("project_activity")
      .select(`
        id,
        action,
        entity_type,
        entity_id,
        metadata,
        created_at,
        user:profiles(id, name, avatar_url)
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("Error fetching activity:", error)
      return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 })
    }

    return NextResponse.json({ activity })
  } catch (error) {
    console.error("Error in GET /api/projects/[id]/activity:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

