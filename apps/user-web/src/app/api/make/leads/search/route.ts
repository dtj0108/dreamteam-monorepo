import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"

/**
 * GET /api/make/leads/search
 *
 * Search leads by name, industry, or other fields.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || searchParams.get("query")
    const status = searchParams.get("status")
    const industry = searchParams.get("industry")
    const limit = parseInt(searchParams.get("limit") || "50")

    if (!query && !status && !industry) {
      return NextResponse.json(
        { error: "At least one search parameter (q, status, industry) is required" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    let dbQuery = supabase
      .from("leads")
      .select("id, name, website, industry, status, city, state, created_at")
      .eq("workspace_id", auth.workspaceId)
      .limit(limit)

    if (query) {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,website.ilike.%${query}%,industry.ilike.%${query}%`)
    }

    if (status) {
      dbQuery = dbQuery.eq("status", status)
    }

    if (industry) {
      dbQuery = dbQuery.ilike("industry", `%${industry}%`)
    }

    const { data, error } = await dbQuery.order("created_at", { ascending: false })

    if (error) {
      console.error("Error searching leads:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Error in leads search:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
