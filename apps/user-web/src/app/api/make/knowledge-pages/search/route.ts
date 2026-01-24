import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"

/**
 * GET /api/make/knowledge-pages/search
 *
 * Search knowledge pages by title or content.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || searchParams.get("query")
    const limit = parseInt(searchParams.get("limit") || "50")

    if (!query) {
      return NextResponse.json({ error: "Search query (q) is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Search by title using ilike
    const { data, error } = await supabase
      .from("knowledge_pages")
      .select(`
        id, title, icon, parent_id, created_at, updated_at,
        created_by:profiles!knowledge_pages_created_by_fkey(id, name)
      `)
      .eq("workspace_id", auth.workspaceId)
      .eq("is_archived", false)
      .ilike("title", `%${query}%`)
      .order("updated_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error searching knowledge pages:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format for RPC dropdown (name = title)
    const formattedPages = (data || []).map((p: { title: string; [key: string]: unknown }) => ({
      ...p,
      name: p.title,
    }))

    return NextResponse.json({ data: formattedPages })
  } catch (error) {
    console.error("Error in knowledge pages search:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
