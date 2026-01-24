import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/knowledge/pages/[id] - Get a single page
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    const { data: page, error } = await supabase
      .from("knowledge_pages")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching page:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    // Add isFavorite flag
    const pageWithFavorite = {
      ...page,
      isFavorite: Array.isArray(page.is_favorited_by)
        ? page.is_favorited_by.includes(session.id)
        : false,
    }

    return NextResponse.json(pageWithFavorite)
  } catch (error) {
    console.error("Error in GET /api/knowledge/pages/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/knowledge/pages/[id] - Update a page
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()
    const body = await request.json()

    const { title, icon, coverImage, content, parentId, position, isArchived } = body

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {
      last_edited_by: session.id,
      updated_at: new Date().toISOString(),
    }

    if (title !== undefined) updates.title = title
    if (icon !== undefined) updates.icon = icon
    if (coverImage !== undefined) updates.cover_image = coverImage
    if (content !== undefined) updates.content = content
    if (parentId !== undefined) updates.parent_id = parentId
    if (position !== undefined) updates.position = position
    if (isArchived !== undefined) updates.is_archived = isArchived

    const { data: page, error } = await supabase
      .from("knowledge_pages")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating page:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add isFavorite flag
    const pageWithFavorite = {
      ...page,
      isFavorite: Array.isArray(page.is_favorited_by)
        ? page.is_favorited_by.includes(session.id)
        : false,
    }

    return NextResponse.json(pageWithFavorite)
  } catch (error) {
    console.error("Error in PATCH /api/knowledge/pages/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/knowledge/pages/[id] - Delete a page
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
      // Hard delete - will cascade to child pages
      const { error } = await supabase
        .from("knowledge_pages")
        .delete()
        .eq("id", id)

      if (error) {
        console.error("Error deleting page:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      // Soft delete - archive the page
      const { error } = await supabase
        .from("knowledge_pages")
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq("id", id)

      if (error) {
        console.error("Error archiving page:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/knowledge/pages/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
