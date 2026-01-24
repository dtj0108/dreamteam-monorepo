import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"

/**
 * GET /api/make/users/me
 *
 * Get information about the current API key owner / authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get the API key owner
    const { data: apiKey, error: apiKeyError } = await supabase
      .from("workspace_api_keys")
      .select("created_by, name")
      .eq("id", auth.keyId)
      .single()

    if (apiKeyError || !apiKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 })
    }

    // Get the profile of the API key creator
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, email, avatar_url, phone")
      .eq("id", apiKey.created_by)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get workspace info
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id, name, slug")
      .eq("id", auth.workspaceId)
      .single()

    return NextResponse.json({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar_url: profile.avatar_url,
      phone: profile.phone,
      workspace: workspace,
      api_key_name: apiKey.name,
    })
  } catch (error) {
    console.error("Error in users/me GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
