import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"
import type { FeatureFlagKey } from "@/types/team-settings"

const VALID_FEATURE_KEYS: FeatureFlagKey[] = [
  "ai_capabilities",
  "beta_features",
  "advanced_analytics",
  "api_access",
  "webhook_integrations",
]

// GET /api/team/feature-flags - Get all workspace feature flags
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 })
    }

    // Verify user is a member
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      )
    }

    // Get all feature flags
    const { data: flags, error } = await supabase
      .from("workspace_feature_flags")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("feature_key")

    if (error) {
      console.error("Error fetching feature flags:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If no flags exist, create defaults
    if (!flags || flags.length === 0) {
      const defaultFlags = VALID_FEATURE_KEYS.map((key) => ({
        workspace_id: workspaceId,
        feature_key: key,
        is_enabled: key === "ai_capabilities", // AI enabled by default
        config: {},
      }))

      const { data: inserted, error: insertError } = await supabase
        .from("workspace_feature_flags")
        .insert(defaultFlags)
        .select()

      if (insertError) {
        console.error("Error creating default feature flags:", insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      return NextResponse.json(inserted)
    }

    return NextResponse.json(flags)
  } catch (error) {
    console.error("Error in GET /api/team/feature-flags:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/team/feature-flags - Update a feature flag
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    const body = await request.json()
    const { workspaceId, feature_key, is_enabled, config } = body

    if (!workspaceId || !feature_key || is_enabled === undefined) {
      return NextResponse.json(
        { error: "workspaceId, feature_key, and is_enabled are required" },
        { status: 400 }
      )
    }

    if (!VALID_FEATURE_KEYS.includes(feature_key)) {
      return NextResponse.json({ error: "Invalid feature key" }, { status: 400 })
    }

    // Verify user is workspace owner
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single()

    if (wsError || !workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    if (workspace.owner_id !== session.id) {
      return NextResponse.json(
        { error: "Only workspace owner can modify feature flags" },
        { status: 403 }
      )
    }

    // Upsert the feature flag
    const updateData: Record<string, unknown> = {
      workspace_id: workspaceId,
      feature_key,
      is_enabled,
      updated_at: new Date().toISOString(),
    }

    if (config !== undefined) {
      updateData.config = config
    }

    const { data: updated, error } = await supabase
      .from("workspace_feature_flags")
      .upsert(updateData, { onConflict: "workspace_id,feature_key" })
      .select()
      .single()

    if (error) {
      console.error("Error updating feature flag:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error in PUT /api/team/feature-flags:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
