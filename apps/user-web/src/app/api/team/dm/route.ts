import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// GET /api/team/dm - Get all DM conversations for the current user
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

    // Get all DM conversations where the current user is a participant
    // Include is_agent flag to identify agent DMs and last_read_at for unread counting
    const { data: conversations, error } = await supabase
      .from("dm_participants")
      .select(`
        last_read_at,
        dm_conversation:conversation_id(
          id,
          workspace_id,
          created_at,
          dm_participants(
            profile:profile_id(id, name, email, avatar_url, is_agent, linked_agent_id)
          )
        )
      `)
      .eq("profile_id", session.id)

    if (error) {
      console.error("Error fetching DM conversations:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter by workspace and format response with unread counts
    const conversationsWithLastRead = conversations
      ?.map((c: any) => ({
        ...c.dm_conversation,
        last_read_at: c.last_read_at,
      }))
      .filter((c: any) => c && c.workspace_id === workspaceId) || []

    // Get conversation IDs for unread count query
    const conversationIds = conversationsWithLastRead.map((c: any) => c.id)

    // Fetch unread counts for all conversations in one query
    // Count messages where: created_at > last_read_at AND sender_id != current user
    let unreadCounts: Record<string, number> = {}
    if (conversationIds.length > 0) {
      const { data: messages } = await supabase
        .from("messages")
        .select("dm_conversation_id, sender_id, created_at")
        .in("dm_conversation_id", conversationIds)
        .neq("sender_id", session.id)
        .eq("is_deleted", false)

      // Build unread counts per conversation
      for (const conv of conversationsWithLastRead) {
        const lastReadAt = conv.last_read_at ? new Date(conv.last_read_at) : new Date(0)
        const convMessages = messages?.filter(
          (m: any) =>
            m.dm_conversation_id === conv.id &&
            new Date(m.created_at) > lastReadAt
        )
        unreadCounts[conv.id] = convMessages?.length || 0
      }
    }

    // Format final response
    const filteredConversations = conversationsWithLastRead.map((conv: any) => {
      // Get the other participant(s)
      const otherParticipants = conv.dm_participants
        ?.filter((p: { profile: { id: string } }) => p.profile?.id !== session.id)
        .map((p: { profile: { id: string; name: string; email: string; avatar_url: string | null; is_agent?: boolean; linked_agent_id?: string | null } }) => p.profile)

      // Remove internal fields, add unread count
      const { last_read_at, ...convWithoutInternal } = conv
      return {
        ...convWithoutInternal,
        otherParticipants,
        unread_count: unreadCounts[conv.id] || 0,
      }
    })

    return NextResponse.json(filteredConversations)
  } catch (error) {
    console.error("Error in GET /api/team/dm:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/team/dm - Start a new DM conversation with a team member or agent
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const { workspaceId, participantId } = body

    if (!workspaceId || !participantId) {
      return NextResponse.json(
        { error: "workspaceId and participantId required" },
        { status: 400 }
      )
    }

    // Check if participant is an agent profile
    const { data: participantProfile } = await supabase
      .from("profiles")
      .select("id, is_agent")
      .eq("id", participantId)
      .single()

    const isAgentDM = participantProfile?.is_agent === true

    // Skip self-check for agents (you can DM an agent even if it has your session ID somehow)
    if (!isAgentDM && String(participantId) === String(session.id)) {
      console.error("DM self-check failed:", {
        participantId,
        participantIdType: typeof participantId,
        sessionId: session.id,
        sessionIdType: typeof session.id
      })
      return NextResponse.json(
        { error: "Cannot start a DM with yourself" },
        { status: 400 }
      )
    }

    // Verify both users are members of the workspace
    const { data: members, error: memberError } = await supabase
      .from("workspace_members")
      .select("profile_id")
      .eq("workspace_id", workspaceId)
      .in("profile_id", [session.id, participantId])

    if (memberError) {
      console.error("Error verifying workspace membership:", memberError)
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }

    if (!members || members.length !== 2) {
      return NextResponse.json(
        { error: "Both users must be members of the workspace" },
        { status: 400 }
      )
    }

    // Check if a DM conversation already exists between these two users
    const { data: existingConvos } = await supabase
      .from("dm_participants")
      .select(`
        conversation_id,
        dm_conversation:conversation_id(workspace_id)
      `)
      .eq("profile_id", session.id)

    // Find if any of these conversations include the other participant
    for (const convo of existingConvos || []) {
      if (convo.dm_conversation?.workspace_id !== workspaceId) continue
      
      const { data: otherParticipant } = await supabase
        .from("dm_participants")
        .select("profile_id")
        .eq("conversation_id", convo.conversation_id)
        .eq("profile_id", participantId)
        .single()

      if (otherParticipant) {
        // DM already exists, return it
        const { data: existingDm } = await supabase
          .from("dm_conversations")
          .select(`
            id,
            workspace_id,
            created_at,
            dm_participants(
              profile:profile_id(id, name, email, avatar_url, is_agent, linked_agent_id)
            )
          `)
          .eq("id", convo.conversation_id)
          .single()

        if (existingDm) {
          const otherParticipants = existingDm.dm_participants
            ?.filter((p: { profile: { id: string } }) => p.profile?.id !== session.id)
            .map((p: { profile: { id: string; name: string; email: string; avatar_url: string | null; is_agent?: boolean; linked_agent_id?: string | null } }) => p.profile)
          return NextResponse.json({
            ...existingDm,
            otherParticipants,
            isExisting: true,
          })
        }
      }
    }

    // Create new DM conversation
    const { data: newConversation, error: createError } = await supabase
      .from("dm_conversations")
      .insert({ workspace_id: workspaceId })
      .select()
      .single()

    if (createError) {
      console.error("Error creating DM conversation:", createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // Add both participants
    const { error: participantsError } = await supabase
      .from("dm_participants")
      .insert([
        { conversation_id: newConversation.id, profile_id: session.id },
        { conversation_id: newConversation.id, profile_id: participantId },
      ])

    if (participantsError) {
      console.error("Error adding DM participants:", participantsError)
      // Cleanup the conversation
      await supabase.from("dm_conversations").delete().eq("id", newConversation.id)
      return NextResponse.json({ error: participantsError.message }, { status: 500 })
    }

    // Fetch the complete conversation with participant info
    const { data: fullConversation } = await supabase
      .from("dm_conversations")
      .select(`
        id,
        workspace_id,
        created_at,
        dm_participants(
          profile:profile_id(id, name, email, avatar_url, is_agent, linked_agent_id)
        )
      `)
      .eq("id", newConversation.id)
      .single()

    if (fullConversation) {
      const otherParticipants = fullConversation.dm_participants
        ?.filter((p: { profile: { id: string } }) => p.profile?.id !== session.id)
        .map((p: { profile: { id: string; name: string; email: string; avatar_url: string | null; is_agent?: boolean; linked_agent_id?: string | null } }) => p.profile)
      return NextResponse.json({
        ...fullConversation,
        otherParticipants,
        isExisting: false,
      }, { status: 201 })
    }

    return NextResponse.json(newConversation, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/team/dm:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

