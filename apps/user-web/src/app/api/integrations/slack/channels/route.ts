import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { decryptCRMToken } from "@/lib/crm-encryption"
import { SlackClient } from "@/lib/slack-client"

// GET /api/integrations/slack/channels - Get list of Slack channels
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
    .select("encrypted_access_token, status")
    .eq("workspace_id", workspaceId)
    .single()

  if (integrationError || !integration) {
    return NextResponse.json({ error: "Slack not connected" }, { status: 404 })
  }

  if (integration.status !== "active") {
    return NextResponse.json({ error: "Slack integration is not active" }, { status: 400 })
  }

  // Decrypt the token
  let token: string
  try {
    token = decryptCRMToken(integration.encrypted_access_token)
  } catch {
    return NextResponse.json({ error: "Failed to decrypt token" }, { status: 500 })
  }

  // Fetch channels from Slack
  try {
    const client = new SlackClient(token)
    const channels = await client.getChannels()

    // Separate public and private channels
    // Include is_member field so UI knows which channels bot can access
    const publicChannels = channels
      .filter((c) => !c.is_private && !c.is_archived)
      .map((c) => ({
        id: c.id,
        name: c.name,
        isPrivate: false,
        isArchived: c.is_archived,
        description: c.topic?.value || c.purpose?.value || "",
        memberCount: c.num_members,
        isMember: c.is_member, // Bot is already in this channel
      }))

    const privateChannels = channels
      .filter((c) => c.is_private && !c.is_archived)
      .map((c) => ({
        id: c.id,
        name: c.name,
        isPrivate: true,
        isArchived: c.is_archived,
        description: c.topic?.value || c.purpose?.value || "",
        memberCount: c.num_members,
        isMember: c.is_member, // Bot is already in this channel
      }))

    // Also include archived channels separately if user wants them
    const archivedChannels = channels
      .filter((c) => c.is_archived)
      .map((c) => ({
        id: c.id,
        name: c.name,
        isPrivate: c.is_private,
        isArchived: true,
        description: c.topic?.value || c.purpose?.value || "",
        memberCount: c.num_members,
        isMember: c.is_member,
      }))

    // Count channels where bot needs to be invited (private channels where bot is not a member)
    const privateChannelsNeedingInvite = privateChannels.filter((c) => !c.isMember).length

    return NextResponse.json({
      publicChannels,
      privateChannels,
      archivedChannels,
      totalChannels: channels.length,
      privateChannelsNeedingInvite, // Number of private channels bot can't access
    })
  } catch (error) {
    console.error("Failed to fetch Slack channels:", error)
    return NextResponse.json(
      { error: "Failed to fetch channels from Slack" },
      { status: 500 }
    )
  }
}
