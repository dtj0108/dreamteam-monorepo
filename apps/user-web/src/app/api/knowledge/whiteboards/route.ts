import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// GET /api/knowledge/whiteboards - Get all whiteboards for the workspace
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const archived = searchParams.get("archived") === "true"

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 })
    }

    const { data: whiteboards, error } = await supabase
      .from("knowledge_whiteboards")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_archived", archived)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching whiteboards:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform whiteboards to include isFavorite flag
    const whiteboardsWithFavorite = (whiteboards || []).map((wb: { is_favorited_by?: string[] } & Record<string, unknown>) => ({
      ...wb,
      isFavorite: Array.isArray(wb.is_favorited_by)
        ? wb.is_favorited_by.includes(session.id)
        : false,
    }))

    return NextResponse.json(whiteboardsWithFavorite)
  } catch (error) {
    console.error("Error in GET /api/knowledge/whiteboards:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/knowledge/whiteboards - Create a new whiteboard
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const { workspaceId, title, icon } = body

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID required" },
        { status: 400 }
      )
    }

    // Get max position for ordering
    const { data: maxPosData } = await supabase
      .from("knowledge_whiteboards")
      .select("position")
      .eq("workspace_id", workspaceId)
      .order("position", { ascending: false })
      .limit(1)

    const maxPosition = maxPosData?.[0]?.position ?? -1

    // Create the whiteboard
    const { data: whiteboard, error } = await supabase
      .from("knowledge_whiteboards")
      .insert({
        workspace_id: workspaceId,
        title: title || "Untitled Whiteboard",
        icon: icon || "🎨",
        content: {}, // Empty Excalidraw scene
        position: maxPosition + 1,
        created_by: session.id,
        last_edited_by: session.id,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating whiteboard:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(whiteboard, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/knowledge/whiteboards:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
