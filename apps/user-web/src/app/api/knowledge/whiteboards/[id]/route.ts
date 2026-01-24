import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/knowledge/whiteboards/[id] - Get a single whiteboard
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    const { data: whiteboard, error } = await supabase
      .from("knowledge_whiteboards")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching whiteboard:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!whiteboard) {
      return NextResponse.json({ error: "Whiteboard not found" }, { status: 404 })
    }

    // Add isFavorite flag
    const whiteboardWithFavorite = {
      ...whiteboard,
      isFavorite: Array.isArray(whiteboard.is_favorited_by)
        ? whiteboard.is_favorited_by.includes(session.id)
        : false,
    }

    return NextResponse.json(whiteboardWithFavorite)
  } catch (error) {
    console.error("Error in GET /api/knowledge/whiteboards/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/knowledge/whiteboards/[id] - Update a whiteboard
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()
    const body = await request.json()

    const { title, icon, content, thumbnail, position, isArchived } = body

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {
      last_edited_by: session.id,
      updated_at: new Date().toISOString(),
    }

    if (title !== undefined) updates.title = title
    if (icon !== undefined) updates.icon = icon
    if (content !== undefined) updates.content = content
    if (thumbnail !== undefined) updates.thumbnail = thumbnail
    if (position !== undefined) updates.position = position
    if (isArchived !== undefined) updates.is_archived = isArchived

    const { data: whiteboard, error } = await supabase
      .from("knowledge_whiteboards")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating whiteboard:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add isFavorite flag
    const whiteboardWithFavorite = {
      ...whiteboard,
      isFavorite: Array.isArray(whiteboard.is_favorited_by)
        ? whiteboard.is_favorited_by.includes(session.id)
        : false,
    }

    return NextResponse.json(whiteboardWithFavorite)
  } catch (error) {
    console.error("Error in PATCH /api/knowledge/whiteboards/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/knowledge/whiteboards/[id] - Delete a whiteboard
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const permanent = searchParams.get("permanent") === "true"

    if (permanent) {
      // Hard delete
      const { error } = await supabase
        .from("knowledge_whiteboards")
        .delete()
        .eq("id", id)

      if (error) {
        console.error("Error deleting whiteboard:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      // Soft delete - archive the whiteboard
      const { error } = await supabase
        .from("knowledge_whiteboards")
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq("id", id)

      if (error) {
        console.error("Error archiving whiteboard:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/knowledge/whiteboards/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
