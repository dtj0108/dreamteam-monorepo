import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"

/**
 * Convert plain text to BlockNote JSON format.
 * If content is already an array (BlockNote format), return as-is.
 * If content is a string, convert to paragraph blocks.
 */
function normalizeContent(content: unknown): unknown {
  // Already in BlockNote format
  if (Array.isArray(content)) {
    return content
  }

  // Plain text string - convert to BlockNote paragraphs
  if (typeof content === "string" && content.trim()) {
    const paragraphs = content.split(/\n+/).filter(line => line.trim())
    return paragraphs.map(text => ({
      type: "paragraph",
      content: [{ type: "text", text: text.trim() }]
    }))
  }

  // Empty or invalid - return empty array
  return []
}

/**
 * GET /api/make/knowledge-pages
 *
 * List all knowledge pages in the workspace.
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
    const parentId = searchParams.get("parent_id")

    let query = supabase
      .from("knowledge_pages")
      .select(`
        id, title, icon, cover_image, is_template, is_archived,
        position, parent_id, created_at, updated_at,
        created_by:profiles!knowledge_pages_created_by_fkey(id, name)
      `)
      .eq("workspace_id", auth.workspaceId)
      .eq("is_archived", false)
      .order("position", { ascending: true })
      .range(offset, offset + limit - 1)

    if (parentId) {
      query = query.eq("parent_id", parentId)
    }
    // When no parent_id specified, return ALL pages (for dropdowns)

    const { data, error } = await query

    if (error) {
      console.error("Error fetching knowledge pages:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format for RPC dropdown (name = title)
    const formattedPages = (data || []).map((p: { title: string; [key: string]: unknown }) => ({
      ...p,
      name: p.title,
    }))

    return NextResponse.json({ data: formattedPages })
  } catch (error) {
    console.error("Error in knowledge pages GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/make/knowledge-pages
 *
 * Create a new knowledge page.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, icon, cover_image, content, parent_id, is_template } = body

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get the API key owner
    const { data: apiKey } = await supabase
      .from("workspace_api_keys")
      .select("created_by")
      .eq("id", auth.keyId)
      .single()

    // Get next position
    let positionQuery = supabase
      .from("knowledge_pages")
      .select("position")
      .eq("workspace_id", auth.workspaceId)
      .order("position", { ascending: false })
      .limit(1)

    if (parent_id) {
      positionQuery = positionQuery.eq("parent_id", parent_id)
    } else {
      positionQuery = positionQuery.is("parent_id", null)
    }

    const { data: lastPage } = await positionQuery.single()
    const nextPosition = (lastPage?.position || 0) + 1

    const { data, error } = await supabase
      .from("knowledge_pages")
      .insert({
        workspace_id: auth.workspaceId,
        title,
        icon: icon || null,
        cover_image: cover_image || null,
        content: content ? normalizeContent(content) : [],
        parent_id: parent_id || null,
        is_template: is_template || false,
        position: nextPosition,
        created_by: apiKey?.created_by || null,
        last_edited_by: apiKey?.created_by || null,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating knowledge page:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ...data, name: data.title }, { status: 201 })
  } catch (error) {
    console.error("Error in knowledge pages POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
