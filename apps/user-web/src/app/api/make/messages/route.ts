import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"
import { fireWebhooks } from "@/lib/make-webhooks"

/**
 * POST /api/make/messages
 *
 * Send a new message to a channel.
 * Fires message.created webhook on success.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { channel_id, content, sender_id } = body

    if (!channel_id) {
      return NextResponse.json({ error: "channel_id is required" }, { status: 400 })
    }

    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify the channel belongs to this workspace
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("id")
      .eq("id", channel_id)
      .eq("workspace_id", auth.workspaceId)
      .single()

    if (channelError || !channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 })
    }

    // Determine sender - use provided sender_id or API key owner
    let finalSenderId = sender_id

    if (!finalSenderId) {
      const { data: apiKey } = await supabase
        .from("workspace_api_keys")
        .select("created_by")
        .eq("id", auth.keyId)
        .single()

      finalSenderId = apiKey?.created_by
    }

    // Verify sender is a workspace member
    if (finalSenderId) {
      const { data: member } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", auth.workspaceId)
        .eq("profile_id", finalSenderId)
        .single()

      if (!member) {
        return NextResponse.json(
          { error: "Sender must be a workspace member" },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json({ error: "sender_id is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        workspace_id: auth.workspaceId,
        channel_id,
        sender_id: finalSenderId,
        content,
      })
      .select(`
        id, content, created_at,
        sender:profiles!messages_sender_id_fkey(id, name, avatar_url)
      `)
      .single()

    if (error) {
      console.error("Error creating message:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fire webhook
    await fireWebhooks("message.created", { ...data, channel_id }, auth.workspaceId)

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in messages POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
