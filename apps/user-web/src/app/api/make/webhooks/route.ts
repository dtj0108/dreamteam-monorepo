import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"

/**
 * GET /api/make/webhooks
 *
 * List all webhook subscriptions for the workspace.
 * Useful for debugging and cleaning up stale webhooks.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("make_webhooks")
      .select("id, event, url, is_active, created_at")
      .eq("workspace_id", auth.workspaceId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching webhooks:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Error in webhooks GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE /api/make/webhooks
 *
 * Delete all webhook subscriptions for a specific event (bulk cleanup).
 * Use query param: ?event=transaction.created
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const event = searchParams.get("event")

    const supabase = createAdminClient()

    let query = supabase
      .from("make_webhooks")
      .delete()
      .eq("workspace_id", auth.workspaceId)

    if (event) {
      query = query.eq("event", event)
    }

    const { error } = await query

    if (error) {
      console.error("Error deleting webhooks:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in webhooks DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
