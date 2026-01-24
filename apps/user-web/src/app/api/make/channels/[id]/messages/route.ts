import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"

/**
 * GET /api/make/channels/[id]/messages
 *
 * List messages in a channel.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const before = searchParams.get("before")

    // First verify the channel belongs to this workspace
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("id")
      .eq("id", id)
      .eq("workspace_id", auth.workspaceId)
      .single()

    if (channelError || !channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 })
    }

    let query = supabase
      .from("messages")
      .select(`
        id, content, is_edited, created_at,
        sender:profiles!messages_sender_id_fkey(id, name, avatar_url),
        message_reactions(id, emoji, profile_id)
      `)
      .eq("channel_id", id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt("created_at", before)
    }

    const { data: messages, error } = await query

    if (error) {
      console.error("Error fetching messages:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Reverse to get chronological order
    const reversedMessages = (messages || []).reverse()

    return NextResponse.json({
      data: reversedMessages,
      hasMore: messages?.length === limit,
    })
  } catch (error) {
    console.error("Error in channel messages GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
