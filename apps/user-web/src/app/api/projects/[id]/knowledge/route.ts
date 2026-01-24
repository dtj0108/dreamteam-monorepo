import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, createAdminClient } from "@dreamteam/database/server"

// GET /api/projects/[id]/knowledge - List all linked knowledge items
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

    const adminSupabase = createAdminClient()

    // Fetch linked pages
    const { data: linkedPages, error: pagesError } = await adminSupabase
      .from("project_knowledge_pages")
      .select(`
        id,
        created_at,
        linked_by,
        page:knowledge_pages(
          id,
          title,
          icon,
          updated_at,
          created_by
        ),
        linker:profiles!project_knowledge_pages_linked_by_fkey(id, name, avatar_url)
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (pagesError) {
      console.error("Error fetching linked pages:", pagesError)
      return NextResponse.json({ error: "Failed to fetch linked pages" }, { status: 500 })
    }

    // Fetch linked whiteboards
    const { data: linkedWhiteboards, error: whiteboardsError } = await adminSupabase
      .from("project_knowledge_whiteboards")
      .select(`
        id,
        created_at,
        linked_by,
        whiteboard:knowledge_whiteboards(
          id,
          title,
          icon,
          thumbnail,
          updated_at,
          created_by
        ),
        linker:profiles!project_knowledge_whiteboards_linked_by_fkey(id, name, avatar_url)
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (whiteboardsError) {
      console.error("Error fetching linked whiteboards:", whiteboardsError)
      return NextResponse.json({ error: "Failed to fetch linked whiteboards" }, { status: 500 })
    }

    return NextResponse.json({
      pages: linkedPages || [],
      whiteboards: linkedWhiteboards || [],
    })
  } catch (error) {
    console.error("Error in GET /api/projects/[id]/knowledge:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/projects/[id]/knowledge - Link a knowledge item to the project
export async function POST(
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

    const body = await request.json()
    const { type, itemId } = body

    if (!type || !itemId) {
      return NextResponse.json({ error: "Type and itemId are required" }, { status: 400 })
    }

    if (type !== "page" && type !== "whiteboard") {
      return NextResponse.json({ error: "Type must be 'page' or 'whiteboard'" }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    if (type === "page") {
      // Check if already linked
      const { data: existing } = await adminSupabase
        .from("project_knowledge_pages")
        .select("id")
        .eq("project_id", projectId)
        .eq("page_id", itemId)
        .single()

      if (existing) {
        return NextResponse.json({ error: "Page is already linked to this project" }, { status: 400 })
      }

      const { data: link, error } = await adminSupabase
        .from("project_knowledge_pages")
        .insert({
          project_id: projectId,
          page_id: itemId,
          linked_by: user.id,
        })
        .select(`
          id,
          created_at,
          linked_by,
          page:knowledge_pages(id, title, icon, updated_at, created_by),
          linker:profiles!project_knowledge_pages_linked_by_fkey(id, name, avatar_url)
        `)
        .single()

      if (error) {
        console.error("Error linking page:", error)
        return NextResponse.json({ error: "Failed to link page" }, { status: 500 })
      }

      return NextResponse.json({ link, type: "page" }, { status: 201 })
    } else {
      // Check if already linked
      const { data: existing } = await adminSupabase
        .from("project_knowledge_whiteboards")
        .select("id")
        .eq("project_id", projectId)
        .eq("whiteboard_id", itemId)
        .single()

      if (existing) {
        return NextResponse.json({ error: "Whiteboard is already linked to this project" }, { status: 400 })
      }

      const { data: link, error } = await adminSupabase
        .from("project_knowledge_whiteboards")
        .insert({
          project_id: projectId,
          whiteboard_id: itemId,
          linked_by: user.id,
        })
        .select(`
          id,
          created_at,
          linked_by,
          whiteboard:knowledge_whiteboards(id, title, icon, thumbnail, updated_at, created_by),
          linker:profiles!project_knowledge_whiteboards_linked_by_fkey(id, name, avatar_url)
        `)
        .single()

      if (error) {
        console.error("Error linking whiteboard:", error)
        return NextResponse.json({ error: "Failed to link whiteboard" }, { status: 500 })
      }

      return NextResponse.json({ link, type: "whiteboard" }, { status: 201 })
    }
  } catch (error) {
    console.error("Error in POST /api/projects/[id]/knowledge:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/knowledge - Unlink a knowledge item from the project
export async function DELETE(
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
    const type = searchParams.get("type")
    const linkId = searchParams.get("linkId")
    const itemId = searchParams.get("itemId")

    if (!type || (!linkId && !itemId)) {
      return NextResponse.json({ error: "Type and either linkId or itemId are required" }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    if (type === "page") {
      let query = adminSupabase
        .from("project_knowledge_pages")
        .delete()
        .eq("project_id", projectId)

      if (linkId) {
        query = query.eq("id", linkId)
      } else if (itemId) {
        query = query.eq("page_id", itemId)
      }

      const { error } = await query

      if (error) {
        console.error("Error unlinking page:", error)
        return NextResponse.json({ error: "Failed to unlink page" }, { status: 500 })
      }
    } else if (type === "whiteboard") {
      let query = adminSupabase
        .from("project_knowledge_whiteboards")
        .delete()
        .eq("project_id", projectId)

      if (linkId) {
        query = query.eq("id", linkId)
      } else if (itemId) {
        query = query.eq("whiteboard_id", itemId)
      }

      const { error } = await query

      if (error) {
        console.error("Error unlinking whiteboard:", error)
        return NextResponse.json({ error: "Failed to unlink whiteboard" }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: "Type must be 'page' or 'whiteboard'" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/projects/[id]/knowledge:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
