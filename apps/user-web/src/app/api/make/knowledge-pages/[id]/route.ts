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
 * GET /api/make/knowledge-pages/[id]
 *
 * Get a single knowledge page by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("knowledge_pages")
      .select(`
        *,
        created_by:profiles!knowledge_pages_created_by_fkey(id, name, avatar_url),
        last_edited_by:profiles!knowledge_pages_last_edited_by_fkey(id, name, avatar_url)
      `)
      .eq("id", id)
      .eq("workspace_id", auth.workspaceId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Knowledge page not found" }, { status: 404 })
      }
      console.error("Error fetching knowledge page:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ...data, name: data.title })
  } catch (error) {
    console.error("Error in knowledge page GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PUT /api/make/knowledge-pages/[id]
 *
 * Update a knowledge page.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const supabase = createAdminClient()

    // Get the API key owner for last_edited_by
    const { data: apiKey } = await supabase
      .from("workspace_api_keys")
      .select("created_by")
      .eq("id", auth.keyId)
      .single()

    // Build update object with allowed fields
    const allowedFields = [
      "title",
      "icon",
      "cover_image",
      "content",
      "parent_id",
      "is_template",
      "is_archived",
      "position",
    ]

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      last_edited_by: apiKey?.created_by || null,
    }

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "content") {
          updates[field] = normalizeContent(body[field])
        } else {
          updates[field] = body[field]
        }
      }
    }

    const { data, error } = await supabase
      .from("knowledge_pages")
      .update(updates)
      .eq("id", id)
      .eq("workspace_id", auth.workspaceId)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Knowledge page not found" }, { status: 404 })
      }
      console.error("Error updating knowledge page:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ...data, name: data.title })
  } catch (error) {
    console.error("Error in knowledge page PUT:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE /api/make/knowledge-pages/[id]
 *
 * Delete a knowledge page.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    const { error } = await supabase
      .from("knowledge_pages")
      .delete()
      .eq("id", id)
      .eq("workspace_id", auth.workspaceId)

    if (error) {
      console.error("Error deleting knowledge page:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in knowledge page DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
