import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"
import { sendPushToUser, sendPushToUsers, extractMentions, type PushNotificationPayload } from "@/lib/push-notifications"

// Type for message attachment from database
interface MessageAttachment {
  id: string
  file_name: string
  file_type: string
  file_size: number
  file_url: string
  storage_path: string
}

// Type for message from database query
interface MessageWithRelations {
  id: string
  content: string
  created_at: string
  sender: { id: string; name: string; avatar_url: string | null } | null
  reactions: { id: string; emoji: string; profile_id: string }[] | null
  attachments: MessageAttachment[] | null
  [key: string]: unknown // Allow other properties from the database
}

// GET /api/team/messages - Get messages for a channel or DM
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get("channelId")
    const dmConversationId = searchParams.get("dmConversationId")
    const parentId = searchParams.get("parentId") // For thread replies
    const limit = parseInt(searchParams.get("limit") || "50")
    const before = searchParams.get("before") // Cursor for pagination

    if (!channelId && !dmConversationId) {
      return NextResponse.json(
        { error: "channelId or dmConversationId required" },
        { status: 400 }
      )
    }

    let query = supabase
      .from("messages")
      .select(`
        *,
        sender:sender_id(id, name, avatar_url),
        reactions:message_reactions(id, emoji, profile_id),
        attachments:message_attachments(id, file_name, file_type, file_size, file_url, storage_path)
      `)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (channelId) {
      query = query.eq("channel_id", channelId)
    } else if (dmConversationId) {
      query = query.eq("dm_conversation_id", dmConversationId)
    }

    // Filter by parent for thread replies, or get top-level messages
    if (parentId) {
      query = query.eq("parent_id", parentId)
    } else {
      query = query.is("parent_id", null)
    }

    // Pagination cursor
    if (before) {
      query = query.lt("created_at", before)
    }

    const { data: messages, error } = await query

    if (error) {
      console.error("Error fetching messages:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Generate fresh signed URLs for attachments (private bucket requires signed URLs)
    const messagesWithFreshUrls = await Promise.all(
      ((messages || []) as MessageWithRelations[]).map(async (message) => {
        if (!message.attachments || message.attachments.length === 0) {
          return message
        }

        // Generate signed URLs for each attachment
        const attachmentsWithUrls = await Promise.all(
          message.attachments.map(async (att: MessageAttachment) => {
            if (!att.storage_path) {
              return att // No storage path, keep original URL
            }

            const { data: signedData } = await supabase.storage
              .from("workspace-files")
              .createSignedUrl(att.storage_path, 3600)

            return {
              ...att,
              file_url: signedData?.signedUrl || att.file_url,
            }
          })
        )

        return {
          ...message,
          attachments: attachmentsWithUrls,
        }
      })
    )

    // Reverse to show oldest first in UI
    const reversedMessages = messagesWithFreshUrls.reverse()

    return NextResponse.json({
      messages: reversedMessages,
      hasMore: messages?.length === limit,
    })
  } catch (error) {
    console.error("Error in GET /api/team/messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Attachment interface for request body
interface AttachmentInput {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  fileUrl: string
  storagePath: string
}

// POST /api/team/messages - Send a new message
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const { workspaceId, channelId, dmConversationId, parentId, content, attachments } = body as {
      workspaceId: string
      channelId?: string
      dmConversationId?: string
      parentId?: string
      content: string
      attachments?: AttachmentInput[]
    }

    // Content is only required if no attachments
    const hasAttachments = attachments && attachments.length > 0
    if (!workspaceId || (!content && !hasAttachments)) {
      return NextResponse.json(
        { error: "workspaceId and content (or attachments) required" },
        { status: 400 }
      )
    }

    if (!channelId && !dmConversationId) {
      return NextResponse.json(
        { error: "channelId or dmConversationId required" },
        { status: 400 }
      )
    }

    // Verify membership in workspace
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      )
    }

    // Create the message
    const { data: message, error: insertError } = await supabase
      .from("messages")
      .insert({
        workspace_id: workspaceId,
        channel_id: channelId || null,
        dm_conversation_id: dmConversationId || null,
        parent_id: parentId || null,
        sender_id: session.id,
        content: content?.trim() || "",
      })
      .select(`
        *,
        sender:sender_id(id, name, avatar_url)
      `)
      .single()

    if (insertError) {
      console.error("Error creating message:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Insert attachments if provided
    let messageAttachments: any[] = []
    if (hasAttachments && message) {
      const attachmentRecords = attachments.map((att) => ({
        message_id: message.id,
        file_name: att.fileName,
        file_type: att.fileType,
        file_size: att.fileSize,
        file_url: att.fileUrl,
        storage_path: att.storagePath,
        uploaded_by: session.id,
      }))

      const { data: insertedAttachments, error: attachError } = await supabase
        .from("message_attachments")
        .insert(attachmentRecords)
        .select("id, file_name, file_type, file_size, file_url, storage_path")

      if (attachError) {
        console.error("Error inserting attachments:", attachError)
        // Don't fail the whole request, just log the error
      } else {
        messageAttachments = insertedAttachments || []
      }

      // Also update the workspace_files to link them to this message
      if (attachments.length > 0) {
        const fileIds = attachments.map((att) => att.id)
        await supabase
          .from("workspace_files")
          .update({
            source_message_id: message.id,
            source_channel_id: channelId || null,
            source_dm_conversation_id: dmConversationId || null,
          })
          .in("id", fileIds)
      }
    }

    // Send push notifications asynchronously (don't await to avoid slowing response)
    sendMessagePushNotifications(
      supabase,
      session.id,
      message,
      channelId,
      dmConversationId,
      content
    ).catch((err) => console.error("Error sending push notifications:", err))

    return NextResponse.json(
      {
        ...message,
        attachments: messageAttachments,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error in POST /api/team/messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * Send push notifications for a new message
 * Handles channel messages, DMs, and @mentions
 */
async function sendMessagePushNotifications(
  supabase: ReturnType<typeof createAdminClient>,
  senderId: string,
  message: { id: string; sender?: { id: string; name: string; avatar_url: string | null } | null },
  channelId?: string,
  dmConversationId?: string,
  content?: string
) {
  const senderName = message.sender?.name || "Someone"
  const messagePreview = content?.slice(0, 100) || "Sent an attachment"

  // Extract mentions from content
  const mentionedUserIds = content ? extractMentions(content) : []

  if (channelId) {
    // Channel message - notify all channel members except sender
    const { data: channel } = await supabase
      .from("channels")
      .select("name")
      .eq("id", channelId)
      .single()

    const { data: members } = await supabase
      .from("channel_members")
      .select("profile_id")
      .eq("channel_id", channelId)
      .neq("profile_id", senderId)

    if (members && members.length > 0) {
      const recipientIds = members.map((m: { profile_id: string }) => m.profile_id)

      // Send mention notifications to mentioned users
      if (mentionedUserIds.length > 0) {
        const mentionedRecipients = recipientIds.filter((id: string) => mentionedUserIds.includes(id))
        if (mentionedRecipients.length > 0) {
          const mentionPayload: PushNotificationPayload = {
            title: `${senderName} mentioned you in #${channel?.name || "channel"}`,
            body: messagePreview,
            data: {
              type: "mention",
              channelId,
              messageId: message.id,
            },
          }
          await sendPushToUsers(mentionedRecipients, mentionPayload)
        }

        // Send regular notifications to non-mentioned users
        const nonMentionedRecipients = recipientIds.filter((id: string) => !mentionedUserIds.includes(id))
        if (nonMentionedRecipients.length > 0) {
          const messagePayload: PushNotificationPayload = {
            title: `New message in #${channel?.name || "channel"}`,
            body: `${senderName}: ${messagePreview}`,
            data: {
              type: "message",
              channelId,
              messageId: message.id,
            },
          }
          await sendPushToUsers(nonMentionedRecipients, messagePayload)
        }
      } else {
        // No mentions - send regular notification to all
        const messagePayload: PushNotificationPayload = {
          title: `New message in #${channel?.name || "channel"}`,
          body: `${senderName}: ${messagePreview}`,
          data: {
            type: "message",
            channelId,
            messageId: message.id,
          },
        }
        await sendPushToUsers(recipientIds, messagePayload)
      }
    }
  } else if (dmConversationId) {
    // DM - notify the other participant
    const { data: participants } = await supabase
      .from("dm_participants")
      .select("profile_id")
      .eq("dm_conversation_id", dmConversationId)
      .neq("profile_id", senderId)

    if (participants && participants.length > 0) {
      const recipientId = participants[0].profile_id

      // Check if recipient is mentioned (for emphasis)
      const isMentioned = mentionedUserIds.includes(recipientId)

      const dmPayload: PushNotificationPayload = {
        title: isMentioned ? `${senderName} mentioned you` : senderName,
        body: messagePreview,
        data: {
          type: isMentioned ? "mention" : "dm",
          dmId: dmConversationId,
          messageId: message.id,
        },
      }
      await sendPushToUser(recipientId, dmPayload)
    }
  }
}
