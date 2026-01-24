import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"

/**
 * GET /api/make/users
 *
 * List all users (workspace members) in the workspace.
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

    const { data, error } = await supabase
      .from("workspace_members")
      .select(`
        id,
        role,
        display_name,
        status,
        joined_at,
        profile:profiles(id, name, email, avatar_url, phone)
      `)
      .eq("workspace_id", auth.workspaceId)
      .limit(limit)

    if (error) {
      console.error("Error fetching users:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format for RPC dropdown (id = profile.id, name = profile.name or display_name)
    const formattedUsers = (data || []).map((m: { id: string; role: string; display_name: string | null; status: string; joined_at: string; profile: unknown }) => {
      const profile = m.profile as { id: string; name: string; email: string; avatar_url: string; phone: string } | null
      return {
        id: profile?.id || m.id,
        name: m.display_name || profile?.name || "Unknown",
        email: profile?.email,
        avatar_url: profile?.avatar_url,
        phone: profile?.phone,
        role: m.role,
        status: m.status,
        joined_at: m.joined_at,
      }
    })

    return NextResponse.json({ data: formattedUsers })
  } catch (error) {
    console.error("Error in users GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
