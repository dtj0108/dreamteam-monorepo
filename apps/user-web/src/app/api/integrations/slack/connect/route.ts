import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { encryptCRMToken } from "@/lib/crm-encryption"
import { SlackClient } from "@/lib/slack-client"

// POST /api/integrations/slack/connect - Connect Slack workspace with bot token
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { workspaceId, token } = body

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 })
  }

  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 })
  }

  // Validate token format
  if (!token.startsWith("xoxb-") && !token.startsWith("xoxp-")) {
    return NextResponse.json(
      { error: "Invalid token format. Token should start with xoxb- or xoxp-" },
      { status: 400 }
    )
  }

  // Verify user is an admin or owner of the workspace
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
      { error: "Only admins can connect integrations" },
      { status: 403 }
    )
  }

  // Validate the token by calling Slack API
  let slackTeamId: string
  let slackTeamName: string
  try {
    const client = new SlackClient(token)
    const result = await client.validateToken()
    slackTeamId = result.teamId
    slackTeamName = result.teamName
  } catch (error) {
    console.error("Slack token validation failed:", error)
    return NextResponse.json(
      { error: "Invalid Slack token. Please check your token and try again." },
      { status: 400 }
    )
  }

  // Encrypt the token
  let encryptedToken: string
  try {
    encryptedToken = encryptCRMToken(token)
  } catch (error) {
    console.error("Token encryption failed:", error)
    return NextResponse.json({ error: "Failed to secure token" }, { status: 500 })
  }

  // Check if integration already exists
  const { data: existingIntegration } = await supabase
    .from("slack_integrations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .single()

  if (existingIntegration) {
    // Update existing integration
    const { error: updateError } = await supabase
      .from("slack_integrations")
      .update({
        encrypted_access_token: encryptedToken,
        slack_team_id: slackTeamId,
        slack_team_name: slackTeamName,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingIntegration.id)

    if (updateError) {
      console.error("Failed to update Slack integration:", updateError)
      return NextResponse.json({ error: "Failed to update integration" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      slackTeamName,
      updated: true,
    })
  }

  // Create new integration
  const { error: insertError } = await supabase.from("slack_integrations").insert({
    workspace_id: workspaceId,
    user_id: user.id,
    encrypted_access_token: encryptedToken,
    slack_team_id: slackTeamId,
    slack_team_name: slackTeamName,
    status: "active",
  })

  if (insertError) {
    console.error("Failed to create Slack integration:", insertError)
    return NextResponse.json({ error: "Failed to save integration" }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    slackTeamName,
    updated: false,
  })
}
