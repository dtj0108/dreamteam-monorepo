import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"

/**
 * GET /api/make/accounts
 *
 * List all financial accounts in the workspace.
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
    const type = searchParams.get("type")

    let query = supabase
      .from("accounts")
      .select("id, name, type, institution, balance, currency, last_four, is_active, created_at")
      .eq("workspace_id", auth.workspaceId)
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(limit)

    if (type) {
      query = query.eq("type", type)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching accounts:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Error in accounts GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/make/accounts
 *
 * Create a new financial account.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, type, institution, balance, currency, last_four } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    if (!type) {
      return NextResponse.json({ error: "Type is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get the API key owner
    const { data: apiKey } = await supabase
      .from("workspace_api_keys")
      .select("created_by")
      .eq("id", auth.keyId)
      .single()

    const { data, error } = await supabase
      .from("accounts")
      .insert({
        workspace_id: auth.workspaceId,
        user_id: apiKey?.created_by,
        name,
        type,
        institution,
        balance: balance || 0,
        currency: currency || "USD",
        last_four,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating account:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in accounts POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
