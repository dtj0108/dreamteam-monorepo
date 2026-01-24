import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// GET /api/integrations/slack - Get Slack integration status for a workspace
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get("workspaceId")

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify user is a member of the workspace
  const { data: membership, error: memberError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("profile_id", user.id)
    .single()

  if (memberError || !membership) {
    return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 })
  }

  // Get the integration
  const { data: integration, error: integrationError } = await supabase
    .from("slack_integrations")
    .select("id, slack_team_id, slack_team_name, status, last_sync_at, created_at")
    .eq("workspace_id", workspaceId)
    .single()

  if (integrationError && integrationError.code !== "PGRST116") {
    console.error("Failed to fetch Slack integration:", integrationError)
    return NextResponse.json({ error: "Failed to fetch integration" }, { status: 500 })
  }

  if (!integration) {
    return NextResponse.json({ connected: false })
  }

  return NextResponse.json({
    connected: true,
    id: integration.id,
    slackTeamId: integration.slack_team_id,
    slackTeamName: integration.slack_team_name,
    status: integration.status,
    lastSyncAt: integration.last_sync_at,
    createdAt: integration.created_at,
  })
}

// DELETE /api/integrations/slack - Disconnect Slack integration
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient()

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get("workspaceId")

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify user is an admin or owner
  const { data: membership, error: memberError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("profile_id", user.id)
    .single()

  if (memberError || !membership) {
    return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 })
  }

  if (!["owner", "admin"].includes(membership.role)) {
    return NextResponse.json(
      { error: "Only admins can disconnect integrations" },
      { status: 403 }
    )
  }

  // Delete the integration
  const { error: deleteError } = await supabase
    .from("slack_integrations")
    .delete()
    .eq("workspace_id", workspaceId)

  if (deleteError) {
    console.error("Failed to delete Slack integration:", deleteError)
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
