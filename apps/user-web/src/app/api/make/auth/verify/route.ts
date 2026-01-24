import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"

/**
 * GET /api/make/auth/verify
 *
 * Verifies the API key and returns workspace information.
 * Used by Make.com to verify the connection is valid.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get workspace details
    const { data: workspace, error } = await supabase
      .from("workspaces")
      .select("id, name, slug")
      .eq("id", auth.workspaceId)
      .single()

    if (error || !workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    // Return format Make.com expects for connection verification
    return NextResponse.json({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      keyName: auth.keyName,
    })
  } catch (error) {
    console.error("Error in auth verify:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
